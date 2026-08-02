import { useCallback, useMemo, useState } from 'react';
import { deriveLibraryItems, getLatestTodayEntry, sortEntriesNewestFirst, validateDraft } from './emotionEngine';
import { createIndexedDbEmotionMediaStore, type EmotionMediaStore } from './emotionMediaStore';
import { getBrowserEmotionStorage, type EmotionStorage } from './emotionStorage';
import type { EmotionAttachment, EmotionAttachmentInput, EmotionDraft, EmotionEntry, EmotionStateV1 } from './types';

interface UseEmotionSystemOptions {
  storage?: EmotionStorage;
  mediaStore?: EmotionMediaStore;
  now?: () => string;
  idFactory?: () => string;
}

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function errorMessage(prefix: string, error: unknown) {
  const detail = error instanceof Error ? error.message : '未知原因';
  return `${prefix}：${detail}`;
}

export function useEmotionSystem(options: UseEmotionSystemOptions = {}) {
  const storage = useMemo(() => options.storage ?? getBrowserEmotionStorage(), [options.storage]);
  const mediaStore = useMemo(() => options.mediaStore ?? createIndexedDbEmotionMediaStore(), [options.mediaStore]);
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? createId;
  const [state, setState] = useState<EmotionStateV1>(() => storage.load());
  const [error, setError] = useState('');

  const commit = useCallback((next: EmotionStateV1) => {
    storage.save(next);
    setState(next);
  }, [storage]);

  const createEntry = useCallback(async (draft: EmotionDraft, inputs: EmotionAttachmentInput[] = []) => {
    setError('');
    const entryId = idFactory();
    const pending = inputs.map((input): { metadata: EmotionAttachment; blob: Blob } => ({
      metadata: {
        id: idFactory(),
        kind: input.kind,
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.blob.size,
        durationMs: input.durationMs ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        isFavorite: false
      },
      blob: input.blob
    }));
    const checked = validateDraft({ ...draft, attachments: [...draft.attachments, ...pending.map((item) => item.metadata)] });
    if (!checked.valid) {
      setError(checked.errors[0]);
      return null;
    }

    const writtenIds: string[] = [];
    try {
      for (const item of pending) {
        await mediaStore.put(item.metadata.id, item.blob);
        writtenIds.push(item.metadata.id);
      }
      const timestamp = now();
      const created: EmotionEntry = {
        ...checked.normalized,
        id: entryId,
        createdAt: timestamp,
        updatedAt: timestamp,
        isFavorite: false
      };
      commit({ schemaVersion: 1, entries: [created, ...state.entries] });
      return created.id;
    } catch (caught) {
      if (writtenIds.length) {
        try { await mediaStore.removeMany(writtenIds); } catch { /* preserve the primary error */ }
      }
      setError(errorMessage('保存失败', caught));
      return null;
    }
  }, [commit, idFactory, mediaStore, now, state.entries]);

  const updateEntry = useCallback(async (
    entryId: string,
    draft: EmotionDraft,
    inputs: EmotionAttachmentInput[] = []
  ) => {
    const existing = state.entries.find((entry) => entry.id === entryId);
    if (!existing) return false;
    setError('');
    const pending = inputs.map((input): { metadata: EmotionAttachment; blob: Blob } => ({
      metadata: {
        id: idFactory(), kind: input.kind, fileName: input.fileName, mimeType: input.mimeType,
        size: input.blob.size, durationMs: input.durationMs ?? null, width: input.width ?? null,
        height: input.height ?? null, isFavorite: false
      },
      blob: input.blob
    }));
    const checked = validateDraft({ ...draft, attachments: [...draft.attachments, ...pending.map((item) => item.metadata)] });
    if (!checked.valid) { setError(checked.errors[0]); return false; }
    const writtenIds: string[] = [];
    let removedIds: string[] = [];
    try {
      for (const item of pending) {
        await mediaStore.put(item.metadata.id, item.blob);
        writtenIds.push(item.metadata.id);
      }
      const nextEntry: EmotionEntry = { ...existing, ...checked.normalized, updatedAt: now() };
      commit({ schemaVersion: 1, entries: state.entries.map((item) => item.id === entryId ? nextEntry : item) });
      const retained = new Set(nextEntry.attachments.map((item) => item.id));
      removedIds = existing.attachments.filter((item) => !retained.has(item.id)).map((item) => item.id);
    } catch (caught) {
      if (writtenIds.length) {
        try { await mediaStore.removeMany(writtenIds); } catch { /* preserve the primary error */ }
      }
      setError(errorMessage('更新失败', caught));
      return false;
    }
    if (removedIds.length) {
      try { await mediaStore.removeMany(removedIds); }
      catch (caught) { setError(errorMessage('旧媒体清理失败', caught)); }
    }
    return true;
  }, [commit, idFactory, mediaStore, now, state.entries]);

  const removeEntry = useCallback(async (entryId: string) => {
    const entry = state.entries.find((item) => item.id === entryId);
    if (!entry) return false;
    setError('');
    try {
      commit({ schemaVersion: 1, entries: state.entries.filter((item) => item.id !== entryId) });
    } catch (caught) {
      setError(errorMessage('删除失败', caught));
      return false;
    }
    try {
      await mediaStore.removeMany(entry.attachments.map((item) => item.id));
    } catch (caught) {
      setError(errorMessage('媒体清理失败，可稍后重试', caught));
    }
    return true;
  }, [commit, mediaStore, state.entries]);

  const toggleEntryFavorite = useCallback((entryId: string) => {
    const entries = state.entries.map((entry) => entry.id === entryId
      ? { ...entry, isFavorite: !entry.isFavorite, updatedAt: now() }
      : entry);
    try { commit({ schemaVersion: 1, entries }); } catch (caught) { setError(errorMessage('收藏失败', caught)); }
  }, [commit, now, state.entries]);

  const toggleAttachmentFavorite = useCallback((entryId: string, attachmentId: string) => {
    const entries = state.entries.map((entry) => entry.id === entryId ? {
      ...entry,
      attachments: entry.attachments.map((item) => item.id === attachmentId ? { ...item, isFavorite: !item.isFavorite } : item),
      updatedAt: now()
    } : entry);
    try { commit({ schemaVersion: 1, entries }); } catch (caught) { setError(errorMessage('收藏失败', caught)); }
  }, [commit, now, state.entries]);

  const entries = useMemo(() => sortEntriesNewestFirst(state.entries), [state.entries]);
  const latestTodayEntry = useMemo(() => getLatestTodayEntry(entries), [entries]);
  const libraryItems = useMemo(() => deriveLibraryItems(entries), [entries]);

  return {
    entries,
    latestTodayEntry,
    libraryItems,
    createEntry,
    updateEntry,
    removeEntry,
    toggleEntryFavorite,
    toggleAttachmentFavorite,
    getAttachmentBlob: mediaStore.get.bind(mediaStore),
    error,
    clearError: () => setError('')
  };
}
