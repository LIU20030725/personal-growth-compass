import { describe, expect, it } from 'vitest';
import {
  deriveLibraryItems,
  filterLibraryItems,
  getCalendarDaySummary,
  getEntriesByLocalDate,
  getLatestTodayEntry,
  getLocalDateKey,
  validateDraft
} from './emotionEngine';
import type { EmotionEntry } from './types';

function entry(overrides: Partial<EmotionEntry> = {}): EmotionEntry {
  return {
    id: 'entry-1',
    createdAt: '2026-08-02T08:00:00.000Z',
    updatedAt: '2026-08-02T08:00:00.000Z',
    moodId: 'calm',
    activityIds: ['reading'],
    note: '在窗边读完了一章。',
    attachments: [],
    isFavorite: false,
    ...overrides
  };
}

describe('emotion engine', () => {
  it('按指定时区偏移归入本地自然日', () => {
    expect(getLocalDateKey(new Date('2026-08-01T16:30:00.000Z'), 8 * 60)).toBe('2026-08-02');
  });

  it('同一天返回全部记录并按最新时间优先', () => {
    const result = getEntriesByLocalDate([
      entry({ id: 'early', createdAt: '2026-08-02T08:00:00.000Z' }),
      entry({ id: 'late', createdAt: '2026-08-02T10:00:00.000Z' })
    ], '2026-08-02', 0);

    expect(result.map((item) => item.id)).toEqual(['late', 'early']);
  });

  it('日历用当天最后一条情绪并保留记录数量', () => {
    const summary = getCalendarDaySummary([
      entry({ id: 'one', moodId: 'calm', createdAt: '2026-08-02T08:00:00.000Z' }),
      entry({ id: 'two', moodId: 'excited', createdAt: '2026-08-02T12:00:00.000Z' })
    ], '2026-08-02', 0);

    expect(summary).toEqual({ dateKey: '2026-08-02', moodId: 'excited', count: 2, entryId: 'two' });
  });

  it('今日状态只返回本地今天的最新记录', () => {
    const now = new Date('2026-08-02T15:00:00.000Z');
    expect(getLatestTodayEntry([
      entry({ id: 'yesterday', createdAt: '2026-08-01T20:00:00.000Z' }),
      entry({ id: 'today', createdAt: '2026-08-02T12:00:00.000Z' })
    ], now, 0)?.id).toBe('today');
  });

  it('内容库把日记和媒体都映射回来源记录', () => {
    const items = deriveLibraryItems([entry({
      attachments: [{
        id: 'photo-1',
        kind: 'image',
        fileName: 'trip.webp',
        mimeType: 'image/webp',
        size: 512,
        durationMs: null,
        width: 800,
        height: 600,
        isFavorite: true
      }]
    })]);

    expect(items.map((item) => [item.kind, item.sourceEntryId])).toEqual([
      ['diary', 'entry-1'],
      ['image', 'entry-1']
    ]);
    expect(filterLibraryItems(items, 'media')).toHaveLength(1);
  });

  it('校验情绪必选、活动去重与文字长度', () => {
    expect(validateDraft({ moodId: '', activityIds: [], note: '', attachments: [] }).valid).toBe(false);
    expect(validateDraft({ moodId: 'calm', activityIds: ['reading', 'reading'], note: ' 好 ', attachments: [] }))
      .toMatchObject({ valid: true, normalized: { activityIds: ['reading'], note: '好' } });
    expect(validateDraft({ moodId: 'calm', activityIds: [], note: 'a'.repeat(5001), attachments: [] }).valid).toBe(false);
  });
});
