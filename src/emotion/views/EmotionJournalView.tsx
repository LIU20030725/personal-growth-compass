import type { EmotionEntry, EmotionImportantDay } from '../types';
import { getLocalDateKey, getRecentJournalEntries } from '../emotionEngine';
import { EmotionEntryCard } from '../components/EmotionEntryCard';
import { EmotionStatusCard } from '../components/EmotionStatusCard';
import { EmotionGardenIllustration } from '../components/EmotionGardenIllustration';
import { EmotionReminderBanner } from '../components/EmotionReminderBanner';

export function EmotionJournalView({ entries, latestToday, upcomingImportantDays, onOpen, onFavorite }: {
  entries: EmotionEntry[];
  latestToday: EmotionEntry | null;
  upcomingImportantDays: EmotionImportantDay[];
  onOpen: (entryId: string) => void;
  onFavorite: (entryId: string) => void;
}) {
  const recentEntries = getRecentJournalEntries(entries);
  const groups = recentEntries.reduce<Record<string, EmotionEntry[]>>((result, entry) => {
    const key = getLocalDateKey(new Date(entry.createdAt));
    (result[key] ??= []).push(entry);
    return result;
  }, {});
  return <div className="emotion-view">
    <EmotionReminderBanner days={upcomingImportantDays} />
    {latestToday && <EmotionStatusCard entry={latestToday} onOpen={() => onOpen(latestToday.id)} />}
    {!entries.length ? <div className="emotion-empty-state"><EmotionGardenIllustration /><h2>今天还没有留下心情</h2><p>哪怕只选一个表情，也是一份完整记录。</p></div> :
      Object.entries(groups).map(([dateKey, dayEntries]) => <section className="emotion-day-group" key={dateKey}>
        <h2>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${dateKey}T12:00:00`))}<span>{dayEntries.length} 条</span></h2>
        <div className="emotion-entry-list">{dayEntries.map((entry) => <EmotionEntryCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} onFavorite={() => onFavorite(entry.id)} />)}</div>
      </section>)}
    {entries.length > recentEntries.length && <p className="emotion-journal-limit">这里只展示最近 10 条，更多记录请到心情日历查看。</p>}
  </div>;
}
