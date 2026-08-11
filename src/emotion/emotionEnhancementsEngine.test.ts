import { describe, expect, it } from 'vitest';
import {
  deriveLibraryItems,
  filterLibraryItems,
  getImportantDaysForDate,
  getOnThisDayEntries,
  getRecentJournalEntries,
  getUpcomingImportantDays
} from './emotionEngine';
import type { EmotionEntry, EmotionImportantDay } from './types';

function entry(overrides: Partial<EmotionEntry> = {}): EmotionEntry {
  return {
    id: 'entry-1',
    createdAt: '2025-08-12T08:00:00.000Z',
    updatedAt: '2025-08-12T08:00:00.000Z',
    moodId: 'calm',
    activityIds: ['creating'],
    note: '',
    attachments: [],
    music: [],
    isFavorite: false,
    ...overrides
  };
}

function importantDay(overrides: Partial<EmotionImportantDay> = {}): EmotionImportantDay {
  return {
    id: 'day-1',
    title: '第一次独自旅行',
    dateKey: '2026-08-15',
    note: '',
    remindDaysBefore: 3,
    repeat: 'none',
    createdAt: '2026-08-12T08:00:00.000Z',
    updatedAt: '2026-08-12T08:00:00.000Z',
    ...overrides
  };
}

describe('emotion refinement engine', () => {
  it('surfaces a favorited moment even when it has no note or attachment', () => {
    const items = deriveLibraryItems([entry({ isFavorite: true })]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'diary', sourceEntryId: 'entry-1', isFavorite: true });
  });

  it('includes audio and music in the media library', () => {
    const items = deriveLibraryItems([entry({
      attachments: [{
        id: 'audio-1', kind: 'audio', fileName: 'voice.webm', mimeType: 'audio/webm',
        size: 12, durationMs: 1000, width: null, height: null, isFavorite: false
      }],
      music: [{
        id: 'music-1', provider: 'netease', title: '晴天', artist: '周杰伦',
        sourceUrl: 'https://music.163.com/song?id=1', playbackUrl: '', isFavorite: true
      }]
    })]);

    expect(filterLibraryItems(items, 'media').map((item) => item.kind)).toEqual(['audio', 'music']);
  });

  it('keeps only the newest ten moments on the journal surface', () => {
    const entries = Array.from({ length: 11 }, (_, index) => entry({
      id: `entry-${index}`,
      createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T08:00:00.000Z`
    }));

    expect(getRecentJournalEntries(entries).map((item) => item.id)).toEqual([
      'entry-10', 'entry-9', 'entry-8', 'entry-7', 'entry-6',
      'entry-5', 'entry-4', 'entry-3', 'entry-2', 'entry-1'
    ]);
    expect(entries).toHaveLength(11);
  });

  it('returns only prior-year moments from the same month and day', () => {
    const result = getOnThisDayEntries([
      entry({ id: 'older', createdAt: '2024-08-12T08:00:00.000Z' }),
      entry({ id: 'last-year', createdAt: '2025-08-12T08:00:00.000Z' }),
      entry({ id: 'today', createdAt: '2026-08-12T08:00:00.000Z' }),
      entry({ id: 'other-day', createdAt: '2025-08-11T08:00:00.000Z' })
    ], new Date('2026-08-12T12:00:00.000Z'), 0);

    expect(result.map((item) => item.id)).toEqual(['last-year', 'older']);
  });

  it('matches one-time and yearly important days and computes reminder windows', () => {
    const days = [
      importantDay(),
      importantDay({ id: 'yearly', dateKey: '2020-08-15', repeat: 'yearly', remindDaysBefore: 7 })
    ];

    expect(getImportantDaysForDate(days, '2026-08-15').map((item) => item.id)).toEqual(['day-1', 'yearly']);
    expect(getUpcomingImportantDays(days, new Date('2026-08-12T12:00:00.000Z')).map((item) => item.id))
      .toEqual(['day-1', 'yearly']);
  });
});
