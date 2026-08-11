import { CalendarDays, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getCalendarDaySummary, getImportantDaysForDate, getLocalDateKey, getOnThisDayEntries } from '../emotionEngine';
import type { EmotionEntry, EmotionImportantDay } from '../types';
import { EmotionEntryCard } from '../components/EmotionEntryCard';
import { EmotionIcon } from '../components/EmotionIcon';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function EmotionCalendarView({ entries, importantDays, month, onMonth, onOpenDay, onOpenEntry, now = new Date() }: {
  entries: EmotionEntry[];
  importantDays: EmotionImportantDay[];
  month: string;
  onMonth: (month: string) => void;
  onOpenDay: (dateKey: string) => void;
  onOpenEntry: (entryId: string) => void;
  now?: Date;
}) {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthNumber - 1, index - leading + 1);
    return { date, inMonth: date.getMonth() === monthNumber - 1, dateKey: getLocalDateKey(date) };
  });
  const memories = getOnThisDayEntries(entries, now);

  function shift(amount: number) {
    onMonth(monthKey(new Date(year, monthNumber - 1 + amount, 1)));
  }

  return <div className="emotion-view">
    <header className="emotion-view-header"><div><span className="emotion-eyebrow"><CalendarDays /> MOOD CALENDAR</span><h1>心情日历</h1><p>看见变化，不把任何一天定义成好或坏。</p></div></header>
    <section className="emotion-calendar-card" aria-label={`${year}年${monthNumber}月心情日历`}>
      <div className="emotion-calendar-title"><button type="button" aria-label="上个月" onClick={() => shift(-1)}><ChevronLeft /></button><h2>{year} 年 {monthNumber} 月</h2><button type="button" aria-label="下个月" onClick={() => shift(1)}><ChevronRight /></button></div>
      <div className="emotion-calendar-weekdays">{weekdays.map((day) => <span key={day}>周{day}</span>)}</div>
      <div className="emotion-calendar-grid">{cells.map(({ date, dateKey, inMonth }) => {
        const summary = getCalendarDaySummary(entries, dateKey);
        const dayImportant = getImportantDaysForDate(importantDays, dateKey);
        const hasContent = Boolean(summary || dayImportant.length);
        const today = dateKey === getLocalDateKey(now);
        const label = [
          dateKey,
          summary ? `${summary.count} 条记录` : '无心情记录',
          dayImportant.length ? `重要日 ${dayImportant.map((day) => day.title).join('、')}` : ''
        ].filter(Boolean).join('，');
        return <button
          type="button"
          key={dateKey}
          disabled={!hasContent}
          className={`${inMonth ? '' : ' is-outside'}${today ? ' is-today' : ''}${summary ? ' has-entry' : ''}${dayImportant.length ? ' has-important-day' : ''}`}
          aria-label={label}
          onClick={() => hasContent && onOpenDay(dateKey)}
        >
          <span>{date.getDate()}</span>
          {dayImportant.length > 0 && <Star className="emotion-calendar-star" aria-hidden="true" fill="currentColor" />}
          {summary && <><EmotionIcon moodId={summary.moodId} size="small" />{summary.count > 1 && <em>{summary.count}</em>}</>}
        </button>;
      })}</div>
    </section>
    <section className="emotion-on-this-day" aria-labelledby="emotion-on-this-day-title">
      <div className="emotion-on-this-day__heading"><div><span>MEMORIES</span><h2 id="emotion-on-this-day-title">那年今日</h2></div><p>遇见往年同一天的自己</p></div>
      {memories.length > 0
        ? <div className="emotion-on-this-day__list">{memories.map((entry) => <EmotionEntryCard key={entry.id} entry={entry} onOpen={() => onOpenEntry(entry.id)} />)}</div>
        : <p className="emotion-on-this-day__empty">往年的今天还没有记录。以后再回来，会在这里遇见曾经的自己。</p>}
    </section>
  </div>;
}
