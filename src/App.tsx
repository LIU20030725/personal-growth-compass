import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  HelpCircle,
  HeartPulse,
  LineChart,
  LogOut,
  Medal,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Smile,
  Sparkles,
  Target,
  Trophy,
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
import { Button } from '@/components/ui/button';
import { AdventureJournalPage } from './adventure-journal/pages/AdventureJournalPage';
import { TaskBoard } from './tasks/TaskBoard';

const period = '2026-06';
const currentYear = '2026';
const releaseVersion = 'V2.0';
const releaseDate = '2026-08-01';
const propertyValue = 420000;
const liabilityValue = 2100;

type AccountGroupId = 'cash' | 'investment' | 'receivable';
type MainView = 'finance' | 'character' | 'ability' | 'body' | 'emotion' | 'quests' | 'achievements' | 'journal';

type Account = {
  id: string;
  group: AccountGroupId;
  name: string;
  balance: number;
  note: string;
  kind?: string;
  cost?: number;
  dueDate?: string;
};

type ActivityType = TransactionType | 'transfer-in' | 'transfer-out';
type ActivityPurpose = '日常支出' | '收益入账' | '账户调整' | '报销到账' | '银行卡转账' | '其他';

type AccountActivity = {
  id: string;
  accountId: string;
  type: ActivityType;
  amount: number;
  purpose: string;
  date: string;
  balanceAfter: number;
  relatedAccountName?: string;
};

type AccountGroupMeta = {
  id: AccountGroupId;
  title: string;
  addLabel: string;
  description: string;
  icon: typeof WalletCards;
};

type EntryForm = {
  accountId: string;
  type: TransactionType;
  amount: string;
  category: string;
  note: string;
  date: string;
};

type AccountForm = {
  name: string;
  balance: string;
  note: string;
  kind: string;
  cost: string;
  dueDate: string;
};

type ActivityForm = {
  type: TransactionType;
  amount: string;
  purposeType: ActivityPurpose;
  purpose: string;
  transferAccountId: string;
  date: string;
};

const accountGroups: AccountGroupMeta[] = [
  { id: 'cash', title: '资金账户', addLabel: '增加银行卡', description: '银行卡、微信钱包、公积金等现金账户', icon: WalletCards },
  { id: 'investment', title: '理财账户', addLabel: '增加账户', description: '股票、基金、港股券商、美股券商等理财账户', icon: LineChart },
  { id: 'receivable', title: '应收账款', addLabel: '增加应收款', description: '报销、借出款、项目尾款等待收资金', icon: ReceiptText }
];

const initialAccounts: Account[] = [
  { id: 'cmb', group: 'cash', name: '招商银行卡', balance: 12300, note: '主要工资卡', kind: '银行卡' },
  { id: 'wechat', group: 'cash', name: '微信钱包', balance: 820, note: '日常小额支付', kind: '微信' },
  { id: 'housing-fund', group: 'cash', name: '公积金账户', balance: 46000, note: '住房公积金', kind: '公积金' },
  { id: 'ths', group: 'investment', name: '同花顺 A 股', balance: 36000, note: 'A 股股票市值', kind: 'A股', cost: 32000 },
  { id: 'hk-broker', group: 'investment', name: '港股券商', balance: 20000, note: '港股账户市值', kind: '港股', cost: 18000 },
  { id: 'us-broker', group: 'investment', name: '美股券商', balance: 30000, note: '美股账户市值', kind: '美股', cost: 26000 },
  { id: 'fund', group: 'investment', name: '基金账户', balance: 40000, note: '指数基金与固收', kind: '基金', cost: 38000 },
  { id: 'reimburse', group: 'receivable', name: '报销待收', balance: 1500, note: '公司报销', kind: '报销', dueDate: '2026-07-10' },
  { id: 'friend-loan', group: 'receivable', name: '朋友借款', balance: 2000, note: '待归还借出款', kind: '借出款', dueDate: '2026-08-01' },
  { id: 'project-tail', group: 'receivable', name: '项目尾款', balance: 5000, note: '咨询项目尾款', kind: '项目尾款', dueDate: '2026-07-31' }
];

const initialTransactions: Transaction[] = [
  { id: 't1', type: 'income', category: '工资', amount: 12000, date: '2026-06-05', note: '六月工资', accountId: 'cmb', accountName: '招商银行卡' },
  { id: 't2', type: 'expense', category: '餐饮', amount: 860, date: '2026-06-06', note: '日常餐饮', accountId: 'wechat', accountName: '微信钱包' },
  { id: 't3', type: 'expense', category: '交通', amount: 240, date: '2026-06-10', note: '通勤', accountId: 'wechat', accountName: '微信钱包' },
  { id: 't4', type: 'income', category: '副业', amount: 1800, date: '2026-05-21', note: '咨询项目', accountId: 'cmb', accountName: '招商银行卡' },
  { id: 't5', type: 'expense', category: '娱乐', amount: 520, date: '2026-05-23', note: '电影与聚餐', accountId: 'wechat', accountName: '微信钱包' }
];

const emptyEntry: EntryForm = {
  accountId: 'cmb',
  type: 'expense',
  amount: '',
  category: '餐饮',
  note: '',
  date: '2026-06-28'
};

const emptyAccount: AccountForm = {
  name: '',
  balance: '',
  note: '',
  kind: '',
  cost: '',
  dueDate: ''
};

const emptyActivity: ActivityForm = {
  type: 'expense',
  purposeType: '日常支出',
  amount: '',
  purpose: '',
  transferAccountId: '',
  date: '2026-06-28'
};

function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${prefix}-${Date.now()}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);
}

function isActivityInflow(type: ActivityType): boolean {
  return type === 'income' || type === 'transfer-in';
}

function formatSignedCurrency(type: ActivityType, amount: number): string {
  return `${isActivityInflow(type) ? '+' : '-'}${formatCurrency(amount)}`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function buildFinanceState(accounts: Account[], transactions: Transaction[]): FinanceState {
  return {
    transactions,
    assets: [
      ...accounts.map((account) => ({
        id: account.id,
        name: account.name,
        category: account.group,
        value: account.balance
      })),
      { id: 'home-equity', name: '不动产估值', category: 'property', value: propertyValue }
    ],
    liabilities: [{ id: 'credit-card', name: '信用卡账单', category: '信用卡', balance: liabilityValue }],
    goals: [],
    budgets: []
  };
}

function getMonthlyTrend(transactions: Transaction[]): Array<{ label: string; income: number; expense: number }> {
  const days = ['06-05', '06-10', '06-15', '06-20', '06-25', '06-28'];
  return days.map((label) => {
    const date = `2026-${label}`;
    const entries = transactions.filter((item) => item.date <= date && item.date.startsWith(period));
    return {
      label,
      income: sum(entries.filter((item) => item.type === 'income').map((item) => item.amount)),
      expense: sum(entries.filter((item) => item.type === 'expense').map((item) => item.amount))
    };
  });
}

function getExpenseCategories(transactions: Transaction[]): Array<{ category: string; amount: number; share: number }> {
  const expenses = transactions.filter((item) => item.type === 'expense' && item.date.startsWith(period));
  const total = sum(expenses.map((item) => item.amount));
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

function getPieGradient(items: Array<{ share: number }>): string {
  const colors = ['#34d399', '#60a5fa', '#fbbf24', '#fb7185'];
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    cursor += item.share;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  return stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(rgba(148, 163, 184, 0.25) 0% 100%)';
}

function getCategoryColor(index: number): string {
  return ['#34d399', '#60a5fa', '#fbbf24', '#fb7185'][index % 4];
}

function getMonthlySavingsCalendar(transactions: Transaction[], year: string) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    const monthPeriod = `${year}-${month}`;
    const monthTransactions = transactions.filter((item) => item.date.startsWith(monthPeriod));
    const income = sum(monthTransactions.filter((item) => item.type === 'income').map((item) => item.amount));
    const expense = sum(monthTransactions.filter((item) => item.type === 'expense').map((item) => item.amount));
    const savings = income - expense;

    return {
      month: `${index + 1}月`,
      income,
      expense,
      savings,
      status: savings > 0 ? 'positive' : savings < 0 ? 'negative' : 'empty'
    };
  });
}

function formatMonthTitle(periodValue: string): string {
  const [year, month] = periodValue.split('-');
  return `${year}年 ${month}月`;
}

function formatMonthRange(periodValue: string): string {
  const [year, month] = periodValue.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${month}月01日 - ${month}月${String(lastDay).padStart(2, '0')}日`;
}

function summarizeActivitiesByMonth(activities: AccountActivity[]) {
  const groups = activities.reduce<Record<string, AccountActivity[]>>((result, activity) => {
    const month = activity.date.slice(0, 7);
    result[month] = [...(result[month] ?? []), activity];
    return result;
  }, {});

  return Object.entries(groups)
    .map(([month, items]) => ({
      month,
      income: sum(items.filter((item) => isActivityInflow(item.type)).map((item) => item.amount)),
      expense: sum(items.filter((item) => !isActivityInflow(item.type)).map((item) => item.amount)),
      items: items.sort((a, b) => b.date.localeCompare(a.date))
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

function groupActivitiesByDate(activities: AccountActivity[]) {
  return activities.reduce<Array<{ date: string; items: AccountActivity[] }>>((groups, activity) => {
    const existing = groups.find((group) => group.date === activity.date);
    if (existing) {
      existing.items.push(activity);
    } else {
      groups.push({ date: activity.date, items: [activity] });
    }
    return groups;
  }, []);
}

function getOperationLabels(account: Account | null) {
  if (account?.group === 'investment') {
    return { income: '盈收', expense: '亏损' };
  }
  if (account?.group === 'receivable') {
    return { income: '收回', expense: '减少' };
  }
  return { income: '收入', expense: '支出' };
}

function getMonthTransactions(transactions: Transaction[], periodValue: string) {
  const items = transactions
    .filter((transaction) => transaction.date.startsWith(periodValue))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    items,
    income: sum(items.filter((item) => item.type === 'income').map((item) => item.amount)),
    expense: sum(items.filter((item) => item.type === 'expense').map((item) => item.amount))
  };
}

function getPeriodTransactions(transactions: Transaction[], periodValue: string) {
  return transactions
    .filter((transaction) => transaction.date.startsWith(periodValue))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function MiniTrendChart({ transactions }: { transactions: Transaction[] }) {
  const points = getMonthlyTrend(transactions);
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
          <p>现金流</p>
          <h2>近 30 天收支趋势</h2>
        </div>
        <span className="pill">本月</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="近 30 天收入与支出趋势图">
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

function MonthlySavingsCalendar({
  transactions,
  onSelectMonth
}: {
  transactions: Transaction[];
  onSelectMonth: (periodValue: string) => void;
}) {
  const months = getMonthlySavingsCalendar(transactions, currentYear);
  const totalSavings = sum(months.map((item) => item.savings));
  const bestMonth = months.reduce((best, item) => (item.savings > best.savings ? item : best), months[0]);

  return (
    <section className="panel savings-calendar" aria-label={`${currentYear} 年月度存钱日历`}>
      <div className="section-heading">
        <div>
          <p>存钱日历</p>
          <h2>{currentYear} 每月结余</h2>
        </div>
        <CalendarDays size={22} />
      </div>
      <div className="calendar-summary">
        <div>
          <span>年度累计</span>
          <strong className={totalSavings >= 0 ? 'positive' : 'negative'}>{formatCurrency(totalSavings)}</strong>
        </div>
        <div>
          <span>最佳月份</span>
          <strong>{bestMonth.month}</strong>
        </div>
      </div>
      <div className="month-grid">
        {months.map((item, index) => (
          <button
            className={`month-cell ${item.status}`}
            key={item.month}
            type="button"
            onClick={() => onSelectMonth(`${currentYear}-${String(index + 1).padStart(2, '0')}`)}
          >
            <span>{item.month}</span>
            <strong>{item.savings === 0 ? '¥0' : `${item.savings > 0 ? '+' : '-'}${formatCurrency(Math.abs(item.savings))}`}</strong>
            <small>收 {formatCurrency(item.income)} / 支 {formatCurrency(item.expense)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PixelHeroAvatar({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`pixel-hero ${compact ? 'compact' : ''}`}
      viewBox="0 0 16 20"
      role="img"
      aria-label="Dice Life 像素角色"
      shapeRendering="crispEdges"
    >
      <rect x="5" y="1" width="6" height="1" className="pixel-hair" />
      <rect x="4" y="2" width="8" height="4" className="pixel-hair" />
      <rect x="5" y="4" width="6" height="4" className="pixel-skin" />
      <rect x="6" y="5" width="1" height="1" className="pixel-eye" />
      <rect x="9" y="5" width="1" height="1" className="pixel-eye" />
      <rect x="7" y="7" width="2" height="1" className="pixel-mouth" />
      <rect x="3" y="8" width="10" height="6" className="pixel-armor" />
      <rect x="1" y="9" width="3" height="5" className="pixel-skin" />
      <rect x="12" y="9" width="3" height="5" className="pixel-skin" />
      <rect x="6" y="9" width="4" height="4" className="pixel-gold" />
      <rect x="4" y="14" width="3" height="5" className="pixel-boot" />
      <rect x="9" y="14" width="3" height="5" className="pixel-boot" />
      <rect x="3" y="18" width="4" height="1" className="pixel-shadow" />
      <rect x="9" y="18" width="4" height="1" className="pixel-shadow" />
    </svg>
  );
}

const characterAttributes = [
  { label: '财富管理', value: 75, className: 'gold-fill', note: '稳定成长' },
  { label: '能力成长', value: 64, className: 'blue-fill', note: '本周 +3' },
  { label: '身体状态', value: 88, className: 'emerald-fill', note: '状态良好' },
  { label: '情绪韧性', value: 72, className: 'violet-fill', note: '保持觉察' }
];

function CharacterStatusView() {
  return (
    <section className="character-status-view" aria-label="人物状态信息表">
      <div className="character-status-hero panel">
        <div className="character-portrait-large"><PixelHeroAvatar /></div>
        <div className="character-status-copy">
          <p className="eyebrow"><Sparkles size={17} /> Character Status</p>
          <h1>人物状态</h1>
          <div className="character-name-row">
            <strong>42级 · 生活冒险家</strong>
            <span>称号：稳步前行者</span>
          </div>
          <p>把现实里的每一次行动记录成经验值，让财富、能力、身体与情绪在同一张角色表里持续升级。</p>
          <div className="level-progress" aria-label="当前等级经验值 68%">
            <span><b>LV.42</b><small>6,820 / 10,000 XP</small></span>
            <div className="xp-bar"><i style={{ width: '68%' }} /></div>
          </div>
        </div>
      </div>

      <div className="character-status-grid">
        <section className="panel status-sheet">
          <div className="section-heading">
            <div><p>Core Attributes</p><h2>核心属性</h2></div>
            <Target size={22} />
          </div>
          <div className="attribute-list">
            {characterAttributes.map((attribute) => (
              <div className="attribute-row" key={attribute.label}>
                <span><strong>{attribute.label}</strong><small>{attribute.note}</small></span>
                <b>{attribute.value}</b>
                <div className="xp-bar"><i className={attribute.className} style={{ width: `${attribute.value}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel status-sheet">
          <div className="section-heading">
            <div><p>Current Questline</p><h2>当前主线</h2></div>
            <BookOpen size={22} />
          </div>
          <div className="quest-list">
            <article><span>01</span><div><strong>建立稳定的晨间系统</strong><small>连续完成 5 / 7 天</small></div><b>+120 XP</b></article>
            <article><span>02</span><div><strong>完成本月成长复盘</strong><small>整理财富、能力与健康记录</small></div><b>+200 XP</b></article>
            <article><span>03</span><div><strong>推进年度核心项目</strong><small>本周进度 3 / 5</small></div><b>+300 XP</b></article>
          </div>
        </section>
      </div>

      <section className="panel character-table-panel">
        <div className="section-heading">
          <div><p>Adventure Record</p><h2>冒险档案</h2></div>
          <Medal size={22} />
        </div>
        <dl className="character-info-table">
          <div><dt>职业路径</dt><dd>个人成长规划师</dd></div>
          <div><dt>本周连胜</dt><dd>5 天</dd></div>
          <div><dt>已完成任务</dt><dd>128</dd></div>
          <div><dt>解锁成就</dt><dd>24 / 60</dd></div>
          <div><dt>当前章节</dt><dd>第三章 · 稳态进阶</dd></div>
          <div><dt>下个里程碑</dt><dd>LV.43 · 还需 3,180 XP</dd></div>
        </dl>
      </section>
    </section>
  );
}

const moduleViewContent: Record<Exclude<MainView, 'finance' | 'character' | 'journal'>, { eyebrow: string; title: string; description: string; items: string[] }> = {
  ability: { eyebrow: 'Ability Tree', title: '能力属性', description: '用技能树管理专业能力、通用能力与长期练习。', items: ['专业技能树', '本周练习', '能力里程碑'] },
  body: { eyebrow: 'Body Status', title: '健康状况', description: '记录睡眠、运动与身体指标，保持稳定输出。', items: ['睡眠恢复', '运动计划', '身体数据'] },
  emotion: { eyebrow: 'Mind Status', title: '情绪状态', description: '用轻量记录观察压力、能量与情绪波动。', items: ['今日情绪', '压力来源', '恢复行动'] },
  quests: { eyebrow: 'Quest Board', title: '任务', description: '组织主线、支线与每日任务，让行动直接转化为经验值。', items: ['今日任务', '本周主线', '待领取奖励'] },
  achievements: { eyebrow: 'Achievement Hall', title: '成就', description: '收藏真实进步形成的徽章、称号与人生里程碑。', items: ['最新解锁', '成就图鉴', '里程碑'] }
};

function ModuleView({ view }: { view: Exclude<MainView, 'finance' | 'character' | 'journal'> }) {
  const content = moduleViewContent[view];
  return (
    <section className="module-view panel" aria-label={`${content.title}模块`}>
      <p className="eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <div className="module-preview-grid">
        {content.items.map((item, index) => (
          <article key={item}><span>0{index + 1}</span><strong>{item}</strong><small>模块正在构建中</small></article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [accountActivities, setAccountActivities] = useState<AccountActivity[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<AccountGroupId | null>('cash');
  const [addingGroup, setAddingGroup] = useState<AccountGroupId | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [openAccountMonth, setOpenAccountMonth] = useState<string | null>(period);
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string | null>(null);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isCashflowPageOpen, setIsCashflowPageOpen] = useState(false);
  const [selectedLedgerDate, setSelectedLedgerDate] = useState('2026-06-28');
  const [entry, setEntry] = useState<EntryForm>(emptyEntry);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccount);
  const [activityForm, setActivityForm] = useState<ActivityForm>(emptyActivity);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [formError, setFormError] = useState('');
  const [activeView, setActiveView] = useState<MainView>('finance');

  const financeState = useMemo(() => buildFinanceState(accounts, transactions), [accounts, transactions]);
  const overview = useMemo(() => calculateFinanceOverview(financeState, period), [financeState]);
  const economyScore = scoreEconomy(overview);
  const expenseCategories = useMemo(() => getExpenseCategories(transactions), [transactions]);
  const groupTotal = sum(accountGroups.map((group) => sum(accounts.filter((account) => account.group === group.id).map((account) => account.balance))));
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedAccountActivities = selectedAccount
    ? accountActivities.filter((activity) => activity.accountId === selectedAccount.id)
    : [];
  const selectedAccountMonths = summarizeActivitiesByMonth(selectedAccountActivities);
  const operationLabels = getOperationLabels(selectedAccount);
  const transferTargets = selectedAccount ? accounts.filter((account) => account.id !== selectedAccount.id) : [];
  const deleteAccount = accounts.find((account) => account.id === deleteAccountId) ?? null;
  const isTransferActivity = activityForm.purposeType === '银行卡转账';
  const cashAccounts = getAccountsByGroup('cash');
  const periodTransactions = useMemo(() => getPeriodTransactions(transactions, period), [transactions]);
  const ledgerDates = useMemo(
    () => Array.from(new Set(periodTransactions.map((transaction) => transaction.date))).sort((a, b) => b.localeCompare(a)),
    [periodTransactions]
  );
  const activeLedgerDate = ledgerDates.includes(selectedLedgerDate) ? selectedLedgerDate : ledgerDates[0] ?? '';
  const activeDateTransactions = periodTransactions.filter((transaction) => transaction.date === activeLedgerDate);
  const entryAccount = accounts.find((account) => account.id === entry.accountId && account.group === 'cash') ?? null;
  const entryAmount = Number(entry.amount);
  const hasPreviewAmount = Number.isFinite(entryAmount) && entryAmount > 0;
  const entryBalanceAfter =
    entryAccount && hasPreviewAmount ? entryAccount.balance + (entry.type === 'income' ? entryAmount : -entryAmount) : null;

  function getAccountsByGroup(groupId: AccountGroupId): Account[] {
    return accounts.filter((account) => account.group === groupId);
  }

  function getGroupTotal(groupId: AccountGroupId): number {
    return sum(getAccountsByGroup(groupId).map((account) => account.balance));
  }

  function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(entry.amount);
    const selectedCashAccount = accounts.find((account) => account.id === entry.accountId && account.group === 'cash');
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('请输入大于 0 的金额');
      return;
    }
    if (!selectedCashAccount) {
      setFormError('请选择这笔现金流对应的资金账户');
      return;
    }
    if (entry.type === 'expense' && amount > selectedCashAccount.balance) {
      setFormError('支出金额不能大于所选资金账户余额');
      return;
    }

    const balanceAfter = selectedCashAccount.balance + (entry.type === 'income' ? amount : -amount);
    const transactionId = createId('transaction');
    const category = entry.category.trim() || '其他';
    const note = entry.note.trim() || category;
    setTransactions((current) => [
      {
        id: transactionId,
        type: entry.type,
        category,
        amount,
        date: entry.date,
        note,
        accountId: selectedCashAccount.id,
        accountName: selectedCashAccount.name
      },
      ...current
    ]);
    setAccountActivities((current) => [
      {
        id: `${transactionId}-account`,
        accountId: selectedCashAccount.id,
        type: entry.type,
        amount,
        purpose: note,
        date: entry.date,
        balanceAfter
      },
      ...current
    ]);
    setAccounts((current) =>
      current.map((account) =>
        account.id === selectedCashAccount.id
          ? {
              ...account,
              balance: balanceAfter
            }
          : account
      )
    );
    setExpandedGroup('cash');
    setOpenAccountMonth(entry.date.slice(0, 7));
    setEntry(emptyEntry);
    setFormError('');
    setIsEntryOpen(false);
    setSelectedLedgerDate(entry.date);
    setIsCashflowPageOpen(true);
  }

  function submitAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!addingGroup) return;
    const balance = Number(accountForm.balance);
    if (!accountForm.name.trim() || !Number.isFinite(balance) || balance < 0) {
      setFormError('请输入账户名称和不小于 0 的余额');
      return;
    }

    setAccounts((current) => [
      ...current,
      {
        id: createId('account'),
        group: addingGroup,
        name: accountForm.name.trim(),
        balance,
        note: accountForm.note.trim() || accountGroups.find((group) => group.id === addingGroup)?.title || '账户',
        kind: accountForm.kind.trim() || undefined,
        cost: accountForm.cost ? Number(accountForm.cost) : undefined,
        dueDate: accountForm.dueDate || undefined
      }
    ]);
    setExpandedGroup(addingGroup);
    setAddingGroup(null);
    setAccountForm(emptyAccount);
    setFormError('');
  }

  function submitAccountActivity(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAccount) return;
    const amount = Number(activityForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('请输入金额和这笔钱的用途');
      return;
    }

    if (activityForm.purposeType === '银行卡转账') {
      const targetAccount = accounts.find((account) => account.id === activityForm.transferAccountId);
      if (!targetAccount) {
        setFormError('请选择转入账户');
        return;
      }
      if (amount > selectedAccount.balance) {
        setFormError('转出金额不能大于当前余额');
        return;
      }

      const sourceBalanceAfter = selectedAccount.balance - amount;
      const targetBalanceAfter = targetAccount.balance + amount;
      const transferId = createId('transfer');

      setAccounts((current) =>
        current.map((account) => {
          if (account.id === selectedAccount.id) {
            return { ...account, balance: sourceBalanceAfter };
          }
          if (account.id === targetAccount.id) {
            return { ...account, balance: targetBalanceAfter };
          }
          return account;
        })
      );
      setAccountActivities((current) => [
        {
          id: `${transferId}-out`,
          accountId: selectedAccount.id,
          type: 'transfer-out',
          amount,
          purpose: `银行卡转账至 ${targetAccount.name}`,
          date: activityForm.date,
          balanceAfter: sourceBalanceAfter,
          relatedAccountName: targetAccount.name
        },
        {
          id: `${transferId}-in`,
          accountId: targetAccount.id,
          type: 'transfer-in',
          amount,
          purpose: `银行卡转账自 ${selectedAccount.name}`,
          date: activityForm.date,
          balanceAfter: targetBalanceAfter,
          relatedAccountName: selectedAccount.name
        },
        ...current
      ]);
      setOpenAccountMonth(activityForm.date.slice(0, 7));
      setActivityForm(emptyActivity);
      setFormError('');
      return;
    }

    const purposeText = activityForm.purpose.trim() || activityForm.purposeType;
    const balanceAfter = selectedAccount.balance + (activityForm.type === 'income' ? amount : -amount);
    const nextActivity: AccountActivity = {
      id: createId('activity'),
      accountId: selectedAccount.id,
      type: activityForm.type,
      amount,
      purpose: purposeText,
      date: activityForm.date,
      balanceAfter
    };

    setAccountActivities((current) => [nextActivity, ...current]);
    setOpenAccountMonth(nextActivity.date.slice(0, 7));
    setAccounts((current) =>
      current.map((account) =>
        account.id === selectedAccount.id
          ? {
              ...account,
              balance: balanceAfter
            }
          : account
      )
    );
    setTransactions((current) => [
      {
        id: createId('transaction'),
        type: activityForm.type,
        category: selectedAccount.name,
        amount,
        date: activityForm.date,
        note: purposeText,
        accountId: selectedAccount.id,
        accountName: selectedAccount.name
      },
      ...current
    ]);
    setActivityForm(emptyActivity);
    setFormError('');
  }

  function confirmDeleteAccount() {
    if (!deleteAccount) return;
    const remainingAccounts = accounts.filter((account) => account.id !== deleteAccount.id);
    setAccounts(remainingAccounts);
    setTransactions((current) => current.filter((transaction) => transaction.accountId !== deleteAccount.id));
    setAccountActivities((current) => current.filter((activity) => activity.accountId !== deleteAccount.id));
    setEntry((current) =>
      current.accountId === deleteAccount.id
        ? { ...current, accountId: remainingAccounts.find((account) => account.group === 'cash')?.id ?? '' }
        : current
    );
    if (selectedAccountId === deleteAccount.id) {
      setSelectedAccountId(null);
    }
    setDeleteAccountId(null);
    setFormError('');
  }

  function startRenameAccount() {
    if (!selectedAccount) return;
    setRenameValue(selectedAccount.name);
    setFormError('');
  }

  function saveRenameAccount() {
    if (!selectedAccount) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      setFormError('请输入新的账户名称');
      return;
    }
    setAccounts((current) =>
      current.map((account) => (account.id === selectedAccount.id ? { ...account, name: nextName } : account))
    );
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.accountId === selectedAccount.id ? { ...transaction, accountName: nextName } : transaction
      )
    );
    setRenameValue('');
    setFormError('');
  }

  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="app-header" aria-label="全局导航">
        <button className="brand-mark" type="button" onClick={() => setActiveView('finance')} aria-label="Dice Life 首页">
          <strong>Dice Life</strong>
          <span className="brand-die" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </button>
        <nav className="top-nav" aria-label="主导航">
          <button className={activeView === 'quests' ? 'active' : ''} type="button" onClick={() => setActiveView('quests')}>任务</button>
          <button className={activeView === 'achievements' ? 'active' : ''} type="button" onClick={() => setActiveView('achievements')}>成就</button>
          <button className={activeView === 'journal' ? 'active' : ''} type="button" onClick={() => setActiveView('journal')}>冒险日志</button>
        </nav>
        <div className="header-tools">
          <button className="round-tool" type="button" aria-label="通知"><Bell size={20} /></button>
          <button className="round-tool" type="button" aria-label="设置"><Settings size={20} /></button>
          <div className="avatar-badge" aria-label="角色头像">42</div>
        </div>
      </header>

      <aside className="app-sidebar" aria-label="角色与模块导航">
        <button
          className={`character-card ${activeView === 'character' ? 'active' : ''}`}
          type="button"
          aria-label="打开人物状态信息表"
          aria-pressed={activeView === 'character'}
          onClick={() => setActiveView('character')}
        >
          <div className="character-emblem"><PixelHeroAvatar compact /></div>
          <h2>42级 冒险家</h2>
          <p>点击查看人物状态</p>
        </button>
        <nav className="side-nav" aria-label="系统模块">
          <button className={activeView === 'finance' ? 'active' : ''} type="button" onClick={() => setActiveView('finance')}><CircleDollarSign size={19} /> 财富状况</button>
          <button className={activeView === 'ability' ? 'active' : ''} type="button" onClick={() => setActiveView('ability')}><Brain size={19} /> 能力属性</button>
          <button className={activeView === 'body' ? 'active' : ''} type="button" onClick={() => setActiveView('body')}><HeartPulse size={19} /> 健康状况</button>
          <button className={activeView === 'emotion' ? 'active' : ''} type="button" onClick={() => setActiveView('emotion')}><Smile size={19} /> 情绪状态</button>
        </nav>
        <section className="hero-stats" aria-label="英雄属性">
          <div className="hero-stats-title"><span>英雄属性</span><Trophy size={16} /></div>
          <div className="xp-row">
            <span>财富</span>
            <div className="xp-bar"><i style={{ width: '75%' }} /></div>
          </div>
          <div className="xp-row">
            <span>健康度</span>
            <div className="xp-bar"><i className="emerald-fill" style={{ width: '88%' }} /></div>
          </div>
          <div className="xp-row">
            <span>情绪</span>
            <div className="xp-bar"><i className="ruby-fill" style={{ width: '45%' }} /></div>
          </div>
        </section>
        <div className="sidebar-footer">
          <a href="#help"><HelpCircle size={18} /> 帮助</a>
          <a href="#logout"><LogOut size={18} /> 登出</a>
        </div>
      </aside>

      <main className="app-shell" id="main-content" tabIndex={-1}>
      {activeView === 'finance' ? (
      <>
      <section className="hero-panel wealth-hero">
        <div className="hero-copy">
          <div className="eyebrow"><CircleDollarSign size={18} /> 经济系统 · {releaseVersion} · {releaseDate}</div>
          <h1>净资产</h1>
          <strong className="net-worth-value">{formatCurrency(overview.netWorth)}</strong>
          <p>净资产 = 资金账户 + 理财账户 + 应收账款 + 不动产估值 - 负债。账户下拉页可以新增账户，点击账户进入子页面记录收入或支出。</p>
        </div>
        <div className="score-card" aria-label={`经济评分 ${economyScore} 分`}>
          <span>经济评分</span>
          <strong>{economyScore}</strong>
          <small>由现金流、账户资产和本月储蓄率计算</small>
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
          <small>所有账户收入流水</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon expense"><ArrowDownRight size={22} /></div>
          <span>本月支出</span>
          <strong aria-label="本月支出金额">{formatCurrency(overview.monthlyExpense)}</strong>
          <small>所有账户支出流水</small>
        </article>
        <article className="metric-card">
          <div className="metric-icon balance"><PiggyBank size={22} /></div>
          <span>本月结余</span>
          <strong>{formatCurrency(overview.monthlyBalance)}</strong>
          <small>储蓄率 {overview.savingsRate}%</small>
        </article>
      </section>

      <section className="account-grid" aria-label="账户总览">
        {accountGroups.map((group) => {
          const Icon = group.icon;
          const isOpen = expandedGroup === group.id;
          return (
            <article className={`account-card ${isOpen ? 'open' : ''}`} key={group.id}>
              <button
                className="account-card-trigger"
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpandedGroup((current) => (current === group.id ? null : group.id))}
              >
                <span className="account-icon"><Icon size={22} /></span>
                <span className="account-copy">
                  <span>{group.title}</span>
                  <strong>{formatCurrency(getGroupTotal(group.id))}</strong>
                  <small>{group.description}</small>
                </span>
                <ChevronDown className="chevron" size={20} />
              </button>

              {isOpen ? (
                <div className="account-list">
                  {getAccountsByGroup(group.id).map((account) => (
                    <div className="account-row" key={account.id}>
                      <button
                        className="account-row-main"
                        type="button"
                        onClick={() => setSelectedAccountId(account.id)}
                        aria-label={`${account.name} ${account.note} ${formatCurrency(account.balance)} 打开账户详情`}
                      >
                        <span>
                          <strong>{account.name}</strong>
                          <small>{account.note}</small>
                        </span>
                        <b>{formatCurrency(account.balance)}</b>
                      </button>
                      <Button
                        variant="glassDestructive"
                        size="icon"
                        type="button"
                        aria-label="删除此账户"
                        title={`删除${account.name}`}
                        onClick={() => setDeleteAccountId(account.id)}
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  ))}
                  <button className="add-account-button" type="button" onClick={() => { setAddingGroup(group.id); setFormError(''); }}>
                    <Plus size={18} /> {group.addLabel}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="cashflow-log panel" aria-label="本月收入支出">
        <button className="cashflow-log-header" type="button" onClick={() => setIsCashflowPageOpen(true)}>
          <span>
            <small>Income & Expense</small>
            <strong>本月收入支出</strong>
          </span>
          <span className="cashflow-log-summary">
            <b>{periodTransactions.length} 笔</b>
            <small>收入 {formatCurrency(overview.monthlyIncome)} / 支出 {formatCurrency(overview.monthlyExpense)}</small>
          </span>
          <BarChart3 size={22} />
        </button>
      </section>

      <MonthlySavingsCalendar transactions={transactions} onSelectMonth={setSelectedCalendarMonth} />
      </>
      ) : activeView === 'character' ? (
        <CharacterStatusView />
      ) : activeView === 'quests' ? (
        <TaskBoard />
      ) : activeView === 'journal' ? (
        <AdventureJournalPage />
      ) : (
        <ModuleView view={activeView} />
      )}

      {isCashflowPageOpen ? (
        <div className="sheet-backdrop cashflow-page-backdrop" role="presentation" onClick={() => setIsCashflowPageOpen(false)}>
          <section className="cashflow-page" role="dialog" aria-label="本月收入支出详情" onClick={(event) => event.stopPropagation()}>
            <div className="cashflow-page-topbar">
              <button className="icon-button" type="button" aria-label="关闭本月收入支出详情" onClick={() => setIsCashflowPageOpen(false)}>
                <X size={20} />
              </button>
              <div>
                <p>Income & Expense</p>
                <h2>本月收入支出</h2>
              </div>
              <button className="secondary-action" type="button" onClick={() => setIsEntryOpen(true)}>
                <Plus size={18} /> 记一笔
              </button>
            </div>

            <div className="cashflow-filter-bar">
              <label className="ledger-date-select">
                <span>{period}</span>
                <select value={activeLedgerDate} onChange={(event) => setSelectedLedgerDate(event.target.value)}>
                  {ledgerDates.map((date) => (
                    <option value={date} key={date}>{date}</option>
                  ))}
                </select>
              </label>
              <span>资金账户</span>
              <span>按金额</span>
              <button className="text-filter-button" type="button">筛选</button>
            </div>

            <div className="cashflow-page-grid">
              <aside className="cashflow-analysis-panel">
                <div
                  className="expense-pie"
                  role="img"
                  aria-label="本月支出去向饼图"
                  style={{ background: getPieGradient(expenseCategories) }}
                >
                  <span>支出</span>
                  <strong>{formatCurrency(overview.monthlyExpense)}</strong>
                </div>
                <div className="analysis-summary-grid" aria-label="本月收支分析">
                  <div>
                    <span>总收入</span>
                    <strong className="income">{formatCurrency(overview.monthlyIncome)}</strong>
                  </div>
                  <div>
                    <span>总支出</span>
                    <strong className="expense">{formatCurrency(overview.monthlyExpense)}</strong>
                  </div>
                  <div>
                    <span>本月结余</span>
                    <strong>{formatCurrency(overview.monthlyBalance)}</strong>
                  </div>
                  <div>
                    <span>储蓄率</span>
                    <strong>{overview.savingsRate}%</strong>
                  </div>
                </div>
                <div className="category-list pie-legend">
                  {expenseCategories.map((item, index) => (
                    <div className="category-row" key={item.category}>
                      <div className="category-topline">
                        <strong><i style={{ background: getCategoryColor(index) }} /> {item.category}</strong>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                      <small>{item.share}% 的本月支出</small>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="ledger-day-panel" aria-label="每日收支记录">
                <div className="ledger-day-heading">
                  <span>{activeLedgerDate || '暂无日期'}</span>
                  <strong>{activeDateTransactions.length} 笔记录</strong>
                </div>
                <div className="cashflow-record-list" role="region" aria-label="本月收入支出记录明细">
                  {activeDateTransactions.length > 0 ? (
                    activeDateTransactions.map((transaction) => (
                      <div className="cashflow-record-row" key={transaction.id}>
                        <span>
                          <strong>{transaction.note || transaction.category}</strong>
                          <small>
                            {transaction.accountName || '未绑定账户'} · {transaction.date} · {transaction.category}
                          </small>
                        </span>
                        <b className={transaction.type}>{formatSignedCurrency(transaction.type, transaction.amount)}</b>
                      </div>
                    ))
                  ) : (
                    <p className="hint">这一天还没有收入或支出记录。</p>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {isEntryOpen ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setIsEntryOpen(false)}>
          <form className="entry-sheet" onSubmit={submitEntry} aria-label="快速记账表单" onClick={(event) => event.stopPropagation()}>
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
              <span>资金账户</span>
              <select
                value={entry.accountId}
                onChange={(event) => setEntry((current) => ({ ...current, accountId: event.target.value }))}
              >
                {cashAccounts.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name} · {formatCurrency(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>金额</span>
              <input inputMode="decimal" value={entry.amount} onChange={(event) => setEntry((current) => ({ ...current, amount: event.target.value }))} />
            </label>
            {entryAccount ? (
              <div className="balance-preview" aria-label="资金账户余额预览">
                <span>{entryAccount.name}</span>
                <strong>{formatCurrency(entryAccount.balance)}</strong>
                {entryBalanceAfter !== null ? (
                  <small className={entryBalanceAfter >= entryAccount.balance ? 'income' : 'expense'}>
                    {entry.type === 'income' ? '入账后余额' : '扣除后余额'}：{formatCurrency(entryBalanceAfter)}
                  </small>
                ) : (
                  <small>输入金额后预览余额变化</small>
                )}
              </div>
            ) : null}
            <label className="field">
              <span>分类</span>
              <input value={entry.category} onChange={(event) => setEntry((current) => ({ ...current, category: event.target.value }))} />
            </label>
            <label className="field">
              <span>日期</span>
              <input type="date" value={entry.date} onChange={(event) => setEntry((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label className="field">
              <span>备注</span>
              <input value={entry.note} onChange={(event) => setEntry((current) => ({ ...current, note: event.target.value }))} />
            </label>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <button className="primary-action full" type="submit">保存记录</button>
          </form>
        </div>
      ) : null}

      {addingGroup ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setAddingGroup(null)}>
          <form className="entry-sheet" onSubmit={submitAccount} aria-label="新增账户表单" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div>
                <p>{accountGroups.find((group) => group.id === addingGroup)?.title}</p>
                <h2>{accountGroups.find((group) => group.id === addingGroup)?.addLabel}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="关闭新增账户" onClick={() => setAddingGroup(null)}>
                <X size={20} />
              </button>
            </div>
            <label className="field">
              <span>账户名称</span>
              <input value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如 招商银行卡 / 港股券商" />
            </label>
            <label className="field">
              <span>当前余额</span>
              <input inputMode="decimal" value={accountForm.balance} onChange={(event) => setAccountForm((current) => ({ ...current, balance: event.target.value }))} placeholder="例如 3000" />
            </label>
            <label className="field">
              <span>{addingGroup === 'investment' ? '账户类型' : addingGroup === 'receivable' ? '应收类型' : '账户类型'}</span>
              <select value={accountForm.kind} onChange={(event) => setAccountForm((current) => ({ ...current, kind: event.target.value }))}>
                <option value="">请选择</option>
                {addingGroup === 'cash' ? (
                  <>
                    <option value="银行卡">银行卡</option>
                    <option value="微信">微信</option>
                    <option value="支付宝">支付宝</option>
                    <option value="公积金">公积金</option>
                    <option value="现金">现金</option>
                  </>
                ) : null}
                {addingGroup === 'investment' ? (
                  <>
                    <option value="A股">A股</option>
                    <option value="港股">港股</option>
                    <option value="美股">美股</option>
                    <option value="基金">基金</option>
                    <option value="经营投资">经营投资</option>
                  </>
                ) : null}
                {addingGroup === 'receivable' ? (
                  <>
                    <option value="报销">报销</option>
                    <option value="借出款">借出款</option>
                    <option value="项目尾款">项目尾款</option>
                    <option value="其他应收">其他应收</option>
                  </>
                ) : null}
              </select>
            </label>
            {addingGroup === 'investment' ? (
              <label className="field">
                <span>成本金额</span>
                <input inputMode="decimal" value={accountForm.cost} onChange={(event) => setAccountForm((current) => ({ ...current, cost: event.target.value }))} placeholder="例如 26000" />
              </label>
            ) : null}
            {addingGroup === 'receivable' ? (
              <label className="field">
                <span>预计到账日期</span>
                <input type="date" value={accountForm.dueDate} onChange={(event) => setAccountForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>
            ) : null}
            <label className="field">
              <span>备注</span>
              <input value={accountForm.note} onChange={(event) => setAccountForm((current) => ({ ...current, note: event.target.value }))} placeholder="这是什么账户" />
            </label>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <button className="primary-action full" type="submit">保存账户</button>
          </form>
        </div>
      ) : null}

      {deleteAccount ? (
        <div className="sheet-backdrop confirm-backdrop" role="presentation" onClick={() => setDeleteAccountId(null)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-label="是否删除此账户信息？" onClick={(event) => event.stopPropagation()}>
            <h2>是否删除此账户信息？</h2>
            <p>{deleteAccount.name} 的账户信息和该账户关联流水会一起删除。</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteAccountId(null)}>
                否
              </button>
              <button className="danger-action" type="button" onClick={confirmDeleteAccount}>
                是
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedCalendarMonth ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedCalendarMonth(null)}>
          <div className="entry-sheet account-detail-sheet" role="dialog" aria-label="月份收支来源" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div>
                <p>月度来源</p>
                <h2>{formatMonthTitle(selectedCalendarMonth)}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="关闭月份详情" onClick={() => setSelectedCalendarMonth(null)}>
                <X size={20} />
              </button>
            </div>
            {(() => {
              const month = getMonthTransactions(transactions, selectedCalendarMonth);
              return (
                <>
                  <div className="month-source-summary">
                    <div>
                      <span>总收入</span>
                      <strong className="income">{formatCurrency(month.income)}</strong>
                    </div>
                    <div>
                      <span>总支出</span>
                      <strong className="expense">{formatCurrency(month.expense)}</strong>
                    </div>
                  </div>
                  <div className="monthly-bill-detail expanded">
                    {month.items.length > 0 ? (
                      month.items.map((transaction) => (
                        <div className="monthly-bill-row" key={transaction.id}>
                          <span>
                            <strong>{transaction.note || transaction.category}</strong>
                            <small>{transaction.date} · {transaction.category}</small>
                          </span>
                          <b className={transaction.type}>{formatSignedCurrency(transaction.type, transaction.amount)}</b>
                        </div>
                      ))
                    ) : (
                      <p className="hint">这个月份还没有收入或支出来源。</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {selectedAccount ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedAccountId(null)}>
          <form className="entry-sheet account-detail-sheet" onSubmit={submitAccountActivity} aria-label="账户详情表单" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div>
                <p>账户详情</p>
                {renameValue ? (
                  <div className="rename-row">
                    <input
                      aria-label="新的账户名称"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                    />
                    <button className="secondary-action compact" type="button" onClick={saveRenameAccount}>
                      保存
                    </button>
                    <button className="icon-button" type="button" aria-label="取消重命名" onClick={() => setRenameValue('')}>
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="account-title-row">
                    <h2>{selectedAccount.name}</h2>
                    <button className="icon-button" type="button" aria-label={`重命名${selectedAccount.name}`} onClick={startRenameAccount}>
                      <Pencil size={18} />
                    </button>
                  </div>
                )}
              </div>
              <button className="icon-button" type="button" aria-label="关闭账户详情" onClick={() => setSelectedAccountId(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="account-balance-panel">
              <span>当前余额</span>
              <strong>{formatCurrency(selectedAccount.balance)}</strong>
              <small>
                {[selectedAccount.kind, selectedAccount.note, selectedAccount.cost ? `成本 ${formatCurrency(selectedAccount.cost)}` : '', selectedAccount.dueDate ? `预计到账 ${selectedAccount.dueDate}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </div>
            <fieldset className="segmented">
              <legend>记录类型</legend>
              {(['expense', 'income'] as TransactionType[]).map((type) => (
                <label key={type} className={activityForm.type === type ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="account-entry-type"
                    value={type}
                    checked={activityForm.type === type}
                    onChange={() => setActivityForm((current) => ({ ...current, type }))}
                  />
                  {type === 'expense' ? operationLabels.expense : operationLabels.income}
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span>金额</span>
              <input inputMode="decimal" value={activityForm.amount} onChange={(event) => setActivityForm((current) => ({ ...current, amount: event.target.value }))} placeholder="例如 128" />
            </label>
            <label className="field">
              <span>用途分析</span>
              <select
                value={activityForm.purposeType}
                onChange={(event) =>
                  setActivityForm((current) => ({
                    ...current,
                    purposeType: event.target.value as ActivityPurpose,
                    transferAccountId: event.target.value === '银行卡转账' ? current.transferAccountId : ''
                  }))
                }
              >
                <option value="日常支出">日常支出</option>
                <option value="收益入账">收益入账</option>
                <option value="账户调整">账户调整</option>
                <option value="报销到账">报销到账</option>
                <option value="银行卡转账">银行卡转账</option>
                <option value="其他">其他</option>
              </select>
            </label>
            {isTransferActivity ? (
              <label className="field">
                <span>转入账户</span>
                <select
                  value={activityForm.transferAccountId}
                  onChange={(event) => setActivityForm((current) => ({ ...current, transferAccountId: event.target.value }))}
                >
                  <option value="">请选择账户</option>
                  {transferTargets.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name} · {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>用途说明</span>
                <input
                  value={activityForm.purpose}
                  onChange={(event) => setActivityForm((current) => ({ ...current, purpose: event.target.value }))}
                  placeholder="例如 工资补发 / 充电话费"
                />
              </label>
            )}
            <label className="field">
              <span>日期</span>
              <input type="date" value={activityForm.date} onChange={(event) => setActivityForm((current) => ({ ...current, date: event.target.value }))} />
            </label>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <button className="primary-action full" type="submit">保存账户记录</button>
            <div className="monthly-bill-list" aria-label="账户月度流水记录">
              {selectedAccountMonths.length > 0 ? (
                selectedAccountMonths.map((month) => {
                  const isOpen = openAccountMonth === month.month;
                  return (
                    <section className="monthly-bill-card" key={month.month}>
                      <button className="monthly-bill-header" type="button" onClick={() => setOpenAccountMonth(isOpen ? null : month.month)}>
                        <span>
                          <strong>{formatMonthTitle(month.month)}</strong>
                          <small>{formatMonthRange(month.month)}</small>
                        </span>
                        <span className="monthly-bill-total">
                          <b className="expense">流出: {formatCurrency(month.expense)}</b>
                          <b className="income">流入: {formatCurrency(month.income)}</b>
                        </span>
                        <ChevronDown className={isOpen ? 'chevron open' : 'chevron'} size={20} />
                      </button>
                      {isOpen ? (
                        <div className="monthly-bill-detail">
                          {groupActivitiesByDate(month.items).map((dateGroup) => (
                            <div className="bill-date-group" key={dateGroup.date}>
                              <small>{dateGroup.date}</small>
                              {dateGroup.items.map((activity) => (
                                <div className="monthly-bill-row" key={activity.id}>
                                  <span>
                                    <strong>{activity.purpose}</strong>
                                    <small>
                                      {activity.relatedAccountName ? `关联账户: ${activity.relatedAccountName} · ` : ''}
                                      余额: {formatCurrency(activity.balanceAfter)}
                                    </small>
                                  </span>
                                  <b className={isActivityInflow(activity.type) ? 'income' : 'expense'}>{formatSignedCurrency(activity.type, activity.amount)}</b>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })
              ) : (
                <p className="hint">这个账户还没有单独流水。</p>
              )}
            </div>
          </form>
        </div>
      ) : null}
      </main>
    </>
  );
}
