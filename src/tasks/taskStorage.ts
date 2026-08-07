import { TASK_RULE_VERSION, TASK_STORAGE_KEY } from './taskConfig';
import { createInitialTaskState, getPeriodKey } from './taskEngine';
import type { StorageLike } from '../lib/storage';
import type {
  DiceTransaction,
  DiceTransactionType,
  GrowthDimension,
  TaskCompletion,
  TaskSystemState,
  WeeklyReview
} from './types';

export type { StorageLike } from '../lib/storage';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function isTaskState(value: unknown): value is TaskSystemState {
  if (!isRecord(value)) return false;
  return value.schemaVersion === 2 &&
    Array.isArray(value.goals) &&
    Array.isArray(value.goalProgressEntries) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.completions) &&
    Array.isArray(value.diceTransactions) &&
    Array.isArray(value.weeklyReviews) &&
    isRecord(value.adventure);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function transactionType(value: UnknownRecord): DiceTransactionType {
  const type = stringOr(value.type || value.reason);
  if (type === 'weekly-bonus' || type === 'weekly_bonus') return 'weekly-bonus';
  if (type === 'goal-reward' || type === 'goal_reward') return 'goal-reward';
  if (type === 'adventure-spend' || type === 'adventure_spend') return 'adventure-spend';
  return 'task-reward';
}

function transactionDimension(value: UnknownRecord): GrowthDimension | 'mixed' {
  return value.dimension === 'wealth' || value.dimension === 'ability' || value.dimension === 'health'
    ? value.dimension
    : 'mixed';
}

function migrateV1(value: UnknownRecord): TaskSystemState {
  const initial = createInitialTaskState();
  const rawGoals = Array.isArray(value.goals) ? value.goals.filter(isRecord) : [];
  const rawTasks = Array.isArray(value.tasks) ? value.tasks.filter(isRecord) : [];
  const rawCompletions = Array.isArray(value.completions) ? value.completions.filter(isRecord) : [];
  const rawTransactions = Array.isArray(value.diceTransactions) ? value.diceTransactions.filter(isRecord) : [];
  const rawReviews = Array.isArray(value.weeklyReviews) ? value.weeklyReviews.filter(isRecord) : [];

  const completions: TaskCompletion[] = rawCompletions.map((item, index) => {
    const completedAt = stringOr(item.completedAt, new Date(0).toISOString());
    const task = rawTasks.find((candidate) => candidate.id === item.taskId);
    const cadence = task?.cadence === 'weekly' || task?.cadence === 'monthly' ? task.cadence : 'daily';
    const periodKey = stringOr(item.periodKey) || getPeriodKey(cadence, completedAt);
    const earlierInPeriod = rawCompletions.slice(0, index).filter((candidate) => {
      if (candidate.taskId !== item.taskId) return false;
      try {
        return getPeriodKey(cadence, stringOr(candidate.completedAt)) === periodKey;
      } catch {
        return false;
      }
    }).length;
    return {
      id: stringOr(item.id, `migrated-completion-${index + 1}`),
      taskId: stringOr(item.taskId),
      periodKey,
      sequenceInPeriod: numberOr(item.sequenceInPeriod, earlierInPeriod + 1),
      completedAt,
      reflection: stringOr(item.reflection),
      metricValue: typeof item.metricValue === 'number' ? item.metricValue : null,
      evidenceLink: stringOr(item.evidenceLink),
      rewardGranted: item.rewardGranted !== false,
      diceTransactionId: nullableString(item.diceTransactionId)
    };
  });

  let runningBalance = 0;
  const diceTransactions: DiceTransaction[] = rawTransactions.map((item, index) => {
    const amount = numberOr(item.amount, 0);
    runningBalance = typeof item.balanceAfter === 'number' ? item.balanceAfter : runningBalance + amount;
    return {
      id: stringOr(item.id, `migrated-transaction-${index + 1}`),
      type: transactionType(item),
      amount,
      sourceId: stringOr(item.sourceId || item.relatedId),
      dimension: transactionDimension(item),
      ruleVersion: stringOr(item.ruleVersion, TASK_RULE_VERSION),
      createdAt: stringOr(item.createdAt, new Date(0).toISOString()),
      balanceAfter: runningBalance
    };
  });

  const weeklyReviews: WeeklyReview[] = rawReviews.map((item, index) => {
    const weekKey = stringOr(item.weekKey);
    const settledAt = nullableString(item.lastSettledAt || item.settledAt);
    const reviewedCompletionIds = completions
      .filter((entry) => {
        try {
          return getPeriodKey('weekly', entry.completedAt) === weekKey &&
            (!settledAt || entry.completedAt <= settledAt);
        } catch {
          return false;
        }
      })
      .map((entry) => entry.id);
    const transactionId = nullableString(item.diceTransactionId);
    return {
      id: stringOr(item.id, `migrated-review-${index + 1}`),
      weekKey,
      eligibleTaskCount: numberOr(item.eligibleTaskCount, 0),
      completionCount: numberOr(item.completionCount, 0),
      completionRate: numberOr(item.completionRate, 0),
      evidenceCoverageRate: numberOr(item.evidenceCoverageRate, 0),
      qualifyingStreakWeeks: numberOr(item.qualifyingStreakWeeks, 0),
      bonusDice: numberOr(item.bonusDice, 0),
      awardedDice: numberOr(item.awardedDice, numberOr(item.bonusDice, 0)),
      reviewedCompletionIds: Array.isArray(item.reviewedCompletionIds)
        ? item.reviewedCompletionIds.filter((id): id is string => typeof id === 'string')
        : reviewedCompletionIds,
      settlementCount: numberOr(item.settlementCount, 1),
      lastSettledAt: settledAt,
      transactionIds: Array.isArray(item.transactionIds)
        ? item.transactionIds.filter((id): id is string => typeof id === 'string')
        : transactionId ? [transactionId] : []
    };
  });

  return {
    schemaVersion: 2,
    goals: rawGoals.map((goal, index) => ({
      id: stringOr(goal.id, `migrated-goal-${index + 1}`),
      dimension: goal.dimension === 'wealth' || goal.dimension === 'ability' ? goal.dimension : 'health',
      title: stringOr(goal.title),
      meaning: stringOr(goal.meaning),
      startDate: stringOr(goal.startDate),
      targetDate: stringOr(goal.targetDate),
      progressPercent: Math.min(100, Math.max(0, numberOr(goal.progressPercent, 0))),
      status: goal.status === 'completed' || goal.status === 'archived' ? goal.status : 'active',
      createdAt: stringOr(goal.createdAt, new Date(0).toISOString()),
      completedAt: nullableString(goal.completedAt),
      archivedAt: nullableString(goal.archivedAt),
      completionReflection: stringOr(goal.completionReflection),
      completionEvidenceLink: stringOr(goal.completionEvidenceLink)
    })),
    goalProgressEntries: [],
    tasks: rawTasks.map((task, index) => {
      const status = task.status === 'completed' || task.status === 'archived' ? task.status : 'active';
      const lastCompletion = completions
        .filter((entry) => entry.taskId === task.id)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      const isMaintenance = task.isMaintenance === true;
      return {
        id: stringOr(task.id, `migrated-task-${index + 1}`),
        goalId: nullableString(task.goalId),
        dimension: task.dimension === 'wealth' || task.dimension === 'ability' || task.dimension === 'recovery'
          ? task.dimension : 'health',
        title: stringOr(task.title),
        completionStandard: stringOr(task.completionStandard),
        cadence: isMaintenance ? 'daily' : task.cadence === 'weekly' || task.cadence === 'monthly' ? task.cadence : 'daily',
        targetCount: Math.max(1, numberOr(task.targetCount, 1)),
        estimatedMinutesPerOccurrence: typeof task.estimatedMinutesPerOccurrence === 'number'
          ? task.estimatedMinutesPerOccurrence : null,
        startDate: stringOr(task.startDate),
        endDate: nullableString(task.endDate),
        verificationType: task.verificationType === 'metric' || task.verificationType === 'module-data' || task.verificationType === 'link'
          ? task.verificationType : 'reflection',
        isMaintenance,
        rewardEligible: task.rewardEligible !== false,
        status,
        createdAt: stringOr(task.createdAt, new Date(0).toISOString()),
        completedAt: status === 'completed' ? nullableString(task.completedAt) || lastCompletion?.completedAt || null : null,
        archivedAt: nullableString(task.archivedAt)
      };
    }),
    completions,
    diceTransactions,
    weeklyReviews,
    adventure: isRecord(value.adventure) ? {
      chapter: numberOr(value.adventure.chapter, initial.adventure.chapter),
      position: numberOr(value.adventure.position, initial.adventure.position),
      unlockedChapter: numberOr(value.adventure.unlockedChapter, initial.adventure.unlockedChapter)
    } : initial.adventure
  };
}

export function loadTaskState(storage: StorageLike): TaskSystemState {
  const raw = storage.getItem(TASK_STORAGE_KEY);
  if (!raw) return createInitialTaskState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isTaskState(parsed)) return parsed;
    if (isRecord(parsed) && parsed.schemaVersion === 1) {
      const migrated = migrateV1(parsed);
      saveTaskState(storage, migrated);
      return migrated;
    }
    throw new Error('unsupported task state');
  } catch {
    storage.setItem(`${TASK_STORAGE_KEY}.corrupt.${Date.now()}`, raw);
    storage.removeItem(TASK_STORAGE_KEY);
    return createInitialTaskState();
  }
}

export function saveTaskState(storage: StorageLike, state: TaskSystemState): void {
  storage.setItem(TASK_STORAGE_KEY, JSON.stringify(state));
}
