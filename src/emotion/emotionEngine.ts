import { activityById, moodById } from './emotionConfig';
import type {
  EmotionCalendarDaySummary,
  EmotionDraft,
  EmotionEntry,
  EmotionLibraryItem,
  EmotionLibraryTab
} from './types';

export function getLocalDateKey(date: Date, offsetMinutes = -date.getTimezoneOffset()) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function sortEntriesNewestFirst(entries: EmotionEntry[]) {
  return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getEntriesByLocalDate(entries: EmotionEntry[], dateKey: string, offsetMinutes?: number) {
  return sortEntriesNewestFirst(entries.filter((entry) => (
    getLocalDateKey(new Date(entry.createdAt), offsetMinutes) === dateKey
  )));
}

export function getLatestTodayEntry(entries: EmotionEntry[], now = new Date(), offsetMinutes?: number) {
  return getEntriesByLocalDate(entries, getLocalDateKey(now, offsetMinutes), offsetMinutes)[0] ?? null;
}

export function getCalendarDaySummary(
  entries: EmotionEntry[],
  dateKey: string,
  offsetMinutes?: number
): EmotionCalendarDaySummary | null {
  const dayEntries = getEntriesByLocalDate(entries, dateKey, offsetMinutes);
  if (!dayEntries.length) return null;
  return { dateKey, moodId: dayEntries[0].moodId, count: dayEntries.length, entryId: dayEntries[0].id };
}

export function deriveLibraryItems(entries: EmotionEntry[]): EmotionLibraryItem[] {
  return sortEntriesNewestFirst(entries).flatMap((entry) => {
    const items: EmotionLibraryItem[] = [];
    if (entry.note.trim()) {
      items.push({
        id: `diary:${entry.id}`,
        kind: 'diary',
        sourceEntryId: entry.id,
        createdAt: entry.createdAt,
        moodId: entry.moodId,
        note: entry.note,
        attachment: null,
        isFavorite: entry.isFavorite
      });
    }
    items.push(...entry.attachments.map((attachment) => ({
      id: `attachment:${attachment.id}`,
      kind: attachment.kind,
      sourceEntryId: entry.id,
      createdAt: entry.createdAt,
      moodId: entry.moodId,
      note: entry.note,
      attachment,
      isFavorite: attachment.isFavorite
    })));
    return items;
  });
}

export function filterLibraryItems(items: EmotionLibraryItem[], tab: EmotionLibraryTab) {
  if (tab === 'diary') return items.filter((item) => item.kind === 'diary');
  if (tab === 'media') return items.filter((item) => item.kind === 'image' || item.kind === 'video');
  return items;
}

export function validateDraft(draft: EmotionDraft): {
  valid: boolean;
  errors: string[];
  normalized: EmotionDraft;
} {
  const normalized: EmotionDraft = {
    ...draft,
    note: draft.note.trim(),
    activityIds: [...new Set(draft.activityIds)].filter((id) => activityById.has(id))
  };
  const errors: string[] = [];
  if (!moodById.has(normalized.moodId)) errors.push('请选择此刻的情绪');
  if (normalized.note.length > 5000) errors.push('文字不能超过 5000 字');
  const images = normalized.attachments.filter((item) => item.kind === 'image');
  if (images.length > 9) errors.push('最多添加 9 张图片');
  if (normalized.attachments.filter((item) => item.kind === 'video').length > 1) errors.push('最多添加 1 个视频');
  if (normalized.attachments.filter((item) => item.kind === 'audio').length > 1) errors.push('最多添加 1 段语音');
  return { valid: errors.length === 0, errors, normalized };
}
