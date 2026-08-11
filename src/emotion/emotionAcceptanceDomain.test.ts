import { describe, expect, it } from 'vitest';
import {
  deriveLibraryItems, getOnThisDayEntries, getRecentJournalEntries,
  getUpcomingImportantDays, validateDraft
} from './emotionEngine';
import { createEmotionStorage, EMOTION_STORAGE_KEY } from './emotionStorage';
import type { EmotionEntry, EmotionImportantDay, EmotionStateV2 } from './types';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    keys: () => [...data.keys()]
  };
}

function attachment(kind: 'image' | 'video' | 'audio', id = kind) {
  return {
    id, kind, fileName: `${id}.bin`, mimeType: `${kind}/test`, size: 12,
    durationMs: kind === 'image' ? null : 1000, width: null, height: null, isFavorite: false
  };
}

function entry(overrides: Partial<EmotionEntry> = {}): EmotionEntry {
  return {
    id: 'entry', createdAt: '2026-08-12T08:00:00.000Z', updatedAt: '2026-08-12T08:00:00.000Z',
    moodId: 'calm', activityIds: ['reading'], note: '', attachments: [], music: [], isFavorite: false,
    ...overrides
  };
}

function important(overrides: Partial<EmotionImportantDay> = {}): EmotionImportantDay {
  return {
    id: 'day', title: '纪念日', dateKey: '2026-08-15', note: '', remindDaysBefore: 3,
    repeat: 'none', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  };
}

describe('0811 emotion domain acceptance', () => {
  it('migrates all V1 content kinds with defaults and remains idempotent', () => {
    const raw = memoryStorage();
    const legacy = entry({
      attachments: [attachment('image'), attachment('video'), attachment('audio')],
      music: [{ id: 'song', provider: 'qq', title: '晴天', artist: '歌手', sourceUrl: 'https://y.qq.com/song', playbackUrl: 'https://cdn.example/song.mp3', isFavorite: true }]
    });
    raw.setItem(EMOTION_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, entries: [legacy] }));
    const storage = createEmotionStorage(raw);

    const first = storage.load();
    const second = storage.load();
    expect(first).toEqual(second);
    expect(first).toMatchObject({ schemaVersion: 2, importantDays: [], entries: [{
      note: '', activityIds: ['reading'], attachments: [{ kind: 'image' }, { kind: 'video' }, { kind: 'audio' }],
      music: [{ sourceUrl: 'https://y.qq.com/song', playbackUrl: 'https://cdn.example/song.mp3' }]
    }] });
  });

  it('round-trips V2 important days, reminders, repeats, music and activity ids', () => {
    const raw = memoryStorage();
    const storage = createEmotionStorage(raw);
    const state: EmotionStateV2 = {
      schemaVersion: 2,
      entries: [entry({ activityIds: ['travel', 'music'], music: [{ id: 'song', provider: 'netease', title: '一路向北', artist: '歌手', sourceUrl: 'https://music.163.com/song/1', playbackUrl: 'https://cdn.example/1.mp3', isFavorite: false }] })],
      importantDays: [important({ remindDaysBefore: 30, repeat: 'yearly' })]
    };
    storage.save(state);
    expect(storage.load()).toEqual(state);
  });

  it('salvages valid records from partially damaged or missing-field V2 storage', () => {
    const raw = memoryStorage();
    raw.setItem(EMOTION_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, entries: [entry(), { id: 42 }], importantDays: undefined }));

    const recovered = createEmotionStorage(raw, () => 123).load();
    expect(recovered.entries).toEqual([entry()]);
    expect(recovered.importantDays).toEqual([]);
    expect(raw.keys()).toContain('dice-life.emotion.corrupt.123');
  });

  it.each(['image', 'video', 'audio'] as const)('includes a note-less %s record in the library', (kind) => {
    expect(deriveLibraryItems([entry({ attachments: [attachment(kind)] })]).map((item) => item.kind)).toEqual([kind]);
  });

  it('includes note-less music but excludes a pure empty moment', () => {
    const musicEntry = entry({ music: [{ id: 'song', provider: 'qq', title: '歌', artist: '', sourceUrl: 'https://y.qq.com/song', playbackUrl: '', isFavorite: false }] });
    expect(deriveLibraryItems([musicEntry]).map((item) => item.kind)).toEqual(['music']);
    expect(deriveLibraryItems([entry()])).toEqual([]);
  });

  it.each([
    ['javascript:alert(1)', '', '歌曲链接需要使用 http 或 https 地址'],
    ['data:audio/mp3;base64,AA', '', '歌曲链接需要使用 http 或 https 地址'],
    ['not a url', '', '歌曲链接需要使用 http 或 https 地址'],
    ['', 'javascript:alert(1)', '可播放地址需要使用 http 或 https 地址'],
    ['', '', '请补充歌曲链接或可播放地址']
  ])('rejects unsafe music URLs (%s / %s)', (sourceUrl, playbackUrl, error) => {
    const result = validateDraft({ moodId: 'calm', activityIds: [], note: '', attachments: [], music: [{ id: 'song', provider: 'other', title: '歌', artist: '', sourceUrl, playbackUrl, isFavorite: false }] });
    expect(result.errors).toContain(error);
  });

  it('accepts only valid http and https URLs for their respective music fields', () => {
    expect(validateDraft({ moodId: 'calm', activityIds: [], note: '', attachments: [], music: [{ id: 'song', provider: 'other', title: '歌', artist: '', sourceUrl: 'https://example.com/song', playbackUrl: 'http://cdn.example/song.mp3', isFavorite: false }] }).valid).toBe(true);
  });

  it('handles reminder today, N-day boundary, expired, cross-year and yearly dates', () => {
    const now = new Date(2026, 11, 30, 12);
    const days = [
      important({ id: 'today', dateKey: '2026-12-30', remindDaysBefore: 0 }),
      important({ id: 'boundary', dateKey: '2027-01-02', remindDaysBefore: 3 }),
      important({ id: 'outside', dateKey: '2027-01-03', remindDaysBefore: 3 }),
      important({ id: 'expired', dateKey: '2026-12-29', remindDaysBefore: 30 }),
      important({ id: 'yearly', dateKey: '2020-01-01', remindDaysBefore: 3, repeat: 'yearly' })
    ];
    expect(getUpcomingImportantDays(days, now).map((day) => day.id)).toEqual(['today', 'yearly', 'boundary']);
  });

  it('uses February 28 for yearly February 29 reminders in non-leap years', () => {
    const leap = important({ id: 'leap', dateKey: '2024-02-29', remindDaysBefore: 1, repeat: 'yearly' });
    expect(getUpcomingImportantDays([leap], new Date(2027, 1, 27, 12)).map((day) => day.id)).toEqual(['leap']);
    expect(getUpcomingImportantDays([leap], new Date(2027, 1, 28, 12)).map((day) => day.id)).toEqual(['leap']);
  });

  it('returns prior-year same-day memories newest first and otherwise empty', () => {
    const entries = [
      entry({ id: '2023', createdAt: '2023-08-12T08:00:00.000Z' }),
      entry({ id: '2025', createdAt: '2025-08-12T08:00:00.000Z' }),
      entry({ id: 'current', createdAt: '2026-08-12T08:00:00.000Z' }),
      entry({ id: 'other', createdAt: '2025-08-11T08:00:00.000Z' })
    ];
    expect(getOnThisDayEntries(entries, new Date('2026-08-12T12:00:00Z'), 0).map((item) => item.id)).toEqual(['2025', '2023']);
    expect(getOnThisDayEntries(entries, new Date('2026-08-13T12:00:00Z'), 0)).toEqual([]);
  });

  it('limits journal entries to ten with descending and stable equal-time ordering', () => {
    const sameTime = '2026-08-12T12:00:00.000Z';
    const entries = [entry({ id: 'same-a', createdAt: sameTime }), entry({ id: 'same-b', createdAt: sameTime }), ...Array.from({ length: 9 }, (_, index) => entry({ id: `older-${index}`, createdAt: `2026-08-${String(11 - index).padStart(2, '0')}T12:00:00.000Z` }))];
    const result = getRecentJournalEntries(entries);
    expect(result).toHaveLength(10);
    expect(result.slice(0, 2).map((item) => item.id)).toEqual(['same-a', 'same-b']);
    expect(result.map((item) => item.id)).not.toContain('older-8');
    expect(getRecentJournalEntries(entries.slice(0, 4))).toHaveLength(4);
    expect(getRecentJournalEntries(entries.slice(0, 10))).toHaveLength(10);
  });
});
