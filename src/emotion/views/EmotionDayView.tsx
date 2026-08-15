import { ArrowLeft, Plus, Star } from 'lucide-react';
import type { EmotionEntry, EmotionImportantDay } from '../types';
import { EmotionEntryCard } from '../components/EmotionEntryCard';

export function EmotionDayView({ dateKey, entries, importantDays = [], onBack, onOpen, onCreate }: {
  dateKey: string;
  entries: EmotionEntry[];
  importantDays?: EmotionImportantDay[];
  onBack: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return <div className="emotion-view">
    <header className="emotion-detail-header"><button type="button" className="emotion-icon-button" aria-label="返回日历" onClick={onBack}><ArrowLeft /></button><div><span>DAY MOMENTS</span><h1>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`))}的记录</h1></div></header>
    {importantDays.length > 0 && <div className="emotion-important-day-list">{importantDays.map((day) => <article key={day.id}><Star /><div><strong>{day.title}</strong>{day.note && <p>{day.note}</p>}</div></article>)}</div>}
    {entries.length > 0
      ? <div className="emotion-entry-list">{entries.map((entry) => <EmotionEntryCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} />)}</div>
      : <div className="emotion-day-empty"><h2>这一天还没有心情记录</h2><p>时间不必补写。想记录的话，就从现在这一刻开始。</p><button type="button" onClick={onCreate}><Plus />记录此刻</button></div>}
  </div>;
}
