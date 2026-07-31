import { useCallback, useMemo, useState } from 'react';
import {
  completeLongTermGoal,
  getDiceBalance,
  recordGoalProgress as appendGoalProgress,
  recordTaskProgress,
  settleWeeklyReview
} from './taskEngine';
import { loadTaskState, saveTaskState, type StorageLike } from './taskStorage';
import type { CompletionDraft, GoalDraft, LongTermGoal, ShortTask, TaskDraft, TaskSystemState } from './types';

type Options = {
  storage?: StorageLike;
  now?: () => string;
  idFactory?: () => string;
};

const browserStorage = (): StorageLike => window.localStorage;
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function useTaskSystem(options: Options = {}) {
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? newId;
  const [state, setState] = useState<TaskSystemState>(() => loadTaskState(storage));

  const commit = useCallback((change: (current: TaskSystemState) => TaskSystemState) => {
    setState((current) => {
      const next = change(current);
      saveTaskState(storage, next);
      return next;
    });
  }, [storage]);

  const createGoal = useCallback((draft: GoalDraft) => {
    commit((current) => {
      const goal: LongTermGoal = {
        ...draft,
        id: idFactory(),
        progressPercent: 0,
        status: 'active',
        createdAt: now(),
        completedAt: null,
        archivedAt: null,
        completionReflection: '',
        completionEvidenceLink: ''
      };
      return { ...current, goals: [...current.goals, goal] };
    });
  }, [commit, idFactory, now]);

  const updateGoal = useCallback((goalId: string, patch: Partial<GoalDraft>) => {
    commit((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, ...patch } : goal)
    }));
  }, [commit]);

  const archiveGoal = useCallback((goalId: string) => {
    commit((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, status: 'archived', archivedAt: now() } : goal
      )
    }));
  }, [commit, now]);

  const createTask = useCallback((draft: TaskDraft) => {
    commit((current) => {
      const isMaintenance = draft.isMaintenance;
      const task: ShortTask = {
        ...draft,
        id: idFactory(),
        cadence: isMaintenance ? 'daily' : draft.cadence,
        targetCount: isMaintenance ? 1 : draft.targetCount,
        rewardEligible: isMaintenance || draft.goalId !== null,
        status: 'active',
        createdAt: now(),
        completedAt: null,
        archivedAt: null
      };
      return { ...current, tasks: [...current.tasks, task] };
    });
  }, [commit, idFactory, now]);

  const updateTask = useCallback((taskId: string, patch: Partial<TaskDraft>) => {
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const next = { ...task, ...patch };
        return {
          ...next,
          cadence: next.isMaintenance ? 'daily' : next.cadence,
          targetCount: next.isMaintenance ? 1 : next.targetCount,
          rewardEligible: next.isMaintenance || next.goalId !== null
        };
      })
    }));
  }, [commit]);

  const archiveTask = useCallback((taskId: string) => {
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, status: 'archived', archivedAt: now() } : task
      )
    }));
  }, [commit, now]);

  const recordProgress = useCallback((draft: CompletionDraft) => {
    commit((current) => recordTaskProgress(current, draft, idFactory));
  }, [commit, idFactory]);

  const recordGoalProgress = useCallback((
    goalId: string,
    progressPercent: number,
    note: string,
    outcome: string
  ) => {
    commit((current) => appendGoalProgress(current, {
      goalId,
      progressPercent,
      note,
      outcome,
      createdAt: now()
    }, idFactory));
  }, [commit, idFactory, now]);

  const completeGoal = useCallback((goalId: string, reflection: string, evidenceLink: string) => {
    commit((current) => completeLongTermGoal(current, {
      goalId,
      completedAt: now(),
      reflection,
      evidenceLink
    }, idFactory));
  }, [commit, idFactory, now]);

  const settleWeek = useCallback((weekKey: string) => {
    commit((current) => settleWeeklyReview(current, weekKey, now(), idFactory));
  }, [commit, idFactory, now]);

  return useMemo(() => ({
    state,
    diceBalance: getDiceBalance(state),
    createGoal,
    updateGoal,
    archiveGoal,
    completeGoal,
    createTask,
    updateTask,
    archiveTask,
    recordProgress,
    recordGoalProgress,
    settleWeek
  }), [
    archiveGoal,
    archiveTask,
    completeGoal,
    createGoal,
    createTask,
    recordProgress,
    recordGoalProgress,
    settleWeek,
    state,
    updateGoal,
    updateTask
  ]);
}
