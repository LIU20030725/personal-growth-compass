import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TaskBoard } from './TaskBoard';

function createGoal(title = '完成英语口语提升计划') {
  fireEvent.click(screen.getByRole('button', { name: '新建长期目标' }));
  fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('目标意义'), { target: { value: '更自然地表达自己' } });
  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-08-01' } });
  fireEvent.change(screen.getByLabelText('目标日期'), { target: { value: '2027-02-01' } });
  fireEvent.click(screen.getByRole('button', { name: '保存长期目标' }));
}

describe('TaskBoard', () => {
  beforeEach(() => localStorage.clear());

  it('creates a simplified goal and ordinary task, then keeps its execution in history', () => {
    render(<TaskBoard />);

    expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
    createGoal();

    const goalCard = screen.getByRole('heading', { name: '完成英语口语提升计划', level: 3 }).closest('article');
    expect(goalCard).not.toBeNull();
    expect(within(goalCard!).getByText('白银目标宝箱 · 12 🎲')).toBeInTheDocument();
    fireEvent.click(within(goalCard!).getByRole('button', { name: '添加短期任务' }));
    fireEvent.change(screen.getByLabelText('任务名称'), { target: { value: '完成一次口语跟读' } });
    fireEvent.change(screen.getByLabelText('完成标准'), { target: { value: '跟读并录音 20 分钟' } });
    fireEvent.click(screen.getByRole('button', { name: '保存短期任务' }));

    fireEvent.click(screen.getByRole('button', { name: '记录完成：完成一次口语跟读' }));
    fireEvent.change(screen.getByLabelText('完成复盘'), { target: { value: '今天完成了一段跟读录音' } });
    fireEvent.click(screen.getByRole('button', { name: '确认完成' }));

    expect(screen.getByTestId('dice-balance')).toHaveTextContent('1');
    expect(screen.queryByRole('button', { name: '记录完成：完成一次口语跟读' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '行动历史' }));
    expect(screen.getByText('今天完成了一段跟读录音')).toBeInTheDocument();
  });

  it('uses independent daily records only for maintenance tasks', () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getByRole('button', { name: '新建短期任务' }));
    fireEvent.click(screen.getByLabelText('这是每日维持型任务'));

    expect(screen.getByLabelText('任务周期')).toHaveValue('daily');
    expect(screen.getByLabelText('任务周期')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('任务名称'), { target: { value: '每天阅读 20 分钟' } });
    fireEvent.change(screen.getByLabelText('完成标准'), { target: { value: '连续阅读 20 分钟' } });
    fireEvent.click(screen.getByRole('button', { name: '保存短期任务' }));

    fireEvent.click(screen.getByRole('button', { name: '记录完成：每天阅读 20 分钟' }));
    fireEvent.change(screen.getByLabelText('完成复盘'), { target: { value: '读完一章并做了笔记' } });
    fireEvent.click(screen.getByRole('button', { name: '确认完成' }));

    expect(screen.getAllByText('今日已记录').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '行动历史' }));
    expect(screen.getByText('读完一章并做了笔记')).toBeInTheDocument();
  });

  it('asks for confirmation before archiving and keeps weekly progress always viewable', () => {
    render(<TaskBoard />);
    createGoal('建立应急金');

    fireEvent.click(screen.getByRole('button', { name: '归档目标：建立应急金' }));
    expect(screen.getByRole('dialog', { name: '确认归档' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认归档' }));
    fireEvent.click(screen.getByRole('button', { name: '已归档' }));
    expect(screen.getByText('建立应急金')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看本周进展' }));
    expect(screen.getByRole('dialog', { name: '本周进展' })).toBeInTheDocument();
    expect(screen.getByText('本周暂无新增行动记录')).toBeInTheDocument();
  });
});
