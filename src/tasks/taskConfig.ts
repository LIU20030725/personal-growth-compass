import type { ChestTier, GrowthDimension } from './types';

export const TASK_STORAGE_KEY = 'dice-life.task-system.v1';
export const TASK_RULE_VERSION = 'task-rewards-v2';
export const TASK_REWARD_DICE = 1;
export const MAINTENANCE_WEEKLY_DICE_CAP = 3;
export const WEEKLY_BONUS_DICE_CAP = 5;

export const DIMENSION_LABELS: Record<GrowthDimension, string> = {
  wealth: '财富积累',
  ability: '能力提升',
  health: '健康锻炼'
};

export const GOAL_CHESTS: Record<ChestTier, { label: string; dice: number }> = {
  bronze: { label: '青铜目标宝箱', dice: 8 },
  silver: { label: '白银目标宝箱', dice: 12 },
  gold: { label: '黄金目标宝箱', dice: 18 }
};
