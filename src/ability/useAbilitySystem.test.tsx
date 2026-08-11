import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ABILITY_STORAGE_KEY } from './abilityConfig';
import { useAbilitySystem } from './useAbilitySystem';
import type { SkillTreeDraft } from './types';
import type { StorageLike } from '../lib/storage';

const stamp = '2026-08-02T00:00:00.000Z';

function draft(): SkillTreeDraft {
  return {
    tree: { name: '写作', description: '', role: 'main', status: 'active', focusedRank: 1 },
    phases: [{ draftId: 'phase', name: '基础', description: '', order: 0 }],
    nodes: [{ draftId: 'node', phaseDraftId: 'phase', name: '每日写作', description: '', progress: 'available', masteryNote: '' }],
    dependencies: [],
    parallelGroups: [],
    masteryCriteria: []
  };
}

function ids() {
  let value = 0;
  return (kind: string) => `${kind}-${++value}`;
}

describe('useAbilitySystem', () => {
  beforeEach(() => localStorage.clear());

  it('applies drafts and persists every successful action', () => {
    const { result } = renderHook(() => useAbilitySystem({ storage: localStorage, now: () => stamp, idFactory: ids() }));
    act(() => result.current.applyTreeDraft(draft()));
    const nodeId = result.current.state.nodes[0].id;
    act(() => result.current.startNode(nodeId));
    act(() => result.current.addCriterion(nodeId, '连续完成七天'));
    const criterionId = result.current.state.masteryCriteria[0].id;
    act(() => result.current.toggleCriterion(criterionId));
    act(() => result.current.masterNode(nodeId, ''));
    act(() => result.current.linkTask(nodeId, 'task-1'));
    act(() => result.current.addOutcome({ skillTreeId: result.current.state.trees[0].id, skillNodeId: nodeId, title: '完成专栏', description: '', occurredOn: '2026-08-02', showOnTree: true }));

    const stored = JSON.parse(localStorage.getItem(ABILITY_STORAGE_KEY) ?? '{}');
    expect(stored.nodes[0].progress).toBe('mastered');
    expect(stored.taskLinks[0].taskId).toBe('task-1');
    expect(stored.outcomes[0].title).toBe('完成专栏');
  });

  it('archives and restores trees without losing their nodes', () => {
    const { result } = renderHook(() => useAbilitySystem({ storage: localStorage, now: () => stamp, idFactory: ids() }));
    act(() => result.current.applyTreeDraft(draft()));
    const treeId = result.current.state.trees[0].id;
    act(() => result.current.archiveTree(treeId));
    expect(result.current.state.trees[0].status).toBe('archived');
    expect(result.current.state.nodes).toHaveLength(1);
    act(() => result.current.restoreTree(treeId));
    expect(result.current.state.trees[0].status).toBe('active');
  });

  it('keeps the previous state and exposes a recoverable persistence error', () => {
    const failing: StorageLike = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); }
    };
    const { result } = renderHook(() => useAbilitySystem({ storage: failing, now: () => stamp, idFactory: ids() }));
    act(() => result.current.applyTreeDraft(draft()));
    expect(result.current.state.trees).toEqual([]);
    expect(result.current.persistenceError).toBe('能力数据保存失败，原数据仍然保留');
    act(() => result.current.clearPersistenceError());
    expect(result.current.persistenceError).toBe('');
  });

  it('creates canvas children and undoes destructive branch changes', () => {
    const { result } = renderHook(() => useAbilitySystem({ storage: localStorage, now: () => stamp, idFactory: ids() }));
    act(() => result.current.applyTreeDraft(draft()));
    const parentId = result.current.state.nodes[0].id;
    let childId = '';
    act(() => { childId = result.current.addChildNode(parentId); });
    expect(result.current.state.dependencies.find((edge) => edge.dependentNodeId === childId)?.kind).toBe('primary');

    act(() => result.current.archiveNodeBranch(parentId));
    expect(result.current.state.nodes.every((node) => node.archivedAt)).toBe(true);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.state.nodes.every((node) => !node.archivedAt)).toBe(true);
  });

  it('persists reusable node resources and unlinks without deleting the original', () => {
    const { result } = renderHook(() => useAbilitySystem({ storage: localStorage, now: () => stamp, idFactory: ids() }));
    act(() => result.current.applyTreeDraft(draft()));
    const nodeId = result.current.state.nodes[0].id;

    act(() => result.current.addOrLinkResource(nodeId, {
      url: 'https://example.com/guide', title: '写作指南', type: 'article', note: '先看开头'
    }));
    const resourceId = result.current.state.resources[0].id;
    const linkId = result.current.state.resourceLinks[0].id;
    act(() => result.current.updateResource(resourceId, { title: '写作入门指南', note: '' }));
    act(() => result.current.unlinkResource(linkId));

    expect(result.current.state.resources[0].title).toBe('写作入门指南');
    expect(result.current.state.resourceLinks).toEqual([]);
    expect(JSON.parse(localStorage.getItem(ABILITY_STORAGE_KEY) ?? '{}').resources).toHaveLength(1);
  });
});
