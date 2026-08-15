import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { createInitialTaskState } from './taskEngine';
import { saveTaskState } from './taskStorage';

describe('Dice Life task navigation', () => {
  beforeEach(() => localStorage.clear());

  it('opens the complete task center from the top navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '本周进展' })).toBeInTheDocument();
    expect(screen.getByText('骰子账本')).toBeInTheDocument();
  });

  it('opens a new task dialog directly from Today quick record', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '打开快捷记录' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /添加今日任务/ }));
    expect(screen.getByRole('dialog', { name: '新建短期任务' })).toBeInTheDocument();
  });

  it('opens the matching completion dialog from a Today micro-action', () => {
    const state = createInitialTaskState();
    state.tasks.push({
      id: 'today-task', goalId: null, dimension: 'ability', title: '整理今日笔记',
      completionStandard: '整理并写下三点', cadence: 'daily', targetCount: 1,
      estimatedMinutesPerOccurrence: 15, startDate: new Date().toLocaleDateString('sv-SE'), endDate: null,
      verificationType: 'reflection', isMaintenance: true, rewardEligible: true,
      status: 'active', createdAt: new Date().toISOString(), completedAt: null, archivedAt: null,
    });
    saveTaskState(localStorage, state);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '记录完成：整理今日笔记' }));
    const dialog = screen.getByRole('dialog', { name: '记录真实完成' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('整理并写下三点')).toBeInTheDocument();
  });
});
