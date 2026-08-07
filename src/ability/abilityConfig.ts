import type { NodeDisplayState, SkillRole } from './types';

export const ABILITY_STORAGE_KEY = 'dice-life.ability.v1';
export const LEGACY_ABILITY_STORAGE_KEYS = ['abilityStore', 'dice-life.ability-store'] as const;

export const SKILL_ROLE_LABELS: Record<SkillRole, string> = {
  main: '主技能',
  side: '副技能',
  exploring: '探索技能'
};

export const NODE_STATE_LABELS: Record<NodeDisplayState, string> = {
  available: '可开始',
  in_progress: '成长中',
  mastered: '已掌握'
};

export const TREE_LAYOUT = {
  columns: 5,
  rowHeight: 220,
  columnWidth: 190
} as const;
