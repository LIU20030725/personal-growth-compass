import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCalendarDaySummary, getLocalDateKey } from '../emotionEngine';
import type { EmotionEntry } from '../types';
import { EmotionIcon } from '../components/EmotionIcon';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

export function EmotionCalendarView({ entries, month, onMonth, onOpenDay }: {
  entries: EmotionEntry[];
  month: string;
  onMonth: (month: string) => void;
  onOpenDay: (dateKey: string) => void;
}) {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, monthNumber, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthNumber - 1, index - leading + 1);
    return { date, inMonth: date.getMonth() === monthNumber - 1, dateKey: getLocalDateKey(date) };
  });
  function shift(amount: number) { onMonth(monthKey(new Date(year, monthNumber - 1 + amount, 1))); }
  return <div className="emotion-view">
    <header className="emotion-view-header"><div><span className="emotion-eyebrow"><CalendarDays /> MOOD CALENDAR</span><h1>心情日历</h1><p>看见变化，不把任何一天定义成好或坏。</p></div></header>
    <section className="emotion-calendar-card">
      <div className="emotion-calendar-title"><button type="button" aria-label="上个月" onClick={() => shift(-1)}><ChevronLeft /></button><h2>{year} 年 {monthNumber} 月</h2><button type="button" aria-label="下个月" onClick={() => shift(1)}><ChevronRight /></button></div>
      <div className="emotion-calendar-weekdays">{weekdays.map((day) => <span key={day}>周{day}</span>)}</div>
      <div className="emotion-calendar-grid">{cells.map(({ date, dateKey, inMonth }) => {
        const summary = getCalendarDaySummary(entries, dateKey);
        const today = dateKey === getLocalDateKey(new Date());
        return <button
          type="button"
          key={dateKey}
          disabled={!summary}
          className={`${inMonth ? '' : ' is-outside'}${today ? ' is-today' : ''}${summary ? ' has-entry' : ''}`}
          aria-label={summary ? `查看 ${dateKey} 的 ${summary.count} 条记录` : `${dateKey} 无记录`}
          onClick={() => summary && onOpenDay(dateKey)}
        ><span>{date.getDate()}</span>{summary && <><EmotionIcon moodId={summary.moodId} size="small" />{summary.count > 1 && <em>{summary.count}</em>}</>}</button>;
      })}</div>
    </section>
  </div>;
}

