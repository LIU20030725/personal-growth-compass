import { describe, expect, it } from 'vitest';
import { layoutAbilityCanvas, type AbilityCanvasEdge } from './abilityCanvasLayout';
import type { AbilityState, SkillNode } from './types';

const stamp = '2026-08-02T00:00:00.000Z';

function node(id: string): SkillNode {
  return { id, skillTreeId: 'tree', phaseId: 'phase', name: id, description: '', progress: 'available', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp };
}

function stateWithEmptySecondPhase(): AbilityState {
  const base = state();
  return {
    ...base,
    phases: [
      ...base.phases,
      { id: 'phase-2', skillTreeId: 'tree', name: '实战阶段', description: '', estimatedDuration: '2 周', requiredNodePolicy: 'all_required', order: 1 }
    ]
  };
}

function state(): AbilityState {
  return {
    schemaVersion: 2,
    trees: [{ id: 'tree', name: '自媒体', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [{ id: 'phase', skillTreeId: 'tree', name: '成长路线', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 }],
    nodes: ['root', 'writing', 'video', 'growth', 'analysis'].map(node),
    dependencies: [
      { id: 'root-writing', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'writing', kind: 'primary' },
      { id: 'root-video', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'video', kind: 'primary' },
      { id: 'root-growth', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'growth', kind: 'primary' },
      { id: 'growth-analysis', skillTreeId: 'tree', prerequisiteNodeId: 'growth', dependentNodeId: 'analysis', kind: 'primary' },
      { id: 'video-analysis', skillTreeId: 'tree', prerequisiteNodeId: 'video', dependentNodeId: 'analysis', kind: 'auxiliary' }
    ],
    parallelGroups: [{ id: 'group', skillTreeId: 'tree', phaseId: 'phase', name: '可并行', nodeIds: ['writing', 'video'], parentNodeId: 'root', continuationNodeId: 'growth' }],
    masteryCriteria: [], taskLinks: [], outcomes: [], resources: [], resourceLinks: [], lastVisitedTreeId: 'tree'
  };
}

function branchingState(childCount: number, withGrandchild = false): AbilityState {
  const childIds = Array.from({ length: childCount }, (_, index) => `child-${index + 1}`);
  const nodes = ['root', ...childIds, ...(withGrandchild ? ['grandchild'] : [])].map(node);
  const dependencies = childIds.map((childId) => ({
    id: `root-${childId}`,
    skillTreeId: 'tree',
    prerequisiteNodeId: 'root',
    dependentNodeId: childId,
    kind: 'primary' as const
  }));
  if (withGrandchild) dependencies.push({
    id: 'child-1-grandchild',
    skillTreeId: 'tree',
    prerequisiteNodeId: 'child-1',
    dependentNodeId: 'grandchild',
    kind: 'primary'
  });
  return {
    ...state(),
    nodes,
    dependencies,
    parallelGroups: []
  };
}

function branchX(edge: AbilityCanvasEdge): number | undefined {
  return (edge as AbilityCanvasEdge & { branchX?: number }).branchX;
}

describe('ability canvas layout', () => {
  it('keeps an empty second stage visible as a first-class canvas column', () => {
    const layout = layoutAbilityCanvas(stateWithEmptySecondPhase(), 'tree');

    expect(layout.phases.map((phase) => phase.id)).toEqual(['phase', 'phase-2']);
    expect(layout.phases[1]).toMatchObject({ nodeCount: 0 });
    expect(layout.phases[1].x).toBeGreaterThan(layout.phases[0].x);
    expect(layout.phases.every((phase) => phase.x % 16 === 0 && phase.width % 16 === 0)).toBe(true);
  });

  it('lays serial learning left-to-right and sibling branches vertically', () => {
    const layout = layoutAbilityCanvas(state(), 'tree');
    const byId = new Map(layout.nodes.map((item) => [item.id, item]));

    expect(byId.get('writing')?.x).toBeGreaterThan(byId.get('root')?.x ?? 0);
    expect(byId.get('writing')?.x).toBe(byId.get('video')?.x);
    expect(byId.get('writing')?.y).not.toBe(byId.get('video')?.y);
    expect(byId.get('growth')?.x).toBeGreaterThan(byId.get('video')?.x ?? 0);
  });

  it('renders primary arrows, faint auxiliary relations, and a parallel container', () => {
    const layout = layoutAbilityCanvas(state(), 'tree');

    expect(layout.edges.find((edge) => edge.id === 'video-analysis')?.kind).toBe('auxiliary');
    expect(layout.groups[0]).toMatchObject({ id: 'group', name: '可并行' });
    expect(layout.edges.filter((edge) => edge.toId === 'growth').map((edge) => edge.fromId).sort()).toEqual(['video', 'writing']);
  });

  it('hides descendants of collapsed nodes and preserves manual positions', () => {
    const layout = layoutAbilityCanvas(state(), 'tree', {
      collapsedNodeIds: new Set(['root']),
      manualPositions: { root: { x: 88, y: 144 } }
    });

    expect(layout.nodes.map((item) => item.id)).toEqual(['root']);
    expect(layout.nodes[0]).toMatchObject({ x: 96, y: 144, hiddenChildCount: 3 });
    expect(layout.edges).toEqual([]);
  });

  it.each([3, 5])('uses one stable branch bus for %i direct parallel children', (childCount) => {
    const layout = layoutAbilityCanvas(branchingState(childCount), 'tree');
    const rootEdges = layout.edges.filter((edge) => edge.fromId === 'root');

    expect(rootEdges).toHaveLength(childCount);
    expect(new Set(rootEdges.map(branchX))).toEqual(new Set([224]));
  });

  it('computes a distinct aligned branch bus for every tree depth', () => {
    const layout = layoutAbilityCanvas(branchingState(3, true), 'tree');
    const firstDepth = layout.edges.find((edge) => edge.id === 'root-child-1');
    const secondDepth = layout.edges.find((edge) => edge.id === 'child-1-grandchild');

    expect(branchX(firstDepth as AbilityCanvasEdge)).toBe(224);
    expect(branchX(secondDepth as AbilityCanvasEdge)).toBe(496);
  });

  it('snaps manual positions to the 16px canvas grid before persisting layout geometry', () => {
    const layout = layoutAbilityCanvas(branchingState(3), 'tree', {
      manualPositions: { root: { x: 91, y: 151 }, 'child-1': { x: 353, y: 299 } }
    });
    const byId = new Map(layout.nodes.map((item) => [item.id, item]));

    expect(byId.get('root')).toMatchObject({ x: 96, y: 144 });
    expect(byId.get('child-1')).toMatchObject({ x: 352, y: 304 });
    expect(branchX(layout.edges.find((edge) => edge.id === 'root-child-1') as AbilityCanvasEdge)).toBe(320);
  });

  it('restores exact depth and sibling alignment when manual positions are reset', () => {
    const stateWithBranches = branchingState(5);
    const moved = layoutAbilityCanvas(stateWithBranches, 'tree', {
      manualPositions: { 'child-3': { x: 401, y: 117 } }
    });
    const reset = layoutAbilityCanvas(stateWithBranches, 'tree', { manualPositions: {} });
    const movedChild = moved.nodes.find((item) => item.id === 'child-3');
    const resetChildren = reset.nodes.filter((item) => item.id.startsWith('child-'));

    expect(movedChild?.x).not.toBe(resetChildren[0]?.x);
    expect(new Set(resetChildren.map((item) => item.x))).toEqual(new Set([272]));
    expect(resetChildren.map((item) => item.y)).toEqual([0, 144, 288, 432, 576]);
  });
});
