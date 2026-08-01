import { describe, expect, it } from 'vitest';
import {
  addCriterion,
  addOutcome,
  archiveNode,
  archiveTree,
  demoteNode,
  getNodeRemovalMode,
  linkTask,
  masterNode,
  removeEmptyNode,
  removeOutcome,
  reorderFocusedTrees,
  replaceNodeDependencies,
  restoreTree,
  setOutcomeTreeVisibility,
  startNode,
  toggleCriterion,
  unlinkTask,
  updateTree,
  upsertParallelGroup
} from './abilityEngine';
import type { AbilityState, SkillNode } from './types';

const before = '2026-08-01T00:00:00.000Z';
const now = '2026-08-02T00:00:00.000Z';

function node(id: string, phaseId: string, progress: SkillNode['progress'] = 'available'): SkillNode {
  return { id, skillTreeId: 'tree', phaseId, name: id, description: '', progress, masteryNote: '', archivedAt: null, createdAt: before, updatedAt: before };
}

function state(): AbilityState {
  return {
    schemaVersion: 1,
    trees: [
      { id: 'tree', name: '前端', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: before, updatedAt: before },
      { id: 'tree-2', name: '写作', description: '', role: 'side', status: 'active', focusedRank: null, createdAt: before, updatedAt: before }
    ],
    phases: [
      { id: 'phase-1', skillTreeId: 'tree', name: '基础', description: '', order: 0 },
      { id: 'phase-2', skillTreeId: 'tree', name: '实践', description: '', order: 1 }
    ],
    nodes: [node('root', 'phase-1'), node('child', 'phase-2')],
    dependencies: [{ id: 'edge', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'child' }],
    parallelGroups: [],
    masteryCriteria: [],
    taskLinks: [],
    outcomes: [],
    lastVisitedTreeId: 'tree'
  };
}

describe('ability engine', () => {
  it('updates, focuses, archives, and restores trees', () => {
    let next = updateTree(state(), 'tree', { name: '全栈开发', role: 'main' }, now);
    expect(next.trees[0]).toMatchObject({ name: '全栈开发', updatedAt: now });
    next = reorderFocusedTrees(next, ['tree-2', 'tree'], now);
    expect(next.trees.map((tree) => tree.focusedRank)).toEqual([2, 1]);
    next = archiveTree(next, 'tree-2', now);
    expect(next.trees[1]).toMatchObject({ status: 'archived', focusedRank: null });
    next = restoreTree(next, 'tree-2', now);
    expect(next.trees[1].status).toBe('active');
  });

  it('starts only unlocked nodes and requires a note for early mastery', () => {
    expect(() => startNode(state(), 'child', now)).toThrow('前置技能尚未掌握');
    let next = startNode(state(), 'root', now);
    expect(next.nodes[0].progress).toBe('in_progress');
    next = addCriterion(next, 'root', '完成语义化页面', 'criterion');
    expect(() => masterNode(next, 'root', '', now)).toThrow('请填写提前掌握说明');
    next = masterNode(next, 'root', '已有项目证明', now);
    expect(next.nodes[0]).toMatchObject({ progress: 'mastered', masteryNote: '已有项目证明' });
    expect(startNode(next, 'child', now).nodes[1].progress).toBe('in_progress');
  });

  it('allows checked criteria mastery and keeps descendants after demotion', () => {
    let next = addCriterion(state(), 'root', '完成语义化页面', 'criterion');
    next = toggleCriterion(next, 'criterion');
    next = masterNode(next, 'root', '', now);
    next = startNode(next, 'child', now);
    next = demoteNode(next, 'root', now);
    expect(next.nodes.find((item) => item.id === 'root')?.progress).toBe('in_progress');
    expect(next.nodes.find((item) => item.id === 'child')?.progress).toBe('in_progress');
  });

  it('replaces dependencies and validates parallel groups', () => {
    let next = replaceNodeDependencies(state(), 'child', [], []);
    expect(next.dependencies).toEqual([]);
    next = upsertParallelGroup(next, { id: 'group', skillTreeId: 'tree', phaseId: 'phase-1', name: '并行基础', nodeIds: ['root'] });
    expect(next.parallelGroups).toHaveLength(1);
    expect(() => upsertParallelGroup(next, { id: 'bad', skillTreeId: 'tree', phaseId: 'phase-1', name: '', nodeIds: ['child'] })).toThrow('并行节点必须属于同一阶段');
  });

  it('links tasks without owning them and records tree outcomes', () => {
    let next = linkTask(state(), 'root', 'task-1', 'link-1');
    expect(next.taskLinks[0]).toMatchObject({ skillNodeId: 'root', taskId: 'task-1' });
    next = unlinkTask(next, 'link-1');
    expect(next.taskLinks).toEqual([]);

    next = addOutcome(next, { skillTreeId: 'tree', skillNodeId: 'root', title: '个人网站', description: '已上线', occurredOn: '2026-08-02', showOnTree: false }, 'outcome', now);
    next = setOutcomeTreeVisibility(next, 'outcome', true, now);
    expect(next.outcomes[0].showOnTree).toBe(true);
    const withoutOutcome = removeOutcome(next, 'outcome');
    expect(withoutOutcome.outcomes).toEqual([]);
    expect(withoutOutcome.nodes).toEqual(next.nodes);
  });

  it('deletes only empty nodes and archives nodes with relationships', () => {
    const base = state();
    expect(getNodeRemovalMode(base, 'root')).toBe('archive');
    const archived = archiveNode(base, 'child', now);
    expect(archived.nodes[1].archivedAt).toBe(now);
    expect(archived.dependencies).toEqual([]);

    const empty: AbilityState = { ...base, dependencies: [], nodes: [node('orphan', 'phase-1')] };
    expect(getNodeRemovalMode(empty, 'orphan')).toBe('delete');
    expect(removeEmptyNode(empty, 'orphan').nodes).toEqual([]);
  });
});
