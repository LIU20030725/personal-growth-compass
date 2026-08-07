import { LockKeyhole, Sparkles } from 'lucide-react';
import type { EmotionEntry } from '../types';
import { getLocalDateKey } from '../emotionEngine';
import { EmotionEntryCard } from '../components/EmotionEntryCard';
import { EmotionStatusCard } from '../components/EmotionStatusCard';
import { EmotionGardenIllustration } from '../components/EmotionGardenIllustration';

export function EmotionJournalView({ entries, latestToday, onOpen, onFavorite }: {
  entries: EmotionEntry[];
  latestToday: EmotionEntry | null;
  onOpen: (entryId: string) => void;
  onFavorite: (entryId: string) => void;
}) {
  const groups = entries.reduce<Record<string, EmotionEntry[]>>((result, entry) => {
    const key = getLocalDateKey(new Date(entry.createdAt));
    (result[key] ??= []).push(entry);
    return result;
  }, {});
  return <div className="emotion-view">
    <header className="emotion-view-header">
      <div><span className="emotion-eyebrow"><Sparkles /> PRIVATE MOMENTS</span><h1>我的心情</h1><p>不需要评价，只需要诚实地留下一刻。</p></div>
      <span className="emotion-private-badge"><LockKeyhole />仅自己可见</span>
    </header>
    {latestToday && <EmotionStatusCard entry={latestToday} onOpen={() => onOpen(latestToday.id)} />}
    {!entries.length ? <div className="emotion-empty-state"><EmotionGardenIllustration /><h2>今天还没有留下心情</h2><p>哪怕只选一个表情，也是一份完整记录。</p></div> :
      Object.entries(groups).map(([dateKey, dayEntries]) => <section className="emotion-day-group" key={dateKey}>
        <h2>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${dateKey}T12:00:00`))}<span>{dayEntries.length} 条</span></h2>
        <div className="emotion-entry-list">{dayEntries.map((entry) => <EmotionEntryCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} onFavorite={() => onFavorite(entry.id)} />)}</div>
      </section>)}
  </div>;
}
