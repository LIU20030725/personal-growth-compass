import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EmotionEntry, EmotionImportantDay } from '../types';
import { EmotionCalendarView } from './EmotionCalendarView';

const entry: EmotionEntry = {
  id: 'entry-1', createdAt: '2025-08-12T08:00:00.000Z', updatedAt: '2025-08-12T08:00:00.000Z',
  moodId: 'happy', activityIds: [], note: '去年的今天', attachments: [], music: [], isFavorite: false
};

const importantDay: EmotionImportantDay = {
  id: 'day-1', title: '出发旅行', dateKey: '2026-08-13', note: '', remindDaysBefore: 7,
  repeat: 'none', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z'
};

describe('EmotionCalendarView', () => {
  it('marks important days and opens a day even when it has no emotion entry', () => {
    const onOpenDay = vi.fn();
    render(<EmotionCalendarView entries={[]} importantDays={[importantDay]} month="2026-08" onMonth={vi.fn()} onOpenDay={onOpenDay} onOpenEntry={vi.fn()} now={new Date('2026-08-12T12:00:00+08:00')} />);

    const day = screen.getByRole('button', { name: /2026-08-13.*重要日.*出发旅行/ });
    expect(day).toHaveClass('has-important-day');
    fireEvent.click(day);
    expect(onOpenDay).toHaveBeenCalledWith('2026-08-13');
  });

  it('shows entries from the same month and day in previous years', () => {
    const onOpenEntry = vi.fn();
    render(<EmotionCalendarView entries={[entry]} importantDays={[]} month="2026-08" onMonth={vi.fn()} onOpenDay={vi.fn()} onOpenEntry={onOpenEntry} now={new Date('2026-08-12T12:00:00+08:00')} />);

    expect(screen.getByRole('heading', { name: '那年今日' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('去年的今天'));
    expect(onOpenEntry).toHaveBeenCalledWith('entry-1');
  });
});
