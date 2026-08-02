import { ArrowLeft } from 'lucide-react';
import type { EmotionEntry } from '../types';
import { EmotionEntryCard } from '../components/EmotionEntryCard';

export function EmotionDayView({ dateKey, entries, onBack, onOpen }: { dateKey: string; entries: EmotionEntry[]; onBack: () => void; onOpen: (id: string) => void }) {
  return <div className="emotion-view"><header className="emotion-detail-header"><button type="button" className="emotion-icon-button" aria-label="返回日历" onClick={onBack}><ArrowLeft /></button><div><span>DAY MOMENTS</span><h1>{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`))}的记录</h1></div></header><div className="emotion-entry-list">{entries.map((entry) => <EmotionEntryCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} />)}</div></div>;
}

