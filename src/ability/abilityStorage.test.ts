import { beforeEach, describe, expect, it } from 'vitest';
import { ABILITY_STORAGE_KEY } from './abilityConfig';
import {
  createInitialAbilityState,
  loadAbilityState,
  migrateLegacyAbilityStore,
  saveAbilityState
} from './abilityStorage';
import type { AbilityState } from './types';
import type { StorageLike } from '../lib/storage';

const stamp = '2026-08-02T00:00:00.000Z';

function populatedState(): AbilityState {
  return {
    ...createInitialAbilityState(),
    trees: [{ id: 'tree', name: '写作', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [{ id: 'phase', skillTreeId: 'tree', name: '基础', description: '', order: 0 }],
    nodes: [{ id: 'node', skillTreeId: 'tree', phaseId: 'phase', name: '每日写作', description: '', progress: 'in_progress', masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp }],
    lastVisitedTreeId: 'tree'
  };
}

describe('ability storage', () => {
  beforeEach(() => localStorage.clear());

  it('loads an empty state and round-trips a valid state', () => {
    expect(loadAbilityState(localStorage)).toEqual(createInitialAbilityState());
    const state = populatedState();
    saveAbilityState(localStorage, state);
    expect(loadAbilityState(localStorage)).toEqual(state);
  });

  it('backs up a corrupt snapshot before returning an empty state', () => {
    localStorage.setItem(ABILITY_STORAGE_KEY, '{damaged');
    expect(loadAbilityState(localStorage)).toEqual(createInitialAbilityState());
    expect(Object.keys(localStorage).some((key) => key.startsWith(`${ABILITY_STORAGE_KEY}.corrupt.`))).toBe(true);
    expect(localStorage.getItem(ABILITY_STORAGE_KEY)).toBeNull();
  });

  it('converts legacy career, learning, and achievement data', () => {
    const legacy = {
      career: {
        skills: [
          { id: 'react', name: 'React', level: 5, maxLevel: 10, parent: null, children: ['fullstack'], unlocked: true },
          { id: 'fullstack', name: '全栈开发', level: 0, maxLevel: 10, parent: 'react', children: [], unlocked: false }
        ],
        habits: [{ id: 'morning', name: '早起' }]
      },
      side: {
        learning: [{ id: 'ml', title: '机器学习课程', progress: 0.6, link: 'https://example.test/ml' }],
        achievements: [{ id: 'bili', platform: 'B站', metric: '粉丝数', history: [{ date: '2026-08-01', value: 1000 }] }]
      }
    };
    const migrated = migrateLegacyAbilityStore(legacy, stamp);
    expect(migrated.trees.map((tree) => tree.name)).toEqual(['职业技能', '副业学习']);
    expect(migrated.nodes.find((node) => node.name === 'React')?.progress).toBe('in_progress');
    expect(migrated.nodes.find((node) => node.name === '全栈开发')?.progress).toBe('available');
    expect(migrated.nodes.find((node) => node.name === '机器学习课程')?.progress).toBe('in_progress');
    const react = migrated.nodes.find((node) => node.name === 'React');
    const fullstack = migrated.nodes.find((node) => node.name === '全栈开发');
    expect(migrated.dependencies).toContainEqual(expect.objectContaining({ prerequisiteNodeId: react?.id, dependentNodeId: fullstack?.id }));
    expect(migrated.outcomes[0]).toMatchObject({ title: 'B站 · 粉丝数 1000', occurredOn: '2026-08-01', showOnTree: false });
  });

  it('imports a legacy key without deleting the recoverable source', () => {
    const legacy = { career: { skills: [{ id: 'writing', name: '写作', level: 10, maxLevel: 10, parent: null, children: [], unlocked: true }] } };
    localStorage.setItem('abilityStore', JSON.stringify(legacy));
    const migrated = loadAbilityState(localStorage);
    expect(migrated.nodes[0].progress).toBe('mastered');
    expect(localStorage.getItem(ABILITY_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem('abilityStore')).not.toBeNull();
  });

  it('keeps the previous snapshot when storage quota fails', () => {
    let value = JSON.stringify(populatedState());
    const failingStorage: StorageLike = {
      getItem: () => value,
      removeItem: () => undefined,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      }
    };
    expect(() => saveAbilityState(failingStorage, createInitialAbilityState())).toThrow('能力数据保存失败，原数据仍然保留');
    expect(JSON.parse(value)).toEqual(populatedState());
  });
});
