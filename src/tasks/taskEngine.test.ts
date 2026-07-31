import { describe, expect, it } from 'vitest';
import {
  buildWeeklyReviewPreview,
  calculateWeeklyBonus,
  completeLongTermGoal,
  createInitialTaskState,
  getDiceBalance,
  getPeriodKey,
  recordTaskProgress,
  settleWeeklyReview
} from './taskEngine';
import { MAINTENANCE_WEEKLY_DICE_CAP, TASK_REWARD_DICE, WEEKLY_BONUS_DICE_CAP } from './taskConfig';
import type { LongTermGoal, ShortTask } from './types';

const goal = (overrides: Partial<LongTermGoal> = {}): LongTermGoal => ({
  id: 'goal-1', dimension: 'health', title: '建立稳定运动习惯', meaning: '拥有更充沛的精力',
  startDate: '2026-07-01', targetDate: '2026-12-31', progressPercent: 0, status: 'active',
  createdAt: '2026-07-01T08:00:00+08:00', completedAt: null, archivedAt: null,
  completionReflection: '', completionEvidenceLink: '', ...overrides
});

const task = (overrides: Partial<ShortTask> = {}): ShortTask => ({
  id: 'task-1', goalId: 'goal-1', dimension: 'health', title: '每周运动 3 次',
  completionStandard: '每次 30 分钟', cadence: 'weekly', targetCount: 3,
  estimatedMinutesPerOccurrence: 30, startDate: '2026-07-27', endDate: null,
  verificationType: 'reflection', isMaintenance: false, rewardEligible: true, status: 'active',
  createdAt: '2026-07-27T08:00:00+08:00', completedAt: null, archivedAt: null, ...overrides
});

const record = (taskId: string, completedAt: string, reflection = '真实记录') => ({
  taskId, completedAt, reflection, metricValue: null, evidenceLink: ''
});

describe('task system configuration', () => {
  it('starts with version 2 and confirmed reward caps', () => {
    const state = createInitialTaskState();
    expect(state.schemaVersion).toBe(2);
    expect(state.goalProgressEntries).toEqual([]);
    expect(getDiceBalance(state)).toBe(0);
    expect(TASK_REWARD_DICE).toBe(1);
    expect(MAINTENANCE_WEEKLY_DICE_CAP).toBe(3);
    expect(WEEKLY_BONUS_DICE_CAP).toBe(5);
  });
});

describe('task rules', () => {
  it('uses local calendar dates for daily, weekly and monthly keys', () => {
    expect(getPeriodKey('daily', '2026-07-30T23:30:00+08:00')).toBe('2026-07-30');
    expect(getPeriodKey('weekly', '2026-07-30T12:00:00+08:00')).toBe('2026-W31');
    expect(getPeriodKey('monthly', '2026-07-30T12:00:00+08:00')).toBe('2026-07');
  });

  it('rewards an ordinary task only when its target is reached, then closes it', () => {
    let state = createInitialTaskState();
    state.goals = [goal()];
    state.tasks = [task()];
    state = recordTaskProgress(state, record('task-1', '2026-07-28T08:00:00+08:00'));
    state = recordTaskProgress(state, record('task-1', '2026-07-29T08:00:00+08:00'));
    expect(getDiceBalance(state)).toBe(0);
    state = recordTaskProgress(state, record('task-1', '2026-07-30T08:00:00+08:00'));
    expect(getDiceBalance(state)).toBe(1);
    expect(state.tasks[0].status).toBe('completed');
  });

  it('caps daily maintenance rewards at three per week while preserving all records', () => {
    let state = createInitialTaskState();
    state.tasks = [task({ id: 'maintenance', goalId: null, cadence: 'daily', targetCount: 1, isMaintenance: true })];
    for (const completedAt of ['2026-07-27T08:00:00+08:00', '2026-07-28T08:00:00+08:00', '2026-07-29T08:00:00+08:00', '2026-07-30T08:00:00+08:00']) {
      state = recordTaskProgress(state, record('maintenance', completedAt));
    }
    expect(state.completions).toHaveLength(4);
    expect(getDiceBalance(state)).toBe(3);
    expect(state.tasks[0].status).toBe('active');
  });

  it('records but does not reward retroactive, unlinked, or empty-reflection completions', () => {
    let state = createInitialTaskState();
    state.goals = [goal()];
    state.tasks = [
      task({ id: 'retro', cadence: 'daily', targetCount: 1, createdAt: '2026-07-31T08:00:00+08:00' }),
      task({ id: 'unlinked', cadence: 'daily', targetCount: 1, goalId: null }),
      task({ id: 'empty', cadence: 'daily', targetCount: 1 })
    ];
    state = recordTaskProgress(state, record('retro', '2026-07-30T09:00:00+08:00'));
    state = recordTaskProgress(state, record('unlinked', '2026-07-30T09:00:00+08:00'));
    state = recordTaskProgress(state, record('empty', '2026-07-30T09:00:00+08:00', '   '));
    expect(state.completions).toHaveLength(3);
    expect(getDiceBalance(state)).toBe(0);
  });

  it('keeps the existing evidence and streak bonus formula capped at five', () => {
    expect(calculateWeeklyBonus({ completionRate: 0.59, evidenceCoverageRate: 1, qualifyingStreakWeeks: 5 })).toBe(2);
    expect(calculateWeeklyBonus({ completionRate: 0.75, evidenceCoverageRate: 0.7, qualifyingStreakWeeks: 0 })).toBe(3);
    expect(calculateWeeklyBonus({ completionRate: 0.9, evidenceCoverageRate: 1, qualifyingStreakWeeks: 3 })).toBe(5);
  });
});

describe('milestone rewards', () => {
  it('allows repeated weekly review but never duplicates an already awarded tier', () => {
    let state = createInitialTaskState();
    state.goals = [goal()];
    state.tasks = [task({ cadence: 'daily', targetCount: 1 })];
    state = recordTaskProgress(state, { ...record('task-1', '2026-07-30T08:00:00+08:00'), metricValue: 30 });
    const preview = buildWeeklyReviewPreview(state, '2026-W31');
    state = settleWeeklyReview(state, '2026-W31', '2026-08-01T20:00:00+08:00');
    const afterFirst = getDiceBalance(state);
    state = settleWeeklyReview(state, '2026-W31', '2026-08-01T21:00:00+08:00');
    expect(preview.bonusDice).toBeLessThanOrEqual(5);
    expect(state.weeklyReviews).toHaveLength(1);
    expect(state.weeklyReviews[0].settlementCount).toBe(2);
    expect(getDiceBalance(state)).toBe(afterFirst);
  });

  it('rewards long-term goals by planned duration', () => {
    let state = createInitialTaskState();
    state.goals = [goal()];
    state = completeLongTermGoal(state, {
      goalId: 'goal-1', completedAt: '2026-12-20T08:00:00+08:00',
      reflection: '我已经形成稳定习惯', evidenceLink: ''
    });
    expect(state.goals[0]).toMatchObject({ status: 'completed', progressPercent: 100 });
    expect(getDiceBalance(state)).toBe(8);
    expect(state.diceTransactions[0].type).toBe('goal-reward');
  });
});
