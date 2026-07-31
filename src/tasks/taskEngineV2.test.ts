import { describe, expect, it } from 'vitest';
import {
  buildWeeklyReviewPreview,
  createInitialTaskState,
  getDiceBalance,
  getGoalChest,
  getPeriodKey,
  recordGoalProgress,
  recordTaskProgress,
  settleWeeklyReview
} from './taskEngine';

const goal = (overrides: Record<string, unknown> = {}) => ({
  id: 'goal-1',
  dimension: 'health',
  title: '建立稳定运动习惯',
  meaning: '拥有更好的精力',
  startDate: '2026-08-01',
  targetDate: '2027-02-01',
  progressPercent: 0,
  status: 'active',
  createdAt: '2026-08-01T08:00:00+08:00',
  completedAt: null,
  archivedAt: null,
  completionReflection: '',
  completionEvidenceLink: '',
  ...overrides
});

const task = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  goalId: 'goal-1',
  dimension: 'health',
  title: '完成一次运动',
  completionStandard: '运动 30 分钟',
  cadence: 'daily',
  targetCount: 1,
  estimatedMinutesPerOccurrence: 30,
  startDate: '2026-08-01',
  endDate: null,
  verificationType: 'reflection',
  isMaintenance: false,
  rewardEligible: true,
  status: 'active',
  createdAt: '2026-08-01T08:00:00+08:00',
  completedAt: null,
  archivedAt: null,
  ...overrides
});

const completion = (taskId: string, completedAt: string) => ({
  taskId,
  completedAt,
  reflection: '真实完成记录',
  metricValue: 30,
  evidenceLink: ''
});

describe('task module v2 domain rules', () => {
  it('supports monthly periods and deterministic long-goal chests', () => {
    expect(getPeriodKey('monthly', '2026-08-14T09:00:00+08:00')).toBe('2026-08');
    expect(getGoalChest({ startDate: '2026-08-01', targetDate: '2026-12-01' })).toEqual({
      tier: 'bronze',
      label: '青铜目标宝箱',
      dice: 8
    });
    expect(getGoalChest({ startDate: '2026-08-01', targetDate: '2027-02-01' }).dice).toBe(12);
    expect(getGoalChest({ startDate: '2026-08-01', targetDate: '2027-05-01' }).dice).toBe(18);
  });

  it('completes ordinary tasks permanently after their target is reached', () => {
    let state = createInitialTaskState() as any;
    state.goals = [goal()];
    state.tasks = [task()];

    state = recordTaskProgress(state, completion('task-1', '2026-08-01T09:00:00+08:00'));

    expect(state.tasks[0].status).toBe('completed');
    expect(state.tasks[0].completedAt).toBe('2026-08-01T09:00:00+08:00');
    expect(getDiceBalance(state)).toBe(1);
  });

  it('keeps only daily maintenance tasks repeatable across dates', () => {
    let state = createInitialTaskState() as any;
    state.tasks = [task({ id: 'maintenance', goalId: null, isMaintenance: true })];

    state = recordTaskProgress(state, completion('maintenance', '2026-08-01T09:00:00+08:00'));
    state = recordTaskProgress(state, completion('maintenance', '2026-08-02T09:00:00+08:00'));

    expect(state.tasks[0].status).toBe('active');
    expect(state.completions).toHaveLength(2);

    const invalid = { ...state, tasks: [task({ id: 'invalid', goalId: null, isMaintenance: true, cadence: 'weekly' })] };
    expect(() => recordTaskProgress(invalid, completion('invalid', '2026-08-03T09:00:00+08:00')))
      .toThrow('维持型任务只能使用每日周期');
  });

  it('appends long-goal progress entries without overwriting history', () => {
    let state = createInitialTaskState() as any;
    state.goals = [goal()];
    let id = 0;
    state = recordGoalProgress(state, {
      goalId: 'goal-1', progressPercent: 25, note: '完成第一个月训练', outcome: '体能提升', createdAt: '2026-09-01T09:00:00+08:00'
    }, () => `progress-${++id}`);
    state = recordGoalProgress(state, {
      goalId: 'goal-1', progressPercent: 55, note: '训练已经稳定', outcome: '', createdAt: '2026-10-01T09:00:00+08:00'
    }, () => `progress-${++id}`);

    expect(state.goals[0].progressPercent).toBe(55);
    expect(state.goalProgressEntries).toHaveLength(2);
    expect(state.goalProgressEntries[0].progressPercent).toBe(25);
  });

  it('updates one weekly review and grants only newly earned reward', () => {
    let state = createInitialTaskState() as any;
    state.goals = [goal()];
    state.tasks = [task({ id: 'a' }), task({ id: 'b' })];
    let id = 0;
    const ids = () => `id-${++id}`;

    state = recordTaskProgress(state, completion('a', '2026-08-03T09:00:00+08:00'), ids);
    const firstPreview = buildWeeklyReviewPreview(state, '2026-W32');
    state = settleWeeklyReview(state, '2026-W32', '2026-08-03T20:00:00+08:00', ids);
    const firstBalance = getDiceBalance(state);
    expect(state.weeklyReviews[0].awardedDice).toBe(firstPreview.bonusDice);

    state = recordTaskProgress(state, completion('b', '2026-08-04T09:00:00+08:00'), ids);
    const secondPreview = buildWeeklyReviewPreview(state, '2026-W32');
    state = settleWeeklyReview(state, '2026-W32', '2026-08-04T20:00:00+08:00', ids);

    expect(state.weeklyReviews).toHaveLength(1);
    expect(state.weeklyReviews[0].settlementCount).toBe(2);
    expect(state.weeklyReviews[0].awardedDice).toBe(secondPreview.bonusDice);
    expect(getDiceBalance(state) - firstBalance).toBe(
      Math.max(0, secondPreview.bonusDice - firstPreview.bonusDice) + 1
    );
  });
});
