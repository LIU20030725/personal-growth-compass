import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Dumbbell,
  History,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap
} from 'lucide-react';
import { DIMENSION_LABELS } from './taskConfig';
import { buildWeeklyReviewPreview, getGoalChest, getPeriodKey } from './taskEngine';
import type {
  CompletionDraft,
  GoalDraft,
  GrowthDimension,
  LongTermGoal,
  ShortTask,
  TaskCadence,
  TaskDraft
} from './types';
import { RewardChest } from './RewardChest';
import { useTaskSystem } from './useTaskSystem';
import type { ModuleIntent } from '../today/todayIntent';
import './TaskBoard.css';

const today = () => new Date().toLocaleDateString('sv-SE');
const now = () => new Date().toISOString();

function addMonths(dateString: string, amount: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return date.toLocaleDateString('sv-SE');
}

const dimensionIcon = { wealth: CircleDollarSign, ability: Zap, health: Dumbbell };
const cadenceLabels = { daily: '每日', weekly: '每周', monthly: '每月' };
const transactionLabels = {
  'task-reward': '任务完成奖励',
  'weekly-bonus': '每周成长奖励',
  'goal-reward': '长期目标奖励',
  'adventure-spend': '冒险消耗'
};

type Dialog =
  | { type: 'goal'; goal?: LongTermGoal }
  | { type: 'task'; task?: ShortTask; goalId?: string }
  | { type: 'completion'; task: ShortTask }
  | { type: 'goal-progress'; goal: LongTermGoal }
  | { type: 'goal-completion'; goal: LongTermGoal }
  | { type: 'archive'; kind: 'goal' | 'task'; id: string; title: string }
  | { type: 'weekly-review' }
  | null;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="task-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="task-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><span className="task-kicker">DICE LIFE · QUEST SYSTEM</span><h2>{title}</h2></div>
          <button className="task-icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function GoalForm({ goal, onSubmit, onClose }: {
  goal?: LongTermGoal;
  onSubmit: (draft: GoalDraft) => void;
  onClose: () => void;
}) {
  const [dimension, setDimension] = useState<GrowthDimension>(goal?.dimension ?? 'wealth');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [meaning, setMeaning] = useState(goal?.meaning ?? '');
  const [startDate, setStartDate] = useState(goal?.startDate ?? today());
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? addMonths(today(), 6));

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ dimension, title: title.trim(), meaning: meaning.trim(), startDate, targetDate });
  }

  const chest = getGoalChest({ startDate, targetDate });
  return (
    <form className="task-form" onSubmit={submit}>
      <fieldset>
        <legend>成长维度</legend>
        <div className="task-segmented">
          {(Object.keys(DIMENSION_LABELS) as GrowthDimension[]).map((key) => (
            <button className={dimension === key ? 'active' : ''} type="button" key={key} onClick={() => setDimension(key)}>{DIMENSION_LABELS[key]}</button>
          ))}
        </div>
      </fieldset>
      <label>目标名称<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：建立 3 个月应急金" /></label>
      <label>目标意义<textarea required value={meaning} onChange={(event) => setMeaning(event.target.value)} placeholder="它会给真实生活带来什么改变？" /></label>
      <div className="task-form-grid">
        <label>开始日期<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>目标日期<input required type="date" min={addMonths(startDate, 3)} max={addMonths(startDate, 12)} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
      </div>
      <p className="task-form-note">目标周期为 3–12 个月。按计划时长固定获得{chest.label}，完成奖励 {chest.dice} 枚骰子。</p>
      <footer><button className="task-button ghost" type="button" onClick={onClose}>取消</button><button className="task-button primary" type="submit">保存长期目标</button></footer>
    </form>
  );
}

function TaskForm({ task, goals, presetGoalId, onSubmit, onClose }: {
  task?: ShortTask;
  goals: LongTermGoal[];
  presetGoalId?: string;
  onSubmit: (draft: TaskDraft) => void;
  onClose: () => void;
}) {
  const initialGoalId = task?.goalId ?? presetGoalId ?? goals[0]?.id ?? '';
  const initialGoal = goals.find((goal) => goal.id === initialGoalId);
  const [goalId, setGoalId] = useState(initialGoalId);
  const [dimension, setDimension] = useState<GrowthDimension>(task?.dimension === 'recovery' ? 'health' : task?.dimension ?? initialGoal?.dimension ?? 'wealth');
  const [title, setTitle] = useState(task?.title ?? '');
  const [standard, setStandard] = useState(task?.completionStandard ?? '');
  const [cadence, setCadence] = useState<TaskCadence>(task?.cadence ?? 'daily');
  const [targetCount, setTargetCount] = useState(task?.targetCount ?? 1);
  const [minutes, setMinutes] = useState(task?.estimatedMinutesPerOccurrence === null ? '' : String(task?.estimatedMinutesPerOccurrence ?? 20));
  const [maintenance, setMaintenance] = useState(task?.isMaintenance ?? false);

  function chooseGoal(nextId: string) {
    setGoalId(nextId);
    const linked = goals.find((goal) => goal.id === nextId);
    if (linked) setDimension(linked.dimension);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      goalId: maintenance ? null : goalId || null,
      dimension,
      title: title.trim(),
      completionStandard: standard.trim(),
      cadence: maintenance ? 'daily' : cadence,
      targetCount: maintenance || cadence === 'daily' ? 1 : Math.max(1, targetCount),
      estimatedMinutesPerOccurrence: minutes === '' ? null : Math.max(1, Number(minutes)),
      startDate: task?.startDate ?? today(),
      endDate: task?.endDate ?? null,
      verificationType: task?.verificationType ?? 'reflection',
      isMaintenance: maintenance
    });
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <label className="task-check"><input aria-label="这是每日维持型任务" type="checkbox" checked={maintenance} onChange={(event) => {
        setMaintenance(event.target.checked);
        if (event.target.checked) { setCadence('daily'); setTargetCount(1); }
      }} /><span><strong>这是每日维持型任务</strong><small>每天重新出现，每次完成生成一条独立记录；每周最多 3 枚即时骰子。</small></span></label>
      {!maintenance && <label>关联长期目标<select required value={goalId} onChange={(event) => chooseGoal(event.target.value)}>
        <option value="">请选择长期目标</option>
        {goals.map((goal) => <option key={goal.id} value={goal.id}>{DIMENSION_LABELS[goal.dimension]} · {goal.title}</option>)}
      </select></label>}
      {maintenance && <fieldset><legend>成长维度</legend><div className="task-segmented">{(Object.keys(DIMENSION_LABELS) as GrowthDimension[]).map((key) => <button className={dimension === key ? 'active' : ''} type="button" key={key} onClick={() => setDimension(key)}>{DIMENSION_LABELS[key]}</button>)}</div></fieldset>}
      <label>任务名称<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：每天阅读 20 分钟" /></label>
      <label>完成标准<textarea required value={standard} onChange={(event) => setStandard(event.target.value)} placeholder="怎样才算真正完成？请尽量可验证。" /></label>
      <div className="task-form-grid">
        <label>任务周期<select aria-label="任务周期" disabled={maintenance} value={maintenance ? 'daily' : cadence} onChange={(event) => setCadence(event.target.value as TaskCadence)}><option value="daily">每日</option><option value="weekly">每周</option><option value="monthly">每月</option></select></label>
        {!maintenance && cadence !== 'daily' && <label>{cadence === 'weekly' ? '每周' : '每月'}目标次数<input min="1" max="31" type="number" value={targetCount} onChange={(event) => setTargetCount(Number(event.target.value))} /></label>}
        <label>单次预计分钟（可不填）<input min="1" type="number" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="N/A" /></label>
      </div>
      <p className="task-form-note">普通任务达到目标次数后永久完成；只有勾选“每日维持型”的任务会在第二天重新出现。</p>
      <footer><button className="task-button ghost" type="button" onClick={onClose}>取消</button><button className="task-button primary" type="submit">保存短期任务</button></footer>
    </form>
  );
}

function CompletionForm({ task, onSubmit, onClose }: { task: ShortTask; onSubmit: (draft: CompletionDraft) => void; onClose: () => void }) {
  const [reflection, setReflection] = useState('');
  const [metric, setMetric] = useState('');
  const [link, setLink] = useState('');
  return (
    <form className="task-form" onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ taskId: task.id, completedAt: now(), reflection, metricValue: metric === '' ? null : Number(metric), evidenceLink: link });
    }}>
      <div className="task-completion-summary"><Check size={20} /><span><strong>{task.title}</strong><small>{task.completionStandard}</small></span></div>
      <label>完成复盘<textarea required value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="简单写下实际做了什么、结果如何。" /></label>
      <div className="task-form-grid">
        <label>量化结果（可选）<input type="number" value={metric} onChange={(event) => setMetric(event.target.value)} placeholder="例如 30 分钟" /></label>
        <label>证据链接（可选）<input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" /></label>
      </div>
      <p className="task-form-note">这次完成会成为独立行动记录并永久保留，也会进入本周复盘。</p>
      <footer><button className="task-button ghost" type="button" onClick={onClose}>取消</button><button className="task-button primary" type="submit">确认完成</button></footer>
    </form>
  );
}

type TaskBoardIntentProps = {
  intent?: Extract<ModuleIntent, { type: 'tasks.create' | 'tasks.complete' }> | null;
  onIntentConsumed?(): void;
};

export function TaskBoard({ intent, onIntentConsumed }: TaskBoardIntentProps = {}) {
  const system = useTaskSystem();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dimension, setDimension] = useState<GrowthDimension | 'all'>('all');
  const [goalStatus, setGoalStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [selectedGoal, setSelectedGoal] = useState<string | 'all' | 'maintenance'>('all');
  const [actionTab, setActionTab] = useState<'pending' | 'history'>('pending');
  const [chest, setChest] = useState<{ dice: number; title: string } | null>(null);
  const currentWeek = getPeriodKey('weekly', now());
  const weeklyPreview = useMemo(() => buildWeeklyReviewPreview(system.state, currentWeek), [currentWeek, system.state]);
  const activeGoals = system.state.goals.filter((goal) => goal.status === 'active');
  const visibleGoals = system.state.goals.filter((goal) => goal.status === goalStatus && (dimension === 'all' || goal.dimension === dimension));
  const pendingTasks = system.state.tasks.filter((task) => task.status === 'active' &&
    (dimension === 'all' || task.dimension === dimension) &&
    (selectedGoal === 'all' || (selectedGoal === 'maintenance' ? task.isMaintenance : task.goalId === selectedGoal)));
  const historyEntries = [...system.state.completions].reverse().filter((entry) => {
    const task = system.state.tasks.find((candidate) => candidate.id === entry.taskId);
    if (!task) return false;
    if (dimension !== 'all' && task.dimension !== dimension) return false;
    return selectedGoal === 'all' || (selectedGoal === 'maintenance' ? task.isMaintenance : task.goalId === selectedGoal);
  });
  const newWeekCompletions = weeklyPreview.newCompletionIds.map((id) => system.state.completions.find((entry) => entry.id === id)).filter(Boolean);

  useEffect(() => {
    if (!intent) return;
    if (intent.type === 'tasks.create') {
      setDialog({ type: 'task' });
    } else {
      const task = system.state.tasks.find((candidate) => candidate.id === intent.taskId && candidate.status === 'active');
      const completedToday = task && system.state.completions.some((entry) => entry.taskId === task.id && new Date(entry.completedAt).toLocaleDateString('sv-SE') === today());
      if (task && !completedToday) setDialog({ type: 'completion', task });
    }
    onIntentConsumed?.();
  }, [intent?.id]);

  function confirmArchive() {
    if (dialog?.type !== 'archive') return;
    dialog.kind === 'goal' ? system.archiveGoal(dialog.id) : system.archiveTask(dialog.id);
    setDialog(null);
  }

  function finishGoal(goal: LongTermGoal, reflection: string, evidence: string) {
    const reward = getGoalChest(goal);
    system.completeGoal(goal.id, reflection, evidence);
    setDialog(null);
    setChest({ dice: reward.dice, title: reward.label });
  }

  function settleReview() {
    const reward = weeklyPreview.claimableDice;
    system.settleWeek(currentWeek);
    setDialog(null);
    if (reward > 0) setChest({ dice: reward, title: '本周成长宝箱' });
  }

  return (
    <main className="task-board">
      <section className="task-hero">
        <div><span className="task-kicker">QUEST SYSTEM · REAL LIFE PROGRESS</span><h1>任务中心</h1><p>长期目标负责方向，普通短期任务完成后结束；只有每日维持型行动会每天重新出现。每一次真实执行都独立留档。</p></div>
        <div className="task-hero-actions">
          <div className="dice-wallet"><span>可用骰子</span><strong data-testid="dice-balance">{system.diceBalance}</strong><small>真实行动累计</small></div>
          <button className="task-button secondary" type="button" onClick={() => setDialog({ type: 'task' })}><Plus size={17} /> 新建短期任务</button>
          <button className="task-button primary" type="button" onClick={() => setDialog({ type: 'goal' })}><Target size={17} /> 新建长期目标</button>
        </div>
      </section>

      <section className="task-rule-strip" aria-label="奖励规则">
        <div><Sparkles size={18} /><span><strong>完成行动</strong><small>合格记录即时获得 1 枚</small></span></div>
        <div><CalendarDays size={18} /><span><strong>查看本周进展</strong><small>随时复盘，只补发新增奖励</small></span></div>
        <div><Trophy size={18} /><span><strong>长期目标宝箱</strong><small>按 3–12 个月计划奖励 8–18 枚</small></span></div>
      </section>

      <nav className="task-filter-bar" aria-label="成长维度筛选">{(['all', 'wealth', 'ability', 'health'] as const).map((key) => <button className={dimension === key ? 'active' : ''} type="button" key={key} onClick={() => setDimension(key)}>{key === 'all' ? '全部维度' : DIMENSION_LABELS[key]}</button>)}</nav>

      <div className="task-board-grid">
        <section className="task-panel task-goals-panel">
          <header className="task-panel-heading"><div><span>LONG-TERM GOALS</span><h2>长期目标</h2></div><div className="task-status-tabs"><button className={goalStatus === 'active' ? 'active' : ''} onClick={() => setGoalStatus('active')} type="button">进行中</button><button className={goalStatus === 'completed' ? 'active' : ''} onClick={() => setGoalStatus('completed')} type="button">已完成</button><button className={goalStatus === 'archived' ? 'active' : ''} onClick={() => setGoalStatus('archived')} type="button">已归档</button></div></header>
          <div className="task-card-list">
            {visibleGoals.map((goal) => {
              const Icon = dimensionIcon[goal.dimension];
              const linkedCount = system.state.tasks.filter((task) => task.goalId === goal.id && task.status === 'active').length;
              const reward = getGoalChest(goal);
              const progressHistory = system.state.goalProgressEntries.filter((entry) => entry.goalId === goal.id).length;
              return (
                <article className={`goal-card dimension-${goal.dimension} ${selectedGoal === goal.id ? 'selected' : ''}`} key={goal.id} onClick={() => setSelectedGoal(goal.id)}>
                  <div className="goal-card-top"><span className="dimension-badge"><Icon size={16} /> {DIMENSION_LABELS[goal.dimension]}</span><span className={`goal-chest-tag ${reward.tier}`}>{reward.label} · {reward.dice} 🎲</span></div>
                  <h3>{goal.title}</h3><p>{goal.meaning}</p>
                  <div className="goal-progress"><div><span>当前进度 · {progressHistory} 条更新</span><strong>{goal.progressPercent}%</strong></div><progress max="100" value={goal.progressPercent} /></div>
                  <div className="goal-meta"><span>{linkedCount} 个待执行任务</span><span>{goal.startDate} → {goal.targetDate}</span></div>
                  {goal.status === 'active' && <footer onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => setDialog({ type: 'task', goalId: goal.id })}><Plus size={15} /> 添加短期任务</button>
                    <button type="button" onClick={() => setDialog({ type: 'goal-progress', goal })}><Zap size={15} /> 更新进度</button>
                    <button aria-label={`编辑目标：${goal.title}`} type="button" onClick={() => setDialog({ type: 'goal', goal })}><Pencil size={15} /></button>
                    <button aria-label={`归档目标：${goal.title}`} type="button" onClick={() => setDialog({ type: 'archive', kind: 'goal', id: goal.id, title: goal.title })}><Archive size={15} /></button>
                    <button className="complete-goal" type="button" onClick={() => setDialog({ type: 'goal-completion', goal })}><Trophy size={15} /> 完成目标</button>
                  </footer>}
                </article>
              );
            })}
            {visibleGoals.length === 0 && <div className="task-empty"><Target size={28} /><strong>{goalStatus === 'active' ? '先确定一个值得坚持的方向' : '这里会保留你的目标历史'}</strong><p>目标只记录方向、意义和 3–12 个月期限，进展在执行中单独更新。</p>{goalStatus === 'active' && <button className="task-button primary" type="button" onClick={() => setDialog({ type: 'goal' })}>创建第一个长期目标</button>}</div>}
          </div>
        </section>

        <section className="task-panel task-actions-panel">
          <header className="task-panel-heading"><div><span>ACTIONS & EXECUTION LOG</span><h2>行动系统</h2></div><strong className="task-count">{actionTab === 'pending' ? pendingTasks.length : historyEntries.length}</strong></header>
          <div className="action-scope-tabs">
            <button type="button" className={selectedGoal === 'all' ? 'active' : ''} onClick={() => setSelectedGoal('all')}>全部目标</button>
            <button type="button" className={selectedGoal === 'maintenance' ? 'active' : ''} onClick={() => setSelectedGoal('maintenance')}>每日维持</button>
            {activeGoals.map((goal) => <button type="button" className={selectedGoal === goal.id ? 'active' : ''} onClick={() => setSelectedGoal(goal.id)} key={goal.id}>{goal.title}</button>)}
          </div>
          <div className="action-view-tabs"><button type="button" className={actionTab === 'pending' ? 'active' : ''} onClick={() => setActionTab('pending')}><Check size={14} /> 待执行</button><button type="button" className={actionTab === 'history' ? 'active' : ''} onClick={() => setActionTab('history')}><History size={14} /> 行动历史</button></div>
          <div className="task-card-list">
            {actionTab === 'pending' && pendingTasks.map((task) => {
              const period = getPeriodKey(task.cadence, now());
              const count = system.state.completions.filter((entry) => entry.taskId === task.id && entry.periodKey === period).length;
              const doneToday = task.isMaintenance && count > 0;
              return <article className={`short-task-card ${doneToday ? 'rewarded' : ''}`} key={task.id}>
                <div className="short-task-check">{doneToday ? <Check size={17} /> : <Clock3 size={16} />}</div>
                <div className="short-task-main"><div className="short-task-title"><span>{cadenceLabels[task.cadence]}</span>{task.isMaintenance && <em>每日维持</em>}</div><h3>{task.title}</h3><p>{task.completionStandard}</p><div className="short-task-progress"><div style={{ width: `${Math.min(100, count / task.targetCount * 100)}%` }} /></div><small>{task.isMaintenance ? (doneToday ? '今日已记录' : '今日尚未记录') : `当前 ${count}/${task.targetCount} 次 · 达标后永久完成`}</small></div>
                <div className="short-task-actions">
                  {doneToday ? <span className="task-done-label">今日已记录</span> : <button className="task-button mini" aria-label={`记录完成：${task.title}`} type="button" onClick={() => setDialog({ type: 'completion', task })}><Check size={14} /> 记录完成</button>}
                  <button aria-label={`编辑任务：${task.title}`} type="button" onClick={() => setDialog({ type: 'task', task })}><Pencil size={14} /></button>
                  <button aria-label={`归档任务：${task.title}`} type="button" onClick={() => setDialog({ type: 'archive', kind: 'task', id: task.id, title: task.title })}><Archive size={14} /></button>
                </div>
              </article>;
            })}
            {actionTab === 'history' && historyEntries.map((entry) => {
              const task = system.state.tasks.find((candidate) => candidate.id === entry.taskId)!;
              const goal = system.state.goals.find((candidate) => candidate.id === task.goalId);
              return <article className="history-card" key={entry.id}><span className="history-date">{new Date(entry.completedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><div><strong>{task.title}</strong><p>{entry.reflection}</p><small>{goal?.title ?? '每日维持'} · {entry.rewardGranted ? '+1 🎲' : '已记录，本次不发骰子'}</small></div></article>;
            })}
            {((actionTab === 'pending' && pendingTasks.length === 0) || (actionTab === 'history' && historyEntries.length === 0)) && <div className="task-empty compact"><Zap size={24} /><strong>{actionTab === 'pending' ? '当前没有待执行任务' : '还没有行动历史'}</strong><p>{actionTab === 'pending' ? '普通任务完成后会离开这里；每日维持任务明天会自然重新出现。' : '每次点击完成都会生成一条独立记录，永久保留。'}</p></div>}
          </div>
        </section>

        <section className="task-panel task-review-panel">
          <header className="task-panel-heading"><div><span>WEEKLY REVIEW · {currentWeek}</span><h2>本周进展</h2></div><span className="weekly-bonus">+{weeklyPreview.bonusDice} 🎲</span></header>
          <div className="review-metrics"><div><strong>{Math.round(weeklyPreview.completionRate * 100)}%</strong><span>完成率</span></div><div><strong>{Math.round(weeklyPreview.evidenceCoverageRate * 100)}%</strong><span>证据覆盖</span></div><div><strong>{weeklyPreview.awardedDice}</strong><span>本周已领取</span></div></div>
          <div className="review-copy"><p>复盘始终可查看；如果奖励档位提高，只会发放相对上次领取增加的差额。</p><button className="task-button primary review-entry" type="button" onClick={() => setDialog({ type: 'weekly-review' })}>查看本周进展{weeklyPreview.newCompletionIds.length > 0 && <i className="notice-dot" aria-label="有新记录" />}</button></div>
        </section>

        <section className="task-panel task-ledger-panel">
          <header className="task-panel-heading"><div><span>DICE LEDGER</span><h2>骰子账本</h2></div><span>{system.state.diceTransactions.length} 笔</span></header>
          <div className="ledger-list">{[...system.state.diceTransactions].reverse().slice(0, 8).map((transaction) => <div className="ledger-row" key={transaction.id}><span className="ledger-die">🎲</span><div><strong>{transactionLabels[transaction.type]}</strong><small>{new Date(transaction.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {transaction.dimension === 'mixed' ? '综合成长' : DIMENSION_LABELS[transaction.dimension]}</small></div><b className={transaction.amount >= 0 ? 'positive' : 'negative'}>{transaction.amount >= 0 ? '+' : ''}{transaction.amount}</b></div>)}{system.state.diceTransactions.length === 0 && <div className="task-empty compact"><Sparkles size={24} /><strong>第一枚骰子正在等你</strong><p>完成一个真实、提前创建的行动后，奖励会显示在这里。</p></div>}</div>
        </section>
      </div>

      {dialog?.type === 'goal' && <Modal title={dialog.goal ? '编辑长期目标' : '新建长期目标'} onClose={() => setDialog(null)}><GoalForm goal={dialog.goal} onClose={() => setDialog(null)} onSubmit={(draft) => { dialog.goal ? system.updateGoal(dialog.goal.id, draft) : system.createGoal(draft); setDialog(null); }} /></Modal>}
      {dialog?.type === 'task' && <Modal title={dialog.task ? '编辑短期任务' : '新建短期任务'} onClose={() => setDialog(null)}><TaskForm task={dialog.task} goals={activeGoals} presetGoalId={dialog.goalId} onClose={() => setDialog(null)} onSubmit={(draft) => { dialog.task ? system.updateTask(dialog.task.id, draft) : system.createTask(draft); setDialog(null); }} /></Modal>}
      {dialog?.type === 'completion' && <Modal title="记录真实完成" onClose={() => setDialog(null)}><CompletionForm task={dialog.task} onClose={() => setDialog(null)} onSubmit={(draft) => { system.recordProgress(draft); setDialog(null); }} /></Modal>}
      {dialog?.type === 'goal-progress' && <Modal title="更新目标进度" onClose={() => setDialog(null)}><form className="task-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); system.recordGoalProgress(dialog.goal.id, Number(data.get('progress')), String(data.get('note') ?? ''), String(data.get('outcome') ?? '')); setDialog(null); }}><div className="task-completion-summary"><Zap size={20} /><span><strong>{dialog.goal.title}</strong><small>每次更新都会追加到进展历史，不覆盖过去记录。</small></span></div><label>当前进度（0–100%）<input name="progress" type="number" min="0" max="100" required defaultValue={dialog.goal.progressPercent} /></label><label>进展说明<textarea name="note" required placeholder="这段时间具体推进了什么？" /></label><label>阶段结果（可选）<textarea name="outcome" placeholder="已经产生了什么真实变化？" /></label><footer><button className="task-button ghost" type="button" onClick={() => setDialog(null)}>取消</button><button className="task-button primary" type="submit">保存进度记录</button></footer></form></Modal>}
      {dialog?.type === 'goal-completion' && <Modal title="完成长期目标" onClose={() => setDialog(null)}><form className="task-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); finishGoal(dialog.goal, String(data.get('reflection') ?? ''), String(data.get('evidence') ?? '')); }}><div className="task-completion-summary"><Trophy size={20} /><span><strong>{dialog.goal.title}</strong><small>完成后开启{getGoalChest(dialog.goal).label}，获得 {getGoalChest(dialog.goal).dice} 枚骰子。</small></span></div><label>目标复盘<textarea name="reflection" required placeholder="这段时间发生了什么真实变化？" /></label><label>结果证据（可选）<input name="evidence" type="url" placeholder="https://" /></label><footer><button className="task-button ghost" type="button" onClick={() => setDialog(null)}>取消</button><button className="task-button primary" type="submit">确认完成目标</button></footer></form></Modal>}
      {dialog?.type === 'archive' && <Modal title="确认归档" onClose={() => setDialog(null)}><div className="task-confirm"><Archive size={30} /><h3>要归档“{dialog.title}”吗？</h3><p>归档不会删除既有行动历史和骰子流水，但该项目将不再出现在进行中列表。</p><footer><button className="task-button ghost" type="button" onClick={() => setDialog(null)}>取消</button><button className="task-button primary" type="button" onClick={confirmArchive}>确认归档</button></footer></div></Modal>}
      {dialog?.type === 'weekly-review' && <Modal title="本周进展" onClose={() => setDialog(null)}><div className="weekly-review-dialog"><div className="review-metrics"><div><strong>{weeklyPreview.completionCount}/{weeklyPreview.eligibleTaskCount}</strong><span>任务达标</span></div><div><strong>{Math.round(weeklyPreview.evidenceCoverageRate * 100)}%</strong><span>证据覆盖</span></div><div><strong>+{weeklyPreview.claimableDice}</strong><span>本次可领取</span></div></div><section className="new-action-list"><h3>本周新增行动</h3>{newWeekCompletions.length === 0 ? <p>本周暂无新增行动记录</p> : newWeekCompletions.map((entry) => { const task = system.state.tasks.find((candidate) => candidate.id === entry!.taskId); return <div key={entry!.id}><Check size={15} /><span><strong>{task?.title}</strong><small>{entry!.reflection}</small></span></div>; })}</section><div className="weekly-reward-summary"><span>当前奖励档位 <strong>{weeklyPreview.bonusDice} 枚</strong></span><span>已经领取 <strong>{weeklyPreview.awardedDice} 枚</strong></span></div><footer>{weeklyPreview.claimableDice > 0 ? <button className="task-button primary" type="button" onClick={settleReview}>领取新增奖励 +{weeklyPreview.claimableDice} 🎲</button> : weeklyPreview.newCompletionIds.length > 0 ? <button className="task-button primary" type="button" onClick={settleReview}>确认已查看</button> : <button className="task-button ghost" type="button" onClick={() => setDialog(null)}>关闭</button>}</footer></div></Modal>}
      {chest && <RewardChest dice={chest.dice} title={chest.title} onClose={() => setChest(null)} />}
    </main>
  );
}
