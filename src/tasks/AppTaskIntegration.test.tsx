import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('Dice Life task navigation', () => {
  beforeEach(() => localStorage.clear());

  it('opens the complete task center from the top navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '本周进展' })).toBeInTheDocument();
    expect(screen.getByText('骰子账本')).toBeInTheDocument();
  });
});
