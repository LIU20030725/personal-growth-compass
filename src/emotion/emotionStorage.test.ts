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
  it('round-trips optional recognized music cover metadata', () => {
    const raw = memoryStorage();
    const storage = createEmotionStorage(raw);
    const music = [{ id: 'song', provider: 'netease' as const, title: 'EVERYTHING', artist: 'BIBI', coverUrl: 'https://p1.music.126.net/cover.jpg', sourceUrl: 'https://music.163.com/song?id=1', playbackUrl: '', isFavorite: true }];
    storage.save({ schemaVersion: 2, entries: [{ ...sample, music }], importantDays: [] });
    expect(storage.load().entries[0].music).toEqual(music);
  });

  it('migrates v1 records to v2 without losing the original moment', () => {
    const raw = memoryStorage();
    raw.setItem(EMOTION_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, entries: [sample] }));

    expect(createEmotionStorage(raw).load()).toEqual({
      schemaVersion: 2,
      entries: [{ ...sample, music: [] }],
      importantDays: []
    });
  });

  it('空存储返回 v2 空状态并可完整读写', () => {
    const raw = memoryStorage();
    const storage = createEmotionStorage(raw);
    expect(storage.load()).toEqual({ schemaVersion: 2, entries: [], importantDays: [] });
    storage.save({ schemaVersion: 2, entries: [{ ...sample, music: [] }], importantDays: [] });
    expect(storage.load().entries).toEqual([{ ...sample, music: [] }]);
  });

  it('损坏数据会备份并回退为空状态', () => {
    const raw = memoryStorage();
    raw.setItem(EMOTION_STORAGE_KEY, '{broken');
    const storage = createEmotionStorage(raw, () => 1234);

    expect(storage.load()).toEqual({ schemaVersion: 2, entries: [], importantDays: [] });
    expect(raw.keys()).toContain('dice-life.emotion.corrupt.1234');
    expect(raw.getItem(EMOTION_STORAGE_KEY)).toBeNull();
  });

  it('拒绝保存不合法状态', () => {
    const storage = createEmotionStorage(memoryStorage());
    expect(() => storage.save({ schemaVersion: 2, entries: [{ ...sample, moodId: '', music: [] }], importantDays: [] }))
      .toThrow('情绪数据不合法');
  });
});
