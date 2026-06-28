import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Economy dashboard', () => {
  it('shows the economy cockpit and records a new expense from the quick-entry form', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /经济系统/ })).toBeInTheDocument();
    expect(screen.getByText('本月结余')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /记一笔/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /记一笔/ }));
    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '128' } });
    fireEvent.change(screen.getByLabelText('分类'), { target: { value: '餐饮' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '团队午餐' } });
    fireEvent.click(screen.getByRole('button', { name: '保存记录' }));

    expect(screen.getByText('团队午餐')).toBeInTheDocument();
    expect(screen.getByLabelText('本月支出金额')).toHaveTextContent('¥1,228');
  });

  it('shows category insight and supports deleting a transaction with undo', () => {
    render(<App />);

    const categoryInsight = screen.getByRole('region', { name: '分类洞察' });
    expect(within(categoryInsight).getByText('分类洞察')).toBeInTheDocument();
    expect(within(categoryInsight).getByText('餐饮')).toBeInTheDocument();
    expect(within(categoryInsight).getByText('¥860')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '删除 通勤' }));
    expect(screen.queryByText('通勤')).not.toBeInTheDocument();
    expect(screen.getByText('已删除一笔记录')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '撤销删除' }));
    expect(screen.getByText('通勤')).toBeInTheDocument();
  });
});
