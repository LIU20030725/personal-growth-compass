import { describe, expect, it } from 'vitest';
import { createEmotionStorage, EMOTION_STORAGE_KEY } from './emotionStorage';
import type { EmotionEntry } from './types';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    keys: () => [...data.keys()]
  };
}

const sample: EmotionEntry = {
  id: 'entry-1',
  createdAt: '2026-08-02T09:00:00.000Z',
  updatedAt: '2026-08-02T09:00:00.000Z',
  moodId: 'happy',
  activityIds: [],
  note: '',
  attachments: [],
  isFavorite: false
};

describe('emotion storage', () => {
  it('空存储返回 v1 空状态并可完整读写', () => {
    const raw = memoryStorage();
    const storage = createEmotionStorage(raw);
    expect(storage.load()).toEqual({ schemaVersion: 1, entries: [] });
    storage.save({ schemaVersion: 1, entries: [sample] });
    expect(storage.load().entries).toEqual([sample]);
  });

  it('损坏数据会备份并回退为空状态', () => {
    const raw = memoryStorage();
    raw.setItem(EMOTION_STORAGE_KEY, '{broken');
    const storage = createEmotionStorage(raw, () => 1234);

    expect(storage.load()).toEqual({ schemaVersion: 1, entries: [] });
    expect(raw.keys()).toContain('dice-life.emotion.corrupt.1234');
    expect(raw.getItem(EMOTION_STORAGE_KEY)).toBeNull();
  });

  it('拒绝保存不合法状态', () => {
    const storage = createEmotionStorage(memoryStorage());
    expect(() => storage.save({ schemaVersion: 1, entries: [{ ...sample, moodId: '' }] }))
      .toThrow('情绪数据不合法');
  });
});

