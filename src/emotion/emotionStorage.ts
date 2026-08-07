import { moodById } from './emotionConfig';
import type { EmotionEntry, EmotionStateV1 } from './types';

export const EMOTION_STORAGE_KEY = 'dice-life.emotion.v1';
export const EMOTION_CORRUPT_PREFIX = 'dice-life.emotion.corrupt';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface EmotionStorage {
  load(): EmotionStateV1;
  save(state: EmotionStateV1): void;
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
    typeof item.isFavorite === 'boolean';
}

function isState(value: unknown): value is EmotionStateV1 {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return state.schemaVersion === 1 && Array.isArray(state.entries) && state.entries.every(isEntry);
}

export function createEmotionStorage(storage: StorageLike, clock = () => Date.now()): EmotionStorage {
  return {
    load() {
      const raw = storage.getItem(EMOTION_STORAGE_KEY);
      if (!raw) return { schemaVersion: 1, entries: [] };
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isState(parsed)) throw new Error('unsupported emotion state');
        return parsed;
      } catch {
        storage.setItem(`${EMOTION_CORRUPT_PREFIX}.${clock()}`, raw);
        storage.removeItem(EMOTION_STORAGE_KEY);
        return { schemaVersion: 1, entries: [] };
      }
    },
    save(state) {
      if (!isState(state)) throw new Error('情绪数据不合法');
      storage.setItem(EMOTION_STORAGE_KEY, JSON.stringify(state));
    }
  };
}

export function getBrowserEmotionStorage() {
  return createEmotionStorage(window.localStorage);
}

