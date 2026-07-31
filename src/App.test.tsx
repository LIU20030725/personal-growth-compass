import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Economy dashboard', () => {
  it('uses the Dice Life shell and switches between character and system views', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Dice Life 首页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '任务' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '成就' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '冒险日志' })).toBeInTheDocument();
    expect(screen.queryByText('成就收集')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '打开人物状态信息表' }));
    expect(screen.getByLabelText('人物状态信息表')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '人物状态' })).toBeInTheDocument();
    expect(screen.getByText('核心属性')).toBeInTheDocument();
    expect(screen.getByText('当前主线')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /财富状况/ }));
    expect(screen.getByRole('heading', { name: '净资产' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /能力属性/ }));
    expect(screen.getByLabelText('能力属性模块')).toBeInTheDocument();
  });

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

    expect(screen.getByText('本月收入支出')).toBeInTheDocument();
    expect(screen.queryByLabelText('本月收入支出详情')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /本月收入支出/ }));
    const cashflowPage = screen.getByLabelText('本月收入支出详情');
    expect(within(cashflowPage).getByLabelText('本月支出去向饼图')).toBeInTheDocument();
    expect(within(cashflowPage).getByLabelText('本月收支分析')).toBeInTheDocument();
    expect(within(cashflowPage).getByText('餐饮')).toBeInTheDocument();
    expect(within(cashflowPage).getByLabelText('每日收支记录')).toBeInTheDocument();
  });

  it('closes subpages when the backdrop canvas is clicked', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /本月收入支出/ }));
    const cashflowPage = screen.getByLabelText('本月收入支出详情');
    fireEvent.click(cashflowPage.parentElement as HTMLElement);
    expect(screen.queryByLabelText('本月收入支出详情')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /记一笔/ }));
    const entrySheet = screen.getByLabelText('快速记账表单');
    fireEvent.click(entrySheet.parentElement as HTMLElement);
    expect(screen.queryByLabelText('快速记账表单')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /招商银行卡/ }));
    const accountDetail = screen.getByLabelText('账户详情表单');
    fireEvent.click(accountDetail.parentElement as HTMLElement);
    expect(screen.queryByLabelText('账户详情表单')).not.toBeInTheDocument();
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

  it('renames accounts from the detail pencil and deletes them only after confirmation', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /招商银行卡/ }));
    const detail = screen.getByLabelText('账户详情表单');
    fireEvent.click(within(detail).getByRole('button', { name: /重命名招商银行卡/ }));
    fireEvent.change(within(detail).getByLabelText('新的账户名称'), { target: { value: '主工资银行卡' } });
    fireEvent.click(within(detail).getByRole('button', { name: '保存' }));
    expect(within(detail).getByRole('heading', { name: '主工资银行卡' })).toBeInTheDocument();

    fireEvent.click(within(detail).getByRole('button', { name: '关闭账户详情' }));
    fireEvent.click(screen.getAllByLabelText('删除此账户')[0]);
    const confirmDialog = screen.getByRole('dialog', { name: '是否删除此账户信息？' });
    expect(within(confirmDialog).getByText(/主工资银行卡/)).toBeInTheDocument();
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '否' }));
    expect(screen.getByRole('button', { name: /主工资银行卡/ })).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('删除此账户')[0]);
    fireEvent.click(screen.getByRole('button', { name: '是' }));
    expect(screen.queryByRole('button', { name: /主工资银行卡/ })).not.toBeInTheDocument();
    expect(screen.getByText('¥46,820')).toBeInTheDocument();
  });

  it('posts quick cashflow entries to the selected cash account and ledger', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /记一笔/ }));
    fireEvent.change(screen.getByLabelText('资金账户'), { target: { value: 'wechat' } });
    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '100' } });
    expect(screen.getByLabelText('资金账户余额预览')).toHaveTextContent('扣除后余额：¥720');
    fireEvent.change(screen.getByLabelText('分类'), { target: { value: '饮品' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '奶茶' } });
    fireEvent.click(screen.getByRole('button', { name: '保存记录' }));

    const ledger = screen.getByLabelText('本月收入支出记录明细');
    expect(within(ledger).getByText('奶茶')).toBeInTheDocument();
    expect(within(ledger).getAllByText(/微信钱包/).length).toBeGreaterThan(0);
    expect(within(ledger).getByText('-¥100')).toBeInTheDocument();
    expect(screen.getByLabelText('本月支出金额')).toHaveTextContent('¥1,200');
    expect(screen.getByText('¥59,020')).toBeInTheDocument();
    expect(screen.getByText('¥720')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /微信钱包 日常小额支付 ¥720/ }));
    const accountBills = screen.getByLabelText('账户月度流水记录');
    expect(within(accountBills).getByText('奶茶')).toBeInTheDocument();
    expect(within(accountBills).getByText(/余额: ¥720/)).toBeInTheDocument();
  });

  it('shows account records as monthly bill cards with balance after each item', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /招商银行卡/ }));
    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText('用途分析'), { target: { value: '收益入账' } });
    fireEvent.change(screen.getByLabelText('用途说明'), { target: { value: '工资补发' } });
    fireEvent.click(screen.getByLabelText('收入'));
    fireEvent.click(screen.getByRole('button', { name: '保存账户记录' }));

    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('用途分析'), { target: { value: '日常支出' } });
    fireEvent.change(screen.getByLabelText('用途说明'), { target: { value: '充电话费' } });
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

    fireEvent.change(within(detail).getByLabelText('金额'), { target: { value: '500' } });
    fireEvent.change(within(detail).getByLabelText('用途分析'), { target: { value: '银行卡转账' } });
    fireEvent.change(within(detail).getByLabelText('转入账户'), { target: { value: 'wechat' } });
    fireEvent.click(within(detail).getByRole('button', { name: '保存账户记录' }));

    expect(within(detail).getByText('银行卡转账至 微信钱包')).toBeInTheDocument();
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
