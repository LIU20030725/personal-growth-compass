import { describe, expect, it } from 'vitest';
import {
  getNodeDisplayState,
  getNextActionCandidates,
  getNextActionEmptyReason,
  getCurrentPhase,
  getPhaseProgress,
  getTransitiveDependents,
  getTreeProgress,
  hasPrerequisiteWarning,
  selectDefaultTree,
  validateAbilityState
} from './abilityGraph';
import type { AbilityState, SkillNode } from './types';

const stamp = '2026-08-02T00:00:00.000Z';

function baseState(): AbilityState {
  return {
    schemaVersion: 2,
    trees: [
      { id: 'tree-a', name: '前端开发', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp },
      { id: 'tree-b', name: '摄影', description: '', role: 'side', status: 'active', focusedRank: null, createdAt: stamp, updatedAt: '2026-08-03T00:00:00.000Z' }
    ],
    phases: [
      { id: 'phase-a1', skillTreeId: 'tree-a', name: '基础', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 },
      { id: 'phase-a2', skillTreeId: 'tree-a', name: '实践', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 1 },
      { id: 'phase-b1', skillTreeId: 'tree-b', name: '基础', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 }
    ],
    nodes: [
      node('root', 'tree-a', 'phase-a1', 'available'),
      node('middle', 'tree-a', 'phase-a2', 'available'),
      node('leaf', 'tree-a', 'phase-a2', 'available')
    ],
    dependencies: [
      { id: 'edge-1', skillTreeId: 'tree-a', prerequisiteNodeId: 'root', dependentNodeId: 'middle' },
      { id: 'edge-2', skillTreeId: 'tree-a', prerequisiteNodeId: 'middle', dependentNodeId: 'leaf' }
    ],
    parallelGroups: [],
    masteryCriteria: [],
    taskLinks: [],
    outcomes: [],
    resources: [],
    resourceLinks: [],
    lastVisitedTreeId: null
  };
}

function node(id: string, treeId: string, phaseId: string, progress: SkillNode['progress']): SkillNode {
  return {
    id,
    skillTreeId: treeId,
    phaseId,
    name: id,
    description: '',
    progress,
    requiredForPhase: true,
    masteryNote: '',
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp
  };
}

describe('ability graph', () => {
  it('returns only unarchived, unmastered nodes with mastered primary prerequisites', () => {
    const state = baseState();
    state.nodes[0] = { ...state.nodes[0], progress: 'mastered' };
    state.nodes.push(node('auxiliary-target', 'tree-a', 'phase-a1', 'available'));
    state.nodes.push({ ...node('archived', 'tree-a', 'phase-a1', 'available'), archivedAt: stamp });
    state.dependencies.push({
      id: 'edge-auxiliary',
      skillTreeId: 'tree-a',
      prerequisiteNodeId: 'leaf',
      dependentNodeId: 'auxiliary-target',
      kind: 'auxiliary'
    });

    expect(getNextActionCandidates(state, 'tree-a').map((item) => item.id)).toEqual([
      'auxiliary-target',
      'middle'
    ]);
  });

  it('stably sorts parallel candidates by progress, phase, creation time, then id', () => {
    const state = baseState();
    state.dependencies = [];
    state.nodes = [
      { ...node('available-early-b', 'tree-a', 'phase-a1', 'available'), createdAt: '2026-08-01T00:00:00.000Z' },
      { ...node('in-progress-later-phase', 'tree-a', 'phase-a2', 'in_progress'), createdAt: '2026-08-04T00:00:00.000Z' },
      { ...node('available-later-phase', 'tree-a', 'phase-a2', 'available'), createdAt: '2026-08-01T00:00:00.000Z' },
      { ...node('available-early-a', 'tree-a', 'phase-a1', 'available'), createdAt: '2026-08-01T00:00:00.000Z' }
    ];

    expect(getNextActionCandidates(state, 'tree-a').map((item) => item.id)).toEqual([
      'in-progress-later-phase',
      'available-early-a',
      'available-early-b',
      'available-later-phase'
    ]);
  });

  it('reports an empty tree when there are no unarchived nodes', () => {
    const state = baseState();
    state.nodes = state.nodes.map((item) => ({ ...item, archivedAt: stamp }));

    expect(getNextActionEmptyReason(state, 'tree-a')).toBe('empty_tree');
  });

  it('reports all mastered when every unarchived node is mastered', () => {
    const state = baseState();
    state.nodes = state.nodes.map((item) => ({ ...item, progress: 'mastered' }));

    expect(getNextActionEmptyReason(state, 'tree-a')).toBe('all_mastered');
  });

  it('reports prerequisite blocking only when unfinished nodes have no candidates', () => {
    const state = baseState();
    state.nodes[0] = { ...state.nodes[0], archivedAt: stamp };

    expect(getNextActionCandidates(state, 'tree-a')).toEqual([]);
    expect(getNextActionEmptyReason(state, 'tree-a')).toBe('prerequisites_blocked');

    state.nodes[0] = { ...state.nodes[0], archivedAt: null };
    expect(getNextActionEmptyReason(state, 'tree-a')).toBeNull();
  });

  it('keeps every unstarted node available regardless of suggested predecessors', () => {
    const state = baseState();
    expect(getNodeDisplayState(state.nodes[0], state)).toBe('available');
    expect(getNodeDisplayState(state.nodes[1], state)).toBe('available');

    state.nodes[0] = { ...state.nodes[0], progress: 'mastered' };
    expect(getNodeDisplayState(state.nodes[1], state)).toBe('available');
  });

  it('keeps progressed descendants active and warns after a prerequisite is demoted', () => {
    const state = baseState();
    state.nodes[1] = { ...state.nodes[1], progress: 'in_progress' };

    expect(getNodeDisplayState(state.nodes[1], state)).toBe('in_progress');
    expect(hasPrerequisiteWarning(state.nodes[1], state)).toBe(true);
  });

  it('validates self, duplicate, cyclic, and cross-tree dependencies', () => {
    const self = baseState();
    self.dependencies.push({ id: 'self', skillTreeId: 'tree-a', prerequisiteNodeId: 'root', dependentNodeId: 'root' });
    expect(() => validateAbilityState(self)).toThrow('技能节点不能依赖自身');

    const duplicate = baseState();
    duplicate.dependencies.push({ id: 'duplicate', skillTreeId: 'tree-a', prerequisiteNodeId: 'root', dependentNodeId: 'middle' });
    expect(() => validateAbilityState(duplicate)).toThrow('不能重复添加相同依赖');

    const cycle = baseState();
    cycle.dependencies.push({ id: 'cycle', skillTreeId: 'tree-a', prerequisiteNodeId: 'leaf', dependentNodeId: 'root' });
    expect(() => validateAbilityState(cycle)).toThrow('技能树不能包含循环依赖');

    const crossTree = baseState();
    crossTree.nodes.push(node('camera', 'tree-b', 'phase-b1', 'available'));
    crossTree.dependencies.push({ id: 'cross', skillTreeId: 'tree-a', prerequisiteNodeId: 'camera', dependentNodeId: 'root' });
    expect(() => validateAbilityState(crossTree)).toThrow('依赖关系不能跨技能树');
  });

  it('validates parallel groups, outcomes, and unique ids while retaining archived relationships', () => {
    const badGroup = baseState();
    badGroup.nodes.push(node('camera', 'tree-b', 'phase-b1', 'available'));
    badGroup.parallelGroups.push({ id: 'group', skillTreeId: 'tree-a', phaseId: 'phase-a1', name: '', nodeIds: ['root', 'camera'] });
    expect(() => validateAbilityState(badGroup)).toThrow('并行节点必须属于同一技能树');

    const badOutcome = baseState();
    badOutcome.outcomes.push({ id: 'outcome', skillTreeId: 'tree-b', skillNodeId: 'root', title: '作品', description: '', occurredOn: '2026-08-02', showOnTree: false, createdAt: stamp, updatedAt: stamp });
    expect(() => validateAbilityState(badOutcome)).toThrow('成果关联节点必须属于同一技能树');

    const duplicateId = baseState();
    duplicateId.nodes[1] = { ...duplicateId.nodes[1], id: 'root' };
    expect(() => validateAbilityState(duplicateId)).toThrow('技能节点 ID 必须唯一');

    const archivedTarget = baseState();
    archivedTarget.nodes[1] = { ...archivedTarget.nodes[1], archivedAt: stamp };
    expect(() => validateAbilityState(archivedTarget)).not.toThrow();
  });

  it('rejects resource links that reference missing resources', () => {
    const state = baseState();
    state.resourceLinks.push({
      id: 'resource-link',
      skillNodeId: 'root',
      resourceId: 'missing-resource',
      createdAt: stamp
    });

    expect(() => validateAbilityState(state)).toThrow('资源关联引用了不存在的学习资源');
  });

  it('returns transitive descendants and tree progress', () => {
    const state = baseState();
    state.nodes[0] = { ...state.nodes[0], progress: 'mastered' };
    state.nodes[1] = { ...state.nodes[1], progress: 'in_progress' };

    expect(getTransitiveDependents(state, 'root')).toEqual(['middle', 'leaf']);
    expect(getTreeProgress(state, 'tree-a')).toEqual({ total: 3, mastered: 1, inProgress: 1, percent: 33 });
  });

  it('uses only required nodes for phase completion and current phase selection', () => {
    const state = baseState();
    state.nodes[0] = { ...state.nodes[0], progress: 'mastered' };
    state.nodes.push({ ...node('optional', 'tree-a', 'phase-a1', 'available'), requiredForPhase: false });

    expect(getPhaseProgress(state, 'phase-a1')).toEqual({ mastered: 1, required: 1, complete: true });
    expect(getCurrentPhase(state, 'tree-a')?.id).toBe('phase-a2');
  });

  it('returns explicit completed progress for empty and optional-only stages without blocking later work', () => {
    const state = baseState();
    state.nodes = state.nodes.filter((item) => item.phaseId !== 'phase-a1');
    expect(getPhaseProgress(state, 'phase-a1')).toEqual({ mastered: 0, required: 0, complete: true });

    state.nodes.push({ ...node('optional', 'tree-a', 'phase-a1', 'available'), requiredForPhase: false });
    expect(getPhaseProgress(state, 'phase-a1')).toEqual({ mastered: 0, required: 0, complete: true });
    expect(getCurrentPhase(state, 'tree-a')?.id).toBe('phase-a2');
  });

  it('selects last visited focused, ranked focused, then newest active tree', () => {
    const state = baseState();
    state.lastVisitedTreeId = 'tree-a';
    expect(selectDefaultTree(state)?.id).toBe('tree-a');

    state.lastVisitedTreeId = 'tree-b';
    expect(selectDefaultTree(state)?.id).toBe('tree-a');

    state.trees[0] = { ...state.trees[0], focusedRank: null };
    expect(selectDefaultTree(state)?.id).toBe('tree-b');

    state.trees = state.trees.map((tree) => ({ ...tree, status: 'archived' }));
    expect(selectDefaultTree(state)).toBeNull();
  });
});
