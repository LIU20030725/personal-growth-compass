import { describe, expect, it } from 'vitest';
import {
  calculateFinanceOverview,
  scoreEconomy,
  type FinanceState
} from './financeEngine';

const sampleState: FinanceState = {
  transactions: [
    { id: 't1', type: 'income', category: '工资', amount: 12000, date: '2026-06-05', note: '六月工资' },
    { id: 't2', type: 'expense', category: '餐饮', amount: 860, date: '2026-06-06', note: '日常餐饮' },
    { id: 't3', type: 'expense', category: '交通', amount: 240, date: '2026-06-10', note: '通勤' },
    { id: 't4', type: 'income', category: '副业', amount: 1800, date: '2026-05-21', note: '咨询项目' },
    { id: 't5', type: 'expense', category: '娱乐', amount: 520, date: '2026-05-23', note: '电影与聚餐' }
  ],
  assets: [
    { id: 'a1', name: '现金账户', category: '现金', value: 16800 },
    { id: 'a2', name: '指数基金', category: '基金', value: 23800, cost: 22000 }
  ],
  liabilities: [
    { id: 'l1', name: '信用卡账单', category: '信用卡', balance: 2100 }
  ],
  goals: [
    { id: 'g1', title: '应急金 30000', target: 30000, current: 16800, deadline: '2026-09-30' }
  ],
  budgets: [
    { id: 'b1', category: '餐饮', limit: 1500, period: '2026-06' }
  ]
};

describe('calculateFinanceOverview', () => {
  it('calculates monthly income, expenses, balance, net worth, savings rate, budget usage, and goal progress', () => {
    const overview = calculateFinanceOverview(sampleState, '2026-06');

    expect(overview.monthlyIncome).toBe(12000);
    expect(overview.monthlyExpense).toBe(1100);
    expect(overview.monthlyBalance).toBe(10900);
    expect(overview.assetValue).toBe(40600);
    expect(overview.liabilityValue).toBe(2100);
    expect(overview.netWorth).toBe(38500);
    expect(overview.savingsRate).toBeCloseTo(90.83, 2);
    expect(overview.budgetAlerts).toEqual([
      { category: '餐饮', spent: 860, limit: 1500, usage: 57.33, status: 'safe' }
    ]);
    expect(overview.goalProgress[0]).toMatchObject({
      title: '应急金 30000',
      progress: 56,
      remaining: 13200
    });
  });

  it('returns stable zero values for an empty month without NaN', () => {
    const overview = calculateFinanceOverview({ ...sampleState, transactions: [] }, '2026-06');

    expect(overview.monthlyIncome).toBe(0);
    expect(overview.monthlyExpense).toBe(0);
    expect(overview.monthlyBalance).toBe(0);
    expect(overview.savingsRate).toBe(0);
  });
});

describe('scoreEconomy', () => {
  it('rewards positive balance, savings rate, goal progress, and record activity', () => {
    expect(scoreEconomy(calculateFinanceOverview(sampleState, '2026-06'))).toBeGreaterThanOrEqual(80);
  });

  it('does not inflate the score when there is no income and no activity', () => {
    const overview = calculateFinanceOverview(
      { transactions: [], assets: [], liabilities: [], goals: [], budgets: [] },
      '2026-06'
    );

    expect(scoreEconomy(overview)).toBeLessThanOrEqual(25);
  });
});
