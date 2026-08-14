import { moodById } from './emotionConfig';
import type { EmotionEntry, EmotionImportantDay, EmotionMusicReference, EmotionStateV1, EmotionStateV2 } from './types';
import { isValidDateKey } from './emotionSafety';

export const EMOTION_STORAGE_KEY = 'dice-life.emotion.v1';
export const EMOTION_CORRUPT_PREFIX = 'dice-life.emotion.corrupt';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface EmotionStorage {
  load(): EmotionStateV2;
  save(state: EmotionStateV2): void;
}

function isMusic(value: unknown): value is EmotionMusicReference {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' &&
    (item.provider === 'netease' || item.provider === 'qq' || item.provider === 'other') &&
    typeof item.title === 'string' && typeof item.artist === 'string' &&
    (item.coverUrl === undefined || typeof item.coverUrl === 'string') &&
    typeof item.sourceUrl === 'string' && typeof item.playbackUrl === 'string' &&
    typeof item.isFavorite === 'boolean';
}

function isImportantDay(value: unknown): value is EmotionImportantDay {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string' &&
    isValidDateKey(String(item.dateKey)) && typeof item.note === 'string' &&
    (item.remindDaysBefore === 0 || item.remindDaysBefore === 1 || item.remindDaysBefore === 3 || item.remindDaysBefore === 7 || item.remindDaysBefore === 30) &&
    (item.repeat === 'none' || item.repeat === 'yearly') &&
    typeof item.createdAt === 'string' && typeof item.updatedAt === 'string';
}

function isAttachment(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' &&
    (item.kind === 'image' || item.kind === 'video' || item.kind === 'audio') &&
    typeof item.mimeType === 'string' && typeof item.size === 'number';
}

function isEntry(value: unknown): value is EmotionEntry {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    typeof item.moodId === 'string' && moodById.has(item.moodId) &&
    Array.isArray(item.activityIds) && item.activityIds.every((id) => typeof id === 'string') &&
    typeof item.note === 'string' &&
    Array.isArray(item.attachments) && item.attachments.every(isAttachment) &&
    (item.music === undefined || (Array.isArray(item.music) && item.music.every(isMusic))) &&
    typeof item.isFavorite === 'boolean';
}

function isStateV1(value: unknown): value is EmotionStateV1 {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return state.schemaVersion === 1 && Array.isArray(state.entries) && state.entries.every(isEntry);
}

function isStateV2(value: unknown): value is EmotionStateV2 {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return state.schemaVersion === 2 && Array.isArray(state.entries) && state.entries.every(isEntry) &&
    Array.isArray(state.importantDays) && state.importantDays.every(isImportantDay);
}

function migrateState(state: EmotionStateV1 | EmotionStateV2): EmotionStateV2 {
  return {
    schemaVersion: 2,
    entries: state.entries.map((entry) => ({ ...entry, music: entry.music ?? [] })),
    importantDays: state.schemaVersion === 2 ? state.importantDays : []
  };
}

function recoverState(value: unknown): EmotionStateV2 | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Record<string, unknown>;
  if (state.schemaVersion !== 1 && state.schemaVersion !== 2) return null;
  const entries = Array.isArray(state.entries) ? state.entries.filter(isEntry) : [];
  const importantDays = state.schemaVersion === 2 && Array.isArray(state.importantDays)
    ? state.importantDays.filter(isImportantDay)
    : [];
  return migrateState({
    schemaVersion: 2,
    entries,
    importantDays
  });
}

function preserveCorrupt(storage: StorageLike, raw: string, clock: () => number) {
  try { storage.setItem(`${EMOTION_CORRUPT_PREFIX}.${clock()}`, raw); } catch { /* recovery must not white-screen */ }
}

export function createEmotionStorage(storage: StorageLike, clock = () => Date.now()): EmotionStorage {
  return {
    load() {
      const raw = storage.getItem(EMOTION_STORAGE_KEY);
      if (!raw) return { schemaVersion: 2, entries: [], importantDays: [] };
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isStateV1(parsed) || isStateV2(parsed)) return migrateState(parsed);
        const recovered = recoverState(parsed);
        if (!recovered) throw new Error('unsupported emotion state');
        preserveCorrupt(storage, raw, clock);
        try { storage.setItem(EMOTION_STORAGE_KEY, JSON.stringify(recovered)); } catch { /* return recovered in-memory state */ }
        return recovered;
      } catch {
        preserveCorrupt(storage, raw, clock);
        try { storage.removeItem(EMOTION_STORAGE_KEY); } catch { /* recovery must not white-screen */ }
        return { schemaVersion: 2, entries: [], importantDays: [] };
      }
    },
    save(state) {
      if (!isStateV2(state)) throw new Error('情绪数据不合法');
      storage.setItem(EMOTION_STORAGE_KEY, JSON.stringify(migrateState(state)));
    }
  };
}

export function getBrowserEmotionStorage() {
  return createEmotionStorage(window.localStorage);
}
