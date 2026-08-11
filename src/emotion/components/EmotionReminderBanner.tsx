import { Star } from 'lucide-react';
import type { EmotionImportantDay } from '../types';

export function EmotionReminderBanner({ days }: { days: EmotionImportantDay[] }) {
  if (!days.length) return null;
  return <aside className="emotion-reminder-banner" aria-label="临近的重要日"><Star /><div><span>重要日快到了</span>{days.map((day) => <strong key={day.id}>{day.title} · {day.dateKey.slice(5).replace('-', '月')}日</strong>)}</div></aside>;
}
