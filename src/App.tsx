import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  LineChart,
  PiggyBank,
  Plus,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Target,
  Trash2,
  WalletCards,
  X
} from 'lucide-react';
import {
  calculateFinanceOverview,
  scoreEconomy,
  type FinanceState,
  type Transaction,
  type TransactionType
} from './finance/financeEngine';

const period = '2026-06';

const initialFinanceState: FinanceState = {
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
  liabilities: [{ id: 'l1', name: '信用卡账单', category: '信用卡', balance: 2100 }],
  goals: [{ id: 'g1', title: '应急金 30000', target: 30000, current: 16800, deadline: '2026-09-30' }],
  budgets: [{ id: 'b1', category: '餐饮', limit: 1500, period }]
};

const modules = [
  { title: '收入管理', text: '工资、副业、奖金与其他现金流', icon: ArrowUpRight, tone: 'green' },
  { title: '支出管理', text: '分类预算、消费复盘与异常提醒', icon: ArrowDownRight, tone: 'red' },
  { title: '投资管理', text: '成本、市值、收益率与组合占比', icon: LineChart, tone: 'blue' },
  { title: '资产负债', text: '现金、实物资产、信用卡与净资产', icon: Landmark, tone: 'amber' }
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);
}

function formatSignedCurrency(transaction: Transaction): string {
  const sign = transaction.type === 'income' ? '+' : '-';
  return `${sign}${formatCurrency(transaction.amount)}`;
}

function getMonthlyTrend(state: FinanceState): Array<{ label: string; income: number; expense: number }> {
  const days = ['06-05', '06-10', '06-15', '06-20', '06-25', '06-28'];
  return days.map((label) => {
    const date = `2026-${label}`;
    const entries = state.transactions.filter((item) => item.date <= date && item.date.startsWith(period));
    return {
      label,
      income: entries.filter((item) => item.type === 'income').reduce((total, item) => total + item.amount, 0),
      expense: entries.filter((item) => item.type === 'expense').reduce((total, item) => total + item.amount, 0)
    };
  });
}

function getExpenseCategories(state: FinanceState): Array<{ category: string; amount: number; share: number }> {
  const expenses = state.transactions.filter((item) => item.type === 'expense' && item.date.startsWith(period));
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const byCategory = expenses.reduce<Record<string, number>>((groups, item) => {
    groups[item.category] = (groups[item.category] ?? 0) + item.amount;
    return groups;
  }, {});

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      share: total > 0 ? Math.round((amount / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
}

function MiniTrendChart({ state }: { state: FinanceState }) {
  const points = getMonthlyTrend(state);
  const maxValue = Math.max(...points.flatMap((point) => [point.income, point.expense]), 1);
  const width = 520;
  const height = 220;
  const padding = 28;

  const toPolyline = (key: 'income' | 'expense') =>
    points
      .map((point, index) => {
        const x = padding + (index * (width - padding * 2)) / (points.length - 1);
        const y = height - padding - (point[key] / maxValue) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div className="chart-card panel">
      <div className="section-heading">
        <div>
          <p>收支趋势</p>
          <h2>近 30 天现金流</h2>
        </div>
        <span className="pill">本月</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="近 30 天收入与支出趋势图">
        <defs>
          <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1={padding}
            x2={width - padding}
            y1={padding + row * 48}
            y2={padding + row * 48}
            className="chart-grid"
          />
        ))}
        <polyline points={toPolyline('income')} fill="none" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
        <polyline
          points={toPolyline('expense')}
          fill="none"
          stroke="#fb7185"
          strokeDasharray="8 8"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <div className="legend" aria-label="图例">
        <span><i className="legend-income" />累计收入</span>
        <span><i className="legend-expense" />累计支出</span>
      </div>
    </div>
  );
}

type EntryForm = {
  type: TransactionType;
  amount: string;
  category: string;
  note: string;
  date: string;
};

const emptyEntry: EntryForm = {
  type: 'expense',
  amount: '',
  category: '餐饮',
  note: '',
  date: '2026-06-28'
};

export default function App() {
  const [financeState, setFinanceState] = useState<FinanceState>(initialFinanceState);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [entry, setEntry] = useState<EntryForm>(emptyEntry);
  const [formError, setFormError] = useState('');
  const [deletedTransaction, setDeletedTransaction] = useState<Transaction | null>(null);
  const overview = useMemo(() => calculateFinanceOverview(financeState, period), [financeState]);
  const economyScore = scoreEconomy(overview);
  const expenseCategories = useMemo(() => getExpenseCategories(financeState), [financeState]);
  const latestTransactions = [...financeState.transactions]
    .filter((item) => item.date.startsWith('2026-06'))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const budget = overview.budgetAlerts[0];
  const goal = overview.goalProgress[0];

  function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('请输入大于 0 的金额');
      return;
    }
    const transaction: Transaction = {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `t-${Date.now()}`,
      type: entry.type,
      category: entry.category.trim() || '其他',
      amount,
      date: entry.date,
      note: entry.note.trim() || entry.category
    };

    setFinanceState((current) => ({
      ...current,
      transactions: [transaction, ...current.transactions]
    }));
    setEntry(emptyEntry);
    setFormError('');
    setIsEntryOpen(false);
  }

  function deleteTransaction(transaction: Transaction) {
    setDeletedTransaction(transaction);
    setFinanceState((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transaction.id)
    }));
  }

  function undoDelete() {
    if (!deletedTransaction) {
      return;
    }

    setFinanceState((current) => ({
      ...current,
      transactions: [deletedTransaction, ...current.transactions]
    }));
    setDeletedTransaction(null);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow"><CircleDollarSign size={18} /> 经济系统</div>
          <h1>经济系统：个人财务驾驶舱</h1>
          <p>记录每一笔现金流，追踪净资产、预算和经济目标，让金钱系统成为人生游戏里的稳定增益。</p>
        </div>
        <div className="score-card" aria-label={`经济评分 ${economyScore} 分`}>
          <span>经济评分</span>
          <strong>{economyScore}</strong>
          <small>对标成熟记账产品的月度健康度</small>
        </div>
        <button className="primary-action" type="button" onClick={() => setIsEntryOpen(true)}>
          <Plus size={20} /> 记一笔
        </button>
      </section>

      <section className="metric-grid" aria-label="经济关键指标">
        <article className="metric-card">
          <div className="metric-icon income"><ArrowUpRight size={22} /></div>
          <span>本月收入</span>
          <strong>{formatCurrency(overview.monthlyIncome)}</strong>
          <small>工资与主动收入</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon expense"><ArrowDownRight size={22} /></div>
          <span>本月支出</span>
          <strong aria-label="本月支出金额">{formatCurrency(overview.monthlyExpense)}</strong>
          <small>预算使用 {budget ? `${budget.usage}%` : '0%'}</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon balance"><PiggyBank size={22} /></div>
          <span>本月结余</span>
          <strong>{formatCurrency(overview.monthlyBalance)}</strong>
          <small>储蓄率 {overview.savingsRate}%</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon asset"><WalletCards size={22} /></div>
          <span>净资产</span>
          <strong>{formatCurrency(overview.netWorth)}</strong>
          <small>资产 {formatCurrency(overview.assetValue)} / 负债 {formatCurrency(overview.liabilityValue)}</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <MiniTrendChart state={financeState} />

        <aside className="right-stack">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p>预算守卫</p>
                <h2>{budget?.category ?? '本月预算'}</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <div className="progress-row">
              <span>{formatCurrency(budget?.spent ?? 0)}</span>
              <span>{formatCurrency(budget?.limit ?? 0)}</span>
            </div>
            <div className="progress-track" aria-label="餐饮预算进度">
              <span style={{ width: `${budget?.usage ?? 0}%` }} />
            </div>
            <p className="hint">低于 80% 属于安全区，超过 100% 会触发红色预警。</p>
          </div>

          <div className="panel">
            <div className="section-heading">
              <div>
                <p>目标契约</p>
                <h2>{goal?.title ?? '暂无目标'}</h2>
              </div>
              <Target size={22} />
            </div>
            <strong className="big-number">{goal?.progress ?? 0}%</strong>
            <div className="progress-track goal" aria-label="目标进度">
              <span style={{ width: `${goal?.progress ?? 0}%` }} />
            </div>
            <p className="hint">还差 {formatCurrency(goal?.remaining ?? 0)}，截止 {goal?.deadline ?? '-'}</p>
          </div>
        </aside>
      </section>

      <section className="lower-grid">
        <div className="left-stack">
          <div className="module-grid" aria-label="经济模块入口">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button className={`module-card ${module.tone}`} type="button" key={module.title}>
                  <Icon size={26} />
                  <strong>{module.title}</strong>
                  <span>{module.text}</span>
                </button>
              );
            })}
          </div>

          <div className="panel category-panel" role="region" aria-label="分类洞察">
            <div className="section-heading">
              <div>
                <p>分类洞察</p>
                <h2>支出去向</h2>
              </div>
              <BarChart3 size={22} />
            </div>
            <div className="category-list">
              {expenseCategories.map((item) => (
                <div className="category-row" key={item.category}>
                  <div className="category-topline">
                    <strong>{item.category}</strong>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="category-meter" aria-label={`${item.category} 支出占比 ${item.share}%`}>
                    <span style={{ width: `${item.share}%` }} />
                  </div>
                  <small>{item.share}% 的本月支出</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel transactions">
          <div className="section-heading">
            <div>
              <p>最近记录</p>
              <h2>本月动态</h2>
            </div>
            <ReceiptText size={22} />
          </div>
          {latestTransactions.length > 0 ? (
            <ul>
              {latestTransactions.map((transaction) => (
                <li key={transaction.id}>
                  <div>
                    <span>{transaction.note || transaction.category}</span>
                    <small><CalendarDays size={14} /> {transaction.date} · {transaction.category}</small>
                  </div>
                  <div className="transaction-actions">
                    <strong className={transaction.type}>{formatSignedCurrency(transaction)}</strong>
                    <button
                      className="delete-button"
                      type="button"
                      aria-label={`删除 ${transaction.note || transaction.category}`}
                      onClick={() => deleteTransaction(transaction)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <BarChart3 size={32} />
              <p>还没有经济记录，先添加一笔收入或支出。</p>
            </div>
          )}
        </div>
      </section>

      {deletedTransaction ? (
        <div className="undo-toast" role="status" aria-live="polite">
          <span>已删除一笔记录</span>
          <button type="button" onClick={undoDelete} aria-label="撤销删除">
            <RotateCcw size={16} /> 撤销
          </button>
        </div>
      ) : null}

      {isEntryOpen ? (
        <div className="sheet-backdrop" role="presentation">
          <form className="entry-sheet" onSubmit={submitEntry} aria-label="快速记账表单">
            <div className="sheet-header">
              <div>
                <p>Quick Entry</p>
                <h2>记录一笔现金流</h2>
              </div>
              <button className="icon-button" type="button" aria-label="关闭记账表单" onClick={() => setIsEntryOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <fieldset className="segmented">
              <legend>记录类型</legend>
              {(['expense', 'income'] as TransactionType[]).map((type) => (
                <label key={type} className={entry.type === type ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="entry-type"
                    value={type}
                    checked={entry.type === type}
                    onChange={() => setEntry((current) => ({ ...current, type }))}
                  />
                  {type === 'expense' ? '支出' : '收入'}
                </label>
              ))}
            </fieldset>

            <label className="field">
              <span>金额</span>
              <input
                inputMode="decimal"
                value={entry.amount}
                onChange={(event) => setEntry((current) => ({ ...current, amount: event.target.value }))}
                placeholder="例如 128"
              />
            </label>
            <label className="field">
              <span>分类</span>
              <input
                value={entry.category}
                onChange={(event) => setEntry((current) => ({ ...current, category: event.target.value }))}
                placeholder="餐饮 / 工资 / 交通"
              />
            </label>
            <label className="field">
              <span>日期</span>
              <input
                type="date"
                value={entry.date}
                onChange={(event) => setEntry((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>备注</span>
              <input
                value={entry.note}
                onChange={(event) => setEntry((current) => ({ ...current, note: event.target.value }))}
                placeholder="这笔钱发生了什么"
              />
            </label>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <button className="primary-action full" type="submit">保存记录</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
