import { useMemo } from 'react';
import { useAbilitySystem } from '../ability/useAbilitySystem';
import { useEmotionSystem } from '../emotion/useEmotionSystem';
import { useHealthSystem } from '../health/useHealthSystem';
import { useTaskSystem } from '../tasks/useTaskSystem';
import {
  deriveAbilitySummary,
  deriveEmotionSummary,
  deriveHealthSummary,
  deriveTaskSummary,
  localDateKey,
  type TodayOverviewModel,
} from './todayOverviewModel';

export function useTodayOverview(): TodayOverviewModel {
  const emotion = useEmotionSystem();
  const ability = useAbilitySystem();
  const health = useHealthSystem();
  const tasks = useTaskSystem();

  return useMemo(() => {
    const now = new Date();
    const today = localDateKey(now);
    const mealCount = health.meals.filter((record) => localDateKey(record.eatenAt) === today).length;
    const workoutCount = health.workouts.filter((record) => localDateKey(record.startedAt) === today).length;
    const dailyCount = health.daily.filter((record) => localDateKey(record.occurredAt) === today).length;

    return {
      emotion: deriveEmotionSummary(emotion.entries, now),
      ability: deriveAbilitySummary(ability.state),
      health: deriveHealthSummary({
        todayWaterMl: health.todayWaterMl,
        mealCount,
        workoutCount,
        dailyCount,
      }),
      tasks: deriveTaskSummary(tasks.state, now),
    };
  }, [
    ability.state,
    emotion.entries,
    health.daily,
    health.meals,
    health.todayWaterMl,
    health.workouts,
    tasks.state,
  ]);
}
