import {
  GOAL_CHESTS,
  MAINTENANCE_WEEKLY_DICE_CAP,
  TASK_REWARD_DICE,
  TASK_RULE_VERSION,
  WEEKLY_BONUS_DICE_CAP
} from './taskConfig';
import type {
  AdventureSpendInput,
  ChestTier,
  CompletionDraft,
  DiceTransaction,
  GoalProgressEntry,
  LongTermGoal,
  ShortTask,
  TaskCadence,
  TaskCompletion,
  TaskSystemState,
  WeeklyReview,
  WeeklyReviewPreview
} from './types';

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function createInitialTaskState(): TaskSystemState {
  return {
    schemaVersion: 2,
    goals: [],
    goalProgressEntries: [],
    tasks: [],
    completions: [],
    diceTransactions: [],
    weeklyReviews: [],
    adventure: { chapter: 1, position: 0, unlockedChapter: 1 }
  };
}

function datePart(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new Error('日期格式无效');
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function getPeriodKey(cadence: TaskCadence, isoDate: string): string {
  const part = datePart(isoDate);
  if (cadence === 'daily') return part;
  if (cadence === 'monthly') return part.slice(0, 7);
  const [year, month, dayOfMonth] = part.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, '0')}`;
}

export function getGoalChest(goal: Pick<LongTermGoal, 'startDate' | 'targetDate'>): { tier: ChestTier; label: string; dice: number } {
  const [startYear, startMonth] = goal.startDate.split('-').map(Number);
  const [targetYear, targetMonth] = goal.targetDate.split('-').map(Number);
  const months = Math.max(0, (targetYear - startYear) * 12 + targetMonth - startMonth);
  const tier: ChestTier = months <= 5 ? 'bronze' : months <= 8 ? 'silver' : 'gold';
  return { tier, ...GOAL_CHESTS[tier] };
}

export function getDiceBalance(state: TaskSystemState): number {
  return state.diceTransactions.reduce((total, transaction) => total + transaction.amount, 0);
}

function addTransaction(state: TaskSystemState, transaction: Omit<DiceTransaction, 'balanceAfter'>): TaskSystemState {
  const full = { ...transaction, balanceAfter: getDiceBalance(state) + transaction.amount };
  return { ...state, diceTransactions: [...state.diceTransactions, full] };
}

export function spendAdventureDice(
  state: TaskSystemState,
  input: AdventureSpendInput
): TaskSystemState {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('投入数量必须是大于 0 的整数');
  }
  if (state.diceTransactions.some((transaction) =>
    transaction.type === 'adventure-spend' && transaction.sourceId === input.operationId
  )) {
    return state;
  }

  const missing = input.amount - getDiceBalance(state);
  if (missing > 0) {
    throw new Error(`骰子余额不足，还差 ${missing} 枚`);
  }

  return addTransaction(state, {
    id: input.transactionId,
    type: 'adventure-spend',
    amount: -input.amount,
    sourceId: input.operationId,
    dimension: 'mixed',
    ruleVersion: 'adventure-investment-v1',
    createdAt: input.createdAt,
    targetType: input.targetType,
    targetId: input.targetId
  });
}

export function recordTaskProgress(
  state: TaskSystemState,
  input: CompletionDraft,
  idFactory: () => string = makeId
): TaskSystemState {
  const task = state.tasks.find((candidate) => candidate.id === input.taskId);
  if (!task || task.status !== 'active') throw new Error('任务不存在或已结束');
  if (task.isMaintenance && task.cadence !== 'daily') throw new Error('维持型任务只能使用每日周期');

  const periodKey = getPeriodKey(task.cadence, input.completedAt);
  const existing = state.completions.filter((item) => item.taskId === task.id && item.periodKey === periodKey);
  const sequenceInPeriod = existing.length + 1;
  const alreadyRewarded = existing.some((item) => item.rewardGranted);
  const hasActiveGoal = task.goalId !== null && state.goals.some(
    (candidate) => candidate.id === task.goalId && candidate.status === 'active' && candidate.dimension === task.dimension
  );
  const notRetroactive = new Date(input.completedAt).getTime() >= new Date(task.createdAt).getTime();
  const weekKey = getPeriodKey('weekly', input.completedAt);
  const maintenanceRewards = state.diceTransactions.filter((transaction) =>
    transaction.type === 'task-reward' &&
    getPeriodKey('weekly', transaction.createdAt) === weekKey &&
    state.tasks.some((candidate) => candidate.id === transaction.sourceId && candidate.isMaintenance)
  ).length;
  const rewardGranted = task.rewardEligible &&
    (hasActiveGoal || task.isMaintenance) &&
    notRetroactive &&
    input.reflection.trim().length > 0 &&
    sequenceInPeriod >= task.targetCount &&
    !alreadyRewarded &&
    (!task.isMaintenance || maintenanceRewards < MAINTENANCE_WEEKLY_DICE_CAP);

  const transactionId = rewardGranted ? idFactory() : null;
  const completion: TaskCompletion = {
    id: idFactory(),
    taskId: task.id,
    periodKey,
    sequenceInPeriod,
    completedAt: input.completedAt,
    reflection: input.reflection.trim(),
    metricValue: input.metricValue,
    evidenceLink: input.evidenceLink.trim(),
    rewardGranted,
    diceTransactionId: transactionId
  };
  const tasks = rewardGranted && !task.isMaintenance
    ? state.tasks.map((candidate): ShortTask => candidate.id === task.id
      ? { ...candidate, status: 'completed', completedAt: input.completedAt }
      : candidate)
    : state.tasks;
  const next = { ...state, tasks, completions: [...state.completions, completion] };
  if (!rewardGranted || !transactionId) return next;
  return addTransaction(next, {
    id: transactionId,
    type: 'task-reward',
    amount: TASK_REWARD_DICE,
    sourceId: task.id,
    dimension: task.dimension === 'recovery' ? 'mixed' : task.dimension,
    ruleVersion: TASK_RULE_VERSION,
    createdAt: input.completedAt
  });
}

export function recordGoalProgress(
  state: TaskSystemState,
  input: { goalId: string; progressPercent: number; note: string; outcome: string; createdAt: string },
  idFactory: () => string = makeId
): TaskSystemState {
  const goal = state.goals.find((candidate) => candidate.id === input.goalId);
  if (!goal || goal.status !== 'active') throw new Error('长期目标不存在或已结束');
  if (!input.note.trim()) throw new Error('请填写本次进展说明');
  const progressPercent = Math.round(Math.max(0, Math.min(100, input.progressPercent)));
  const entry: GoalProgressEntry = {
    id: idFactory(),
    goalId: goal.id,
    progressPercent,
    note: input.note.trim(),
    outcome: input.outcome.trim(),
    createdAt: input.createdAt
  };
  return {
    ...state,
    goals: state.goals.map((candidate) => candidate.id === goal.id ? { ...candidate, progressPercent } : candidate),
    goalProgressEntries: [...state.goalProgressEntries, entry]
  };
}

export function getQualifyingStreakWeeks(reviews: WeeklyReview[]): number {
  let streak = 0;
  for (const review of [...reviews].sort((a, b) => b.weekKey.localeCompare(a.weekKey))) {
    const rate = review.completionRate <= 1 ? review.completionRate : review.completionRate / 100;
    if (rate < 0.75) break;
    streak += 1;
  }
  return streak;
}

export function calculateWeeklyBonus(input: { completionRate: number; evidenceCoverageRate: number; qualifyingStreakWeeks: number }): number {
  const rate = input.completionRate <= 1 ? input.completionRate * 100 : input.completionRate;
  const evidence = input.evidenceCoverageRate <= 1 ? input.evidenceCoverageRate * 100 : input.evidenceCoverageRate;
  let bonus = rate >= 90 ? 3 : rate >= 75 ? 2 : rate >= 60 ? 1 : 0;
  if (evidence >= 70) bonus += 1;
  if (input.qualifyingStreakWeeks >= 3) bonus += 1;
  return Math.min(WEEKLY_BONUS_DICE_CAP, bonus);
}

export function buildWeeklyReviewPreview(state: TaskSystemState, weekKey: string): WeeklyReviewPreview {
  const eligibleTasks = state.tasks.filter((task) => {
    const began = getPeriodKey('weekly', `${task.startDate}T12:00:00`) <= weekKey;
    const notEnded = !task.endDate || getPeriodKey('weekly', `${task.endDate}T12:00:00`) >= weekKey;
    const existed = task.status === 'active' ||
      (task.completedAt !== null && getPeriodKey('weekly', task.completedAt) >= weekKey) ||
      (task.archivedAt !== null && getPeriodKey('weekly', task.archivedAt) >= weekKey);
    return task.rewardEligible && began && notEnded && existed;
  });
  const weekCompletions = state.completions.filter((item) => getPeriodKey('weekly', item.completedAt) === weekKey);
  const completedTaskIds = new Set(weekCompletions.filter((item) => item.rewardGranted).map((item) => item.taskId));
  const completionCount = eligibleTasks.filter((task) => completedTaskIds.has(task.id)).length;
  const objectiveEvidence = new Set(weekCompletions.filter((item) =>
    completedTaskIds.has(item.taskId) && (item.metricValue !== null || item.evidenceLink.length > 0)
  ).map((item) => item.taskId)).size;
  const completionRate = eligibleTasks.length ? completionCount / eligibleTasks.length : 0;
  const evidenceCoverageRate = completionCount ? objectiveEvidence / completionCount : 0;
  const qualifyingStreakWeeks = getQualifyingStreakWeeks(state.weeklyReviews.filter((item) => item.weekKey !== weekKey));
  const bonusDice = calculateWeeklyBonus({ completionRate, evidenceCoverageRate, qualifyingStreakWeeks });
  const existing = state.weeklyReviews.find((item) => item.weekKey === weekKey);
  const reviewed = new Set(existing?.reviewedCompletionIds ?? []);
  return {
    weekKey,
    eligibleTaskCount: eligibleTasks.length,
    completionCount,
    completionRate,
    evidenceCoverageRate,
    qualifyingStreakWeeks,
    bonusDice,
    awardedDice: existing?.awardedDice ?? 0,
    claimableDice: Math.max(0, bonusDice - (existing?.awardedDice ?? 0)),
    newCompletionIds: weekCompletions.map((item) => item.id).filter((id) => !reviewed.has(id))
  };
}

export function settleWeeklyReview(
  state: TaskSystemState,
  weekKey: string,
  settledAt: string,
  idFactory: () => string = makeId
): TaskSystemState {
  const preview = buildWeeklyReviewPreview(state, weekKey);
  const existing = state.weeklyReviews.find((item) => item.weekKey === weekKey);
  const reviewId = existing?.id ?? idFactory();
  const transactionId = preview.claimableDice > 0 ? idFactory() : null;
  const currentWeekCompletionIds = state.completions
    .filter((item) => getPeriodKey('weekly', item.completedAt) === weekKey)
    .map((item) => item.id);
  const review: WeeklyReview = {
    id: reviewId,
    weekKey,
    eligibleTaskCount: preview.eligibleTaskCount,
    completionCount: preview.completionCount,
    completionRate: preview.completionRate,
    evidenceCoverageRate: preview.evidenceCoverageRate,
    qualifyingStreakWeeks: preview.qualifyingStreakWeeks,
    bonusDice: preview.bonusDice,
    awardedDice: (existing?.awardedDice ?? 0) + preview.claimableDice,
    reviewedCompletionIds: Array.from(new Set([...(existing?.reviewedCompletionIds ?? []), ...currentWeekCompletionIds])),
    settlementCount: (existing?.settlementCount ?? 0) + 1,
    lastSettledAt: settledAt,
    transactionIds: [...(existing?.transactionIds ?? []), ...(transactionId ? [transactionId] : [])]
  };
  const next = {
    ...state,
    weeklyReviews: existing
      ? state.weeklyReviews.map((item) => item.weekKey === weekKey ? review : item)
      : [...state.weeklyReviews, review]
  };
  if (!transactionId) return next;
  return addTransaction(next, {
    id: transactionId,
    type: 'weekly-bonus',
    amount: preview.claimableDice,
    sourceId: reviewId,
    dimension: 'mixed',
    ruleVersion: TASK_RULE_VERSION,
    createdAt: settledAt
  });
}

export function completeLongTermGoal(
  state: TaskSystemState,
  input: { goalId: string; completedAt: string; reflection: string; evidenceLink: string },
  idFactory: () => string = makeId
): TaskSystemState {
  const goal = state.goals.find((candidate) => candidate.id === input.goalId);
  if (!goal || goal.status !== 'active') return state;
  const next = {
    ...state,
    goals: state.goals.map((candidate): LongTermGoal => candidate.id === goal.id ? {
      ...candidate,
      status: 'completed',
      completedAt: input.completedAt,
      progressPercent: 100,
      completionReflection: input.reflection.trim(),
      completionEvidenceLink: input.evidenceLink.trim()
    } : candidate),
    adventure: {
      ...state.adventure,
      unlockedChapter: Math.max(state.adventure.unlockedChapter, state.adventure.chapter + 1)
    }
  };
  return addTransaction(next, {
    id: idFactory(),
    type: 'goal-reward',
    amount: getGoalChest(goal).dice,
    sourceId: goal.id,
    dimension: goal.dimension,
    ruleVersion: TASK_RULE_VERSION,
    createdAt: input.completedAt
  });
}
