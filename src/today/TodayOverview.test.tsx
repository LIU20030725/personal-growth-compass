import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TodayOverview } from './TodayOverview';
import { emptyTodayOverviewModel, type TodayOverviewModel } from './todayOverviewModel';

const callbacks = () => ({
  onOpenModule: vi.fn(),
  onQuickAction: vi.fn(),
  onCompleteTask: vi.fn(),
});

describe('TodayOverview', () => {
  it('renders the reference empty-state layout', () => {
    render(<TodayOverview model={emptyTodayOverviewModel} {...callbacks()} />);

    expect(screen.getByRole('heading', { name: '今日总览' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '今日状态' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText('今天还没有微行动')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '记录此刻' })).toBeInTheDocument();
  });

  it('shows populated module and task summaries without inventing a fourth card', () => {
    const model: TodayOverviewModel = {
      emotion: { hasRecord: true, moodId: 'calm', primary: '平静', secondary: '看看今天的情绪' },
      ability: { treeId: 'tree-1', treeName: '产品设计', nextNodeName: '完成信息架构', primary: '产品设计', secondary: '下一步：完成信息架构' },
      health: { hasRecord: true, primary: '饮水 500 ml', secondary: '今天已有 2 条记录', recordCount: 2 },
      tasks: {
        totalCount: 4,
        completedCount: 1,
        primary: '1/4 已完成',
        secondary: '查看今日任务',
        items: [
          { id: 'task-1', title: '整理案例', completionStandard: '完成案例说明', completed: false },
          { id: 'task-2', title: '散步', completionStandard: '散步 20 分钟', completed: false },
          { id: 'task-3', title: '阅读', completionStandard: '阅读 10 页', completed: true },
        ],
      },
    };

    render(<TodayOverview model={model} {...callbacks()} />);

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getAllByText('平静').length).toBeGreaterThan(0);
    expect(screen.getAllByText('产品设计').length).toBeGreaterThan(0);
    expect(screen.getAllByText('饮水 500 ml').length).toBeGreaterThan(0);
    expect(screen.getByText('1/4 已完成')).toBeInTheDocument();
    const actions = screen.getByRole('region', { name: '今天的微行动' });
    expect(within(actions).getByText('整理案例')).toBeInTheDocument();
    expect(within(actions).getByText('散步')).toBeInTheDocument();
    expect(within(actions).getByText('阅读')).toBeInTheDocument();
  });

  it('dispatches module and micro-action callbacks', () => {
    const handlers = callbacks();
    const model: TodayOverviewModel = {
      ...emptyTodayOverviewModel,
      tasks: {
        totalCount: 1,
        completedCount: 0,
        primary: '0/1 已完成',
        secondary: '查看今日任务',
        items: [{ id: 'task-1', title: '整理案例', completionStandard: '完成案例说明', completed: false }],
      },
    };

    render(<TodayOverview model={model} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: '继续成长' }));
    expect(handlers.onOpenModule).toHaveBeenCalledWith('ability', null);
    fireEvent.click(screen.getByRole('button', { name: '记录完成：整理案例' }));
    expect(handlers.onCompleteTask).toHaveBeenCalledWith('task-1');
  });
});
