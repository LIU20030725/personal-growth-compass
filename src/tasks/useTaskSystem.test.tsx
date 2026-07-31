import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TASK_STORAGE_KEY } from './taskConfig';
import { useTaskSystem } from './useTaskSystem';

describe('useTaskSystem', () => {
  beforeEach(() => localStorage.clear());

  it('creates linked goals and tasks, persists them, and grants a completion die', () => {
    let nextId = 0;
    const { result } = renderHook(() =>
      useTaskSystem({
        storage: localStorage,
        now: () => '2026-07-30T08:00:00+08:00',
        idFactory: () => `id-${++nextId}`
      })
    );

    act(() => {
      result.current.createGoal({
        dimension: 'ability',
        title: '完成英语口语提升计划',
        meaning: '可以更自然地表达自己',
        startDate: '2026-07-30',
        targetDate: '2026-12-30'
      });
    });

    const goalId = result.current.state.goals[0].id;
    act(() => {
      result.current.createTask({
        goalId,
        dimension: 'ability',
        title: '完成一次口语跟读',
        completionStandard: '跟读并录音 20 分钟',
        cadence: 'daily',
        targetCount: 1,
        estimatedMinutesPerOccurrence: 20,
        startDate: '2026-07-30',
        endDate: null,
        verificationType: 'reflection',
        isMaintenance: false
      });
    });

    act(() => {
      result.current.recordProgress({
        taskId: result.current.state.tasks[0].id,
        completedAt: '2026-07-30T09:00:00+08:00',
        reflection: '完成了第一段录音',
        metricValue: 20,
        evidenceLink: ''
      });
    });

    expect(result.current.diceBalance).toBe(1);
    expect(result.current.state.completions).toHaveLength(1);
    expect(localStorage.getItem(TASK_STORAGE_KEY)).toContain('完成一次口语跟读');
  });

  it('updates and archives records without deleting their history', () => {
    const { result } = renderHook(() =>
      useTaskSystem({
        storage: localStorage,
        now: () => '2026-07-30T08:00:00+08:00',
        idFactory: () => 'goal-1'
      })
    );
    act(() => {
      result.current.createGoal({
        dimension: 'wealth',
        title: '建立应急金',
        meaning: '提高抗风险能力',
        startDate: '2026-07-30',
        targetDate: '2026-12-30'
      });
    });
    act(() => result.current.updateGoal('goal-1', { title: '建立三个月应急金' }));
    act(() => result.current.archiveGoal('goal-1'));

    expect(result.current.state.goals[0]).toMatchObject({
      title: '建立三个月应急金',
      status: 'archived'
    });
    expect(result.current.state.goals[0].archivedAt).not.toBeNull();
  });

  it('forces maintenance tasks to daily and appends goal progress history', () => {
    let nextId = 0;
    const { result } = renderHook(() => useTaskSystem({
      storage: localStorage,
      now: () => '2026-08-01T08:00:00+08:00',
      idFactory: () => `id-${++nextId}`
    }));

    act(() => result.current.createGoal({
      dimension: 'health', title: '改善体能', meaning: '保持长期精力',
      startDate: '2026-08-01', targetDate: '2027-02-01'
    }));
    const goalId = result.current.state.goals[0].id;
    act(() => result.current.createTask({
      goalId: null, dimension: 'health', title: '散步', completionStandard: '散步 20 分钟',
      cadence: 'weekly', targetCount: 3, estimatedMinutesPerOccurrence: null,
      startDate: '2026-08-01', endDate: null, verificationType: 'reflection', isMaintenance: true
    }));
    act(() => result.current.recordGoalProgress(goalId, 30, '已经稳定训练四周', '精力改善'));

    expect(result.current.state.tasks[0]).toMatchObject({ cadence: 'daily', targetCount: 1 });
    expect(result.current.state.goals[0].progressPercent).toBe(30);
    expect(result.current.state.goalProgressEntries[0]).toMatchObject({
      goalId, progressPercent: 30, note: '已经稳定训练四周'
    });
  });
});
