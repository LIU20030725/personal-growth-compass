import { activityById, moodById } from './emotionConfig';
import type {
  EmotionCalendarDaySummary,
  EmotionDraft,
  EmotionEntry,
  EmotionImportantDay,
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

export function getRecentJournalEntries(entries: EmotionEntry[], limit = 10) {
  return sortEntriesNewestFirst(entries).slice(0, limit);
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
    if (entry.note.trim() || entry.isFavorite) {
      items.push({
        id: `diary:${entry.id}`,
        kind: 'diary',
        sourceEntryId: entry.id,
        createdAt: entry.createdAt,
        moodId: entry.moodId,
        note: entry.note,
        attachment: null,
        music: null,
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
      music: null,
      isFavorite: attachment.isFavorite
    })));
    items.push(...(entry.music ?? []).map((music) => ({
      id: `music:${music.id}`,
      kind: 'music' as const,
      sourceEntryId: entry.id,
      createdAt: entry.createdAt,
      moodId: entry.moodId,
      note: entry.note,
      attachment: null,
      music,
      isFavorite: music.isFavorite
    })));
    return items;
  });
}

export function filterLibraryItems(items: EmotionLibraryItem[], tab: EmotionLibraryTab) {
  if (tab === 'diary') return items.filter((item) => item.kind === 'diary');
  if (tab === 'media') return items.filter((item) => item.kind !== 'diary');
  return items;
}

export function getOnThisDayEntries(entries: EmotionEntry[], now = new Date(), offsetMinutes?: number) {
  const today = getLocalDateKey(now, offsetMinutes);
  const currentYear = Number(today.slice(0, 4));
  const monthDay = today.slice(5);
  return sortEntriesNewestFirst(entries.filter((entry) => {
    const key = getLocalDateKey(new Date(entry.createdAt), offsetMinutes);
    return Number(key.slice(0, 4)) < currentYear && key.slice(5) === monthDay;
  }));
}

export function getImportantDaysForDate(days: EmotionImportantDay[], dateKey: string) {
  return days.filter((day) => day.dateKey === dateKey || (day.repeat === 'yearly' && day.dateKey.slice(5) === dateKey.slice(5)));
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getUpcomingImportantDays(days: EmotionImportantDay[], now = new Date()) {
  const today = startOfLocalDay(now);
  return days.filter((day) => {
    const [year, month, date] = day.dateKey.split('-').map(Number);
    let occurrence = new Date(day.repeat === 'yearly' ? today.getFullYear() : year, month - 1, date);
    if (day.repeat === 'yearly' && occurrence < today) occurrence = new Date(today.getFullYear() + 1, month - 1, date);
    const daysUntil = Math.round((occurrence.getTime() - today.getTime()) / 86_400_000);
    return daysUntil >= 0 && daysUntil <= day.remindDaysBefore;
  }).sort((a, b) => a.dateKey.slice(5).localeCompare(b.dateKey.slice(5)));
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
