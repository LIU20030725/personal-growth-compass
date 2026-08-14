import { describe, expect, it } from 'vitest';
import { createInitialAbilityState } from './abilityStorage';
import { buildAbilityVisibleGraph } from './abilityView';
import type { AbilityState, SkillNode } from './types';

const stamp = '2026-08-12T00:00:00.000Z';

function node(id: string, phaseId: string, progress: SkillNode['progress']): SkillNode {
  return {
    id,
    skillTreeId: 'tree',
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

function state(): AbilityState {
  return {
    ...createInitialAbilityState(),
    trees: [{ id: 'tree', name: '写作', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [
      { id: 'phase-1', skillTreeId: 'tree', name: '基础', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 },
      { id: 'phase-2', skillTreeId: 'tree', name: '实践', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 1 }
    ],
    nodes: [node('mastered', 'phase-1', 'mastered'), node('active', 'phase-2', 'in_progress'), node('next', 'phase-2', 'available'), node('archived', 'phase-2', 'available')],
    dependencies: [
      { id: 'edge-1', skillTreeId: 'tree', prerequisiteNodeId: 'mastered', dependentNodeId: 'active', kind: 'primary' },
      { id: 'edge-2', skillTreeId: 'tree', prerequisiteNodeId: 'active', dependentNodeId: 'next', kind: 'primary' }
    ],
    parallelGroups: [{ id: 'group', skillTreeId: 'tree', phaseId: 'phase-2', name: '可并行', nodeIds: ['active', 'next', 'archived'] }],
    outcomes: [
      { id: 'shown', skillTreeId: 'tree', skillNodeId: 'active', title: '已发布', description: '', occurredOn: '2026-08-12', showOnTree: true, createdAt: stamp, updatedAt: stamp },
      { id: 'hidden', skillTreeId: 'tree', skillNodeId: 'mastered', title: '不上树', description: '', occurredOn: '2026-08-12', showOnTree: false, createdAt: stamp, updatedAt: stamp }
    ],
    lastVisitedTreeId: 'tree'
  };
}

describe('ability visible graph', () => {
  it('derives next nodes, edges, groups, outcomes and selection from one visible id set', () => {
    const current = state();
    current.nodes[3] = { ...current.nodes[3], archivedAt: stamp };

    const visible = buildAbilityVisibleGraph(current, 'tree', 'next', 'mastered');

    expect(visible.nodes.map((item) => item.id)).toEqual(['active', 'next']);
    expect(visible.dependencies.map((item) => item.id)).toEqual(['edge-2']);
    expect(visible.parallelGroups).toEqual([expect.objectContaining({ nodeIds: ['active', 'next'] })]);
    expect(visible.outcomes.map((item) => item.id)).toEqual(['shown']);
    expect(visible.selectedNodeId).toBeNull();
  });

  it('does not retain one-member groups or outcomes from hidden nodes', () => {
    const visible = buildAbilityVisibleGraph(state(), 'tree', 'mastered', 'mastered');

    expect(visible.nodes.map((item) => item.id)).toEqual(['mastered']);
    expect(visible.dependencies).toEqual([]);
    expect(visible.parallelGroups).toEqual([]);
    expect(visible.outcomes).toEqual([]);
    expect(visible.selectedNodeId).toBe('mastered');
  });
});
