import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';
import { TASK_RULE_VERSION } from '../../tasks/taskConfig';
import { createInitialTaskState } from '../../tasks/taskEngine';
import { saveTaskState } from '../../tasks/taskStorage';

describe('Dice Life adventure journal navigation', () => {
  beforeEach(() => localStorage.clear());

  it('opens the complete adventure journal from the top navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '冒险日志' }));

    expect(screen.getByRole('heading', { name: '冒险日志' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /旅途/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '晴日林径像素旅途场景' })).toBeInTheDocument();
    expect(screen.queryByText('模块正在构建中')).not.toBeInTheDocument();
  });

  it('guides a zero-balance visitor to the existing task center', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '冒险日志' }));
    fireEvent.click(screen.getByRole('button', { name: '投入通往风过山谷' }));

    expect(screen.getByText('完成真实任务即可获得成长骰子，再回来继续旅途。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '去任务中心获得骰子' }));

    expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '投入骰子' })).not.toBeInTheDocument();
  });

  it('does not distract a visitor who can already make a partial investment', () => {
    const taskState = createInitialTaskState();
    taskState.diceTransactions = [{
      id: 'existing-dice',
      type: 'goal-reward',
      amount: 1,
      sourceId: 'existing-goal',
      dimension: 'health',
      ruleVersion: TASK_RULE_VERSION,
      createdAt: '2026-08-03T08:00:00+08:00',
      balanceAfter: 1
    }];
    saveTaskState(localStorage, taskState);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '冒险日志' }));
    fireEvent.click(screen.getByRole('button', { name: '投入通往风过山谷' }));

    expect(screen.getByLabelText('成长骰子余额 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '去任务中心获得骰子' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认投入' })).toBeEnabled();
  });
});
