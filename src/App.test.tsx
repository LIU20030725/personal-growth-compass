import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Economy dashboard', () => {
  it('keeps the page focused on net worth and account groups without the removed formula strip', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '净资产' })).toBeInTheDocument();
    expect(screen.getByText('¥611,520')).toBeInTheDocument();

    const accountOverview = screen.getByLabelText('账户总览');
    expect(within(accountOverview).getByText('资金账户')).toBeInTheDocument();
    expect(within(accountOverview).getByText('¥59,120')).toBeInTheDocument();
    expect(within(accountOverview).getByText('理财账户')).toBeInTheDocument();
    expect(within(accountOverview).getByText('¥126,000')).toBeInTheDocument();
    expect(within(accountOverview).getByText('应收账款')).toBeInTheDocument();
    expect(within(accountOverview).getByText('¥8,500')).toBeInTheDocument();

    expect(screen.queryByLabelText('净资产拆解')).not.toBeInTheDocument();
    expect(screen.queryByText('收入管理')).not.toBeInTheDocument();
    expect(screen.queryByText('不动产与负债')).not.toBeInTheDocument();
    expect(screen.queryByText('目标契约')).not.toBeInTheDocument();
    expect(screen.queryByText('预算守卫')).not.toBeInTheDocument();
    expect(screen.queryByText('本月动态')).not.toBeInTheDocument();
    expect(screen.queryByText('近 30 天收支趋势')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: '本月支出去向' })).toBeInTheDocument();
    expect(screen.queryByLabelText('本月支出去向明细')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /查看分析/ }));
    const analysisDropdown = screen.getByLabelText('本月支出去向明细');
    expect(within(analysisDropdown).getByLabelText('本月支出去向饼图')).toBeInTheDocument();
    expect(within(analysisDropdown).getByText('餐饮')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /收起分析/ })).toBeInTheDocument();
  });

  it('adds a new cash account from the account dropdown', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /增加银行卡/ }));
    fireEvent.change(screen.getByLabelText('账户名称'), { target: { value: '工商银行卡' } });
    fireEvent.change(screen.getByLabelText('当前余额'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '备用储蓄卡' } });
    fireEvent.click(screen.getByRole('button', { name: '保存账户' }));

    expect(screen.getByText('工商银行卡')).toBeInTheDocument();
    expect(screen.getByText('备用储蓄卡')).toBeInTheDocument();
    expect(screen.getByText('¥62,120')).toBeInTheDocument();
  });

  it('shows account records as monthly bill cards with balance after each item', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /招商银行卡/ }));
    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText('用途分析'), { target: { value: '工资补发' } });
    fireEvent.click(screen.getByLabelText('收入'));
    fireEvent.click(screen.getByRole('button', { name: '保存账户记录' }));

    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('用途分析'), { target: { value: '充电话费' } });
    fireEvent.click(screen.getByLabelText('支出'));
    fireEvent.click(screen.getByRole('button', { name: '保存账户记录' }));

    const accountBills = screen.getByLabelText('账户月度流水记录');
    expect(within(accountBills).getByText('2026年 06月')).toBeInTheDocument();
    expect(within(accountBills).getByText('流入: ¥300')).toBeInTheDocument();
    expect(within(accountBills).getByText('流出: ¥100')).toBeInTheDocument();
    expect(within(accountBills).getByText('工资补发')).toBeInTheDocument();
    expect(within(accountBills).getByText('充电话费')).toBeInTheDocument();
    expect(within(accountBills).getByText('+¥300')).toBeInTheDocument();
    expect(within(accountBills).getByText('-¥100')).toBeInTheDocument();
    expect(within(accountBills).getByText(/余额: ¥12,600/)).toBeInTheDocument();
    expect(within(accountBills).getByText(/余额: ¥12,500/)).toBeInTheDocument();
  });

  it('uses profit/loss wording for investment accounts and supports transfer without changing monthly income or expense', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /理财账户/ }));
    fireEvent.click(screen.getByRole('button', { name: /同花顺 A 股/ }));

    const detail = screen.getByLabelText('账户详情表单');
    expect(within(detail).getByLabelText('盈收')).toBeInTheDocument();
    expect(within(detail).getByLabelText('亏损')).toBeInTheDocument();

    fireEvent.change(within(detail).getByLabelText('转入账户'), { target: { value: 'wechat' } });
    fireEvent.change(within(detail).getByLabelText('转账金额'), { target: { value: '500' } });
    fireEvent.change(within(detail).getByLabelText('转账用途'), { target: { value: '理财账户转入微信零钱' } });
    fireEvent.click(within(detail).getByRole('button', { name: '保存转账' }));

    expect(within(detail).getByText('理财账户转入微信零钱')).toBeInTheDocument();
    expect(screen.getByLabelText('本月支出金额')).toHaveTextContent('¥1,100');
    expect(screen.getByText('¥12,000')).toBeInTheDocument();
  });

  it('opens a month detail sheet from the savings calendar and shows income and expense sources', () => {
    render(<App />);

    const savingsCalendar = screen.getByLabelText('2026 年月度存钱日历');
    fireEvent.click(within(savingsCalendar).getByRole('button', { name: /6月/ }));

    const monthSheet = screen.getByLabelText('月份收支来源');
    expect(within(monthSheet).getByRole('heading', { name: '2026年 06月' })).toBeInTheDocument();
    expect(within(monthSheet).getByText('总收入')).toBeInTheDocument();
    expect(within(monthSheet).getByText('¥12,000')).toBeInTheDocument();
    expect(within(monthSheet).getByText('总支出')).toBeInTheDocument();
    expect(within(monthSheet).getByText('¥1,100')).toBeInTheDocument();
    expect(within(monthSheet).getByText('六月工资')).toBeInTheDocument();
    expect(within(monthSheet).getByText('日常餐饮')).toBeInTheDocument();
    expect(within(monthSheet).getByText('通勤')).toBeInTheDocument();
  });
});
