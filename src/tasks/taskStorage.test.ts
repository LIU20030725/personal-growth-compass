import { beforeEach, describe, expect, it } from 'vitest';
import { TASK_STORAGE_KEY } from './taskConfig';
import { createInitialTaskState } from './taskEngine';
import { loadTaskState, saveTaskState } from './taskStorage';

describe('task storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns a fresh state when no saved data exists', () => {
    expect(loadTaskState(localStorage)).toEqual(createInitialTaskState());
  });

  it('round-trips a valid versioned state', () => {
    const state = createInitialTaskState();
    state.adventure.position = 7;
    saveTaskState(localStorage, state);
    expect(loadTaskState(localStorage)).toEqual(state);
  });

  it('migrates version 1 data without losing history or dice transactions', () => {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      goals: [{
        id: 'goal-1', dimension: 'health', title: '规律锻炼', meaning: '保持精力',
        startDate: '2026-01-01', targetDate: '2026-07-01', progressPercent: 40,
        status: 'active', createdAt: '2026-01-01T08:00:00+08:00', completedAt: null,
        archivedAt: null, completionReflection: '', completionEvidenceLink: ''
      }],
      tasks: [{
        id: 'task-1', goalId: 'goal-1', dimension: 'health', title: '每周跑步',
        completionStandard: '跑步 30 分钟', cadence: 'weekly', targetCount: 2,
        estimatedMinutesPerOccurrence: 30, startDate: '2026-07-27', endDate: null,
        verificationType: 'reflection', isMaintenance: false, rewardEligible: true,
        status: 'active', createdAt: '2026-07-27T08:00:00+08:00', archivedAt: null
      }],
      completions: [{
        id: 'completion-1', taskId: 'task-1', completedAt: '2026-07-28T08:00:00+08:00',
        reflection: '完成一次', metricValue: 30, evidenceLink: '', periodKey: '2026-W31',
        rewardGranted: true, diceTransactionId: 'tx-1'
      }],
      diceTransactions: [{
        id: 'tx-1', amount: 1, reason: 'task_completion', relatedId: 'completion-1',
        ruleVersion: 'task-system-v1', createdAt: '2026-07-28T08:00:00+08:00'
      }],
      weeklyReviews: [{
        id: 'review-1', weekKey: '2026-W31', eligibleTaskCount: 1, completionCount: 1,
        completionRate: 1, evidenceCoverageRate: 0, qualifyingStreakWeeks: 0,
        bonusDice: 2, settledAt: '2026-08-01T08:00:00+08:00', diceTransactionId: 'tx-2'
      }],
      adventure: { position: 3 }
    }));

    const state = loadTaskState(localStorage);

    expect(state.schemaVersion).toBe(2);
    expect(state.goalProgressEntries).toEqual([]);
    expect(state.completions).toHaveLength(1);
    expect(state.diceTransactions).toHaveLength(1);
    expect(state.weeklyReviews[0]).toMatchObject({
      id: 'review-1',
      awardedDice: 2,
      reviewedCompletionIds: ['completion-1'],
      settlementCount: 1,
      transactionIds: ['tx-2']
    });
  });

  it('backs up damaged data and recovers with an empty state', () => {
    localStorage.setItem(TASK_STORAGE_KEY, '{damaged');
    expect(loadTaskState(localStorage)).toEqual(createInitialTaskState());
    expect(
      Object.keys(localStorage).some((key) => key.startsWith(`${TASK_STORAGE_KEY}.corrupt.`))
    ).toBe(true);
  });
});
