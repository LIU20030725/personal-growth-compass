import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmotionDayView } from './EmotionDayView';

describe('EmotionDayView', () => {
  it('explains an empty day and offers the current recording action', () => {
    const onCreate = vi.fn();
    render(<EmotionDayView dateKey="2026-08-15" entries={[]} onBack={vi.fn()} onOpen={vi.fn()} onCreate={onCreate} />);

    expect(screen.getByRole('heading', { name: '这一天还没有心情记录' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    expect(onCreate).toHaveBeenCalledOnce();
  });
});
