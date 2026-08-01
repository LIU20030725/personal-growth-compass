import { describe, expect, it } from 'vitest';
import { abilityTreePath, parseAbilityPath, resolveAbilityTreeId } from './abilityRoute';
import { createInitialAbilityState } from './abilityStorage';
import type { AbilityState } from './types';

function state(): AbilityState {
  return {
    ...createInitialAbilityState(),
    trees: [
      { id: 'react/full stack', name: 'React', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: '2026-08-01', updatedAt: '2026-08-01' },
      { id: 'archived', name: '旧技能', description: '', role: 'side', status: 'archived', focusedRank: null, createdAt: '2026-08-01', updatedAt: '2026-08-01' }
    ],
    lastVisitedTreeId: 'react/full stack'
  };
}

describe('ability routes', () => {
  it('parses index, tree, and invalid paths', () => {
    expect(parseAbilityPath('/ability')).toEqual({ kind: 'index' });
    expect(parseAbilityPath('/ability/')).toEqual({ kind: 'index' });
    expect(parseAbilityPath('/ability/trees/react%2Ffull%20stack')).toEqual({ kind: 'tree', treeId: 'react/full stack' });
    expect(parseAbilityPath('/ability/trees/react/extra')).toEqual({ kind: 'invalid' });
    expect(parseAbilityPath('/finance')).toEqual({ kind: 'invalid' });
  });

  it('encodes tree ids and resolves missing or archived trees to the default', () => {
    expect(abilityTreePath('react/full stack')).toBe('/ability/trees/react%2Ffull%20stack');
    expect(resolveAbilityTreeId(state(), { kind: 'tree', treeId: 'react/full stack' })).toEqual({ treeId: 'react/full stack', notice: '' });
    expect(resolveAbilityTreeId(state(), { kind: 'tree', treeId: 'missing' })).toEqual({ treeId: 'react/full stack', notice: '技能树不存在，已返回能力首页' });
    expect(resolveAbilityTreeId(state(), { kind: 'tree', treeId: 'archived' })).toEqual({ treeId: 'react/full stack', notice: '技能树不存在，已返回能力首页' });
  });
});
