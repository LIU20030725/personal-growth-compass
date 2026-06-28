export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  note?: string;
};

export type Asset = {
  id: string;
  name: string;
  category: string;
  value: number;
  cost?: number;
};

export type Liability = {
  id: string;
  name: string;
  category: string;
  balance: number;
};

export type FinanceGoal = {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
};

export type Budget = {
  id: string;
  category: string;
  limit: number;
  period: string;
};

export type FinanceState = {
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  goals: FinanceGoal[];
  budgets: Budget[];
};

export type BudgetAlert = {
  category: string;
  spent: number;
  limit: number;
  usage: number;
  status: 'safe' | 'watch' | 'over';
};

export type GoalProgress = {
  title: string;
  progress: number;
  remaining: number;
  deadline: string;
};

export type FinanceOverview = {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  assetValue: number;
  liabilityValue: number;
  netWorth: number;
  savingsRate: number;
  transactionCount: number;
  budgetAlerts: BudgetAlert[];
  goalProgress: GoalProgress[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isInPeriod(date: string, period: string): boolean {
  return date.startsWith(period);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateFinanceOverview(state: FinanceState, period: string): FinanceOverview {
  const periodTransactions = state.transactions.filter((transaction) => isInPeriod(transaction.date, period));
  const monthlyIncome = sum(
    periodTransactions.filter((transaction) => transaction.type === 'income').map((transaction) => transaction.amount)
  );
  const monthlyExpense = sum(
    periodTransactions.filter((transaction) => transaction.type === 'expense').map((transaction) => transaction.amount)
  );
  const monthlyBalance = monthlyIncome - monthlyExpense;
  const assetValue = sum(state.assets.map((asset) => asset.value));
  const liabilityValue = sum(state.liabilities.map((liability) => liability.balance));
  const netWorth = assetValue - liabilityValue;
  const savingsRate = monthlyIncome > 0 ? (monthlyBalance / monthlyIncome) * 100 : 0;
  const budgetAlerts = state.budgets
    .filter((budget) => budget.period === period)
    .map((budget) => {
      const spent = sum(
        periodTransactions
          .filter((transaction) => transaction.type === 'expense' && transaction.category === budget.category)
          .map((transaction) => transaction.amount)
      );
      const usage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      return {
        category: budget.category,
        spent: roundMoney(spent),
        limit: budget.limit,
        usage: roundPercent(usage),
        status: usage >= 100 ? 'over' : usage >= 80 ? 'watch' : 'safe'
      } satisfies BudgetAlert;
    });
  const goalProgress = state.goals.map((goal) => ({
    title: goal.title,
    progress: Math.round(clamp(goal.target > 0 ? (goal.current / goal.target) * 100 : 0, 0, 100)),
    remaining: roundMoney(Math.max(goal.target - goal.current, 0)),
    deadline: goal.deadline
  }));

  return {
    monthlyIncome: roundMoney(monthlyIncome),
    monthlyExpense: roundMoney(monthlyExpense),
    monthlyBalance: roundMoney(monthlyBalance),
    assetValue: roundMoney(assetValue),
    liabilityValue: roundMoney(liabilityValue),
    netWorth: roundMoney(netWorth),
    savingsRate: roundPercent(savingsRate),
    transactionCount: periodTransactions.length,
    budgetAlerts,
    goalProgress
  };
}

export function scoreEconomy(overview: FinanceOverview): number {
  const balanceScore = overview.monthlyBalance > 0 ? 25 : overview.monthlyBalance === 0 ? 8 : 0;
  const savingsScore = clamp(overview.savingsRate, 0, 50) * 0.6;
  const netWorthScore = overview.netWorth > 0 ? 15 : 0;
  const activityScore = clamp(overview.transactionCount * 6, 0, 18);
  const goalScore =
    overview.goalProgress.length > 0
      ? sum(overview.goalProgress.map((goal) => goal.progress)) / overview.goalProgress.length * 0.12
      : 0;

  return Math.round(clamp(balanceScore + savingsScore + netWorthScore + activityScore + goalScore, 0, 100));
}
