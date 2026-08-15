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

function stateWithTwoPopulatedPhases(): AbilityState {
  const base = stateWithEmptySecondPhase();
  return {
    ...base,
    nodes: base.nodes.map((item) => ['growth', 'analysis'].includes(item.id) ? { ...item, phaseId: 'phase-2' } : item),
    outcomes: [{
      id: 'outcome-analysis',
      skillTreeId: 'tree',
      skillNodeId: 'analysis',
      title: 'Analysis result',
      description: '',
      occurredOn: '2026-08-14',
      showOnTree: true,
      createdAt: stamp,
      updatedAt: stamp
    }]
  };
}

function stateWithThreePhasesOutOfStorageOrder(): AbilityState {
  const base = stateWithEmptySecondPhase();
  return {
    ...base,
    phases: [
      { id: 'phase-3', skillTreeId: 'tree', name: 'Third', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 2 },
      ...base.phases
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
  it('connects phases in order from each right center to the next left center', () => {
    const layout = layoutAbilityCanvas(stateWithEmptySecondPhase(), 'tree');
    const first = layout.phases[0];
    const second = layout.phases[1];

    expect(layout.phaseEdges).toEqual([{
      id: 'phase-order-phase-phase-2',
      fromPhaseId: 'phase',
      toPhaseId: 'phase-2',
      from: { x: first.x + first.width, y: first.y + first.height / 2 },
      to: { x: second.x, y: second.y + second.height / 2 }
    }]);
  });

  it('emits one stable order edge for every adjacent pair across multiple phases', () => {
    const layout = layoutAbilityCanvas(stateWithThreePhasesOutOfStorageOrder(), 'tree');

    expect(layout.phases.map((item) => item.id)).toEqual(['phase', 'phase-2', 'phase-3']);
    expect(layout.phaseEdges.map((edge) => [edge.fromPhaseId, edge.toPhaseId])).toEqual([
      ['phase', 'phase-2'],
      ['phase-2', 'phase-3']
    ]);
    expect(layout.phaseEdges.every((edge, index) => (
      edge.from.x === layout.phases[index].x + layout.phases[index].width
      && edge.from.y === layout.phases[index].y + layout.phases[index].height / 2
      && edge.to.x === layout.phases[index + 1].x
      && edge.to.y === layout.phases[index + 1].y + layout.phases[index + 1].height / 2
    ))).toBe(true);
  });

  it('moves a phase, its skill nodes, and outcomes together from an absolute snapped top-left', () => {
    const canvasState = stateWithTwoPopulatedPhases();
    const automatic = layoutAbilityCanvas(canvasState, 'tree');
    const moved = layoutAbilityCanvas(canvasState, 'tree', {
      manualPhasePositions: { 'phase-2': { x: 997, y: 413 } }
    });
    const autoPhase = automatic.phases.find((item) => item.id === 'phase-2')!;
    const movedPhase = moved.phases.find((item) => item.id === 'phase-2')!;
    const autoSkill = automatic.nodes.find((item) => item.id === 'analysis')!;
    const movedSkill = moved.nodes.find((item) => item.id === 'analysis')!;
    const autoOutcome = automatic.nodes.find((item) => item.id === 'outcome-analysis')!;
    const movedOutcome = moved.nodes.find((item) => item.id === 'outcome-analysis')!;
    const delta = { x: movedPhase.x - autoPhase.x, y: movedPhase.y - autoPhase.y };

    expect(movedPhase).toMatchObject({ x: 992, y: 416 });
    expect({ x: movedSkill.x - autoSkill.x, y: movedSkill.y - autoSkill.y }).toEqual(delta);
    expect({ x: movedOutcome.x - autoOutcome.x, y: movedOutcome.y - autoOutcome.y }).toEqual(delta);
    expect({ x: movedOutcome.x - movedSkill.x, y: movedOutcome.y - movedSkill.y }).toEqual(
      { x: autoOutcome.x - autoSkill.x, y: autoOutcome.y - autoSkill.y }
    );
  });

  it('keeps manual node positions absolute while moving other phase members and their outcomes', () => {
    const canvasState = stateWithTwoPopulatedPhases();
    const manualPositions = { analysis: { x: 1201, y: 305 } };
    const automatic = layoutAbilityCanvas(canvasState, 'tree', { manualPositions });
    const moved = layoutAbilityCanvas(canvasState, 'tree', {
      manualPositions,
      phasePositions: { 'phase-2': { x: 992, y: 416 } }
    });
    const autoPhase = automatic.phases.find((item) => item.id === 'phase-2')!;
    const movedPhase = moved.phases.find((item) => item.id === 'phase-2')!;
    const autoGrowth = automatic.nodes.find((item) => item.id === 'growth')!;
    const movedGrowth = moved.nodes.find((item) => item.id === 'growth')!;
    const movedAnalysis = moved.nodes.find((item) => item.id === 'analysis')!;
    const movedOutcome = moved.nodes.find((item) => item.id === 'outcome-analysis')!;
    const requestedPhaseDelta = { x: 992 - autoPhase.x, y: 416 - autoPhase.y };

    expect(movedAnalysis).toMatchObject({ x: 1200, y: 304 });
    expect({ x: movedGrowth.x - autoGrowth.x, y: movedGrowth.y - autoGrowth.y }).toEqual(requestedPhaseDelta);
    expect(movedPhase.y).toBeLessThanOrEqual(movedAnalysis.y - 80);
    expect({ x: movedOutcome.x - movedAnalysis.x, y: movedOutcome.y - movedAnalysis.y }).toEqual({ x: 32, y: 96 });
  });

  it('keeps phase movement stable when a manual node y is far outside automatic bounds', () => {
    const canvasState = stateWithTwoPopulatedPhases();
    const phasePositions = { 'phase-2': { x: 992, y: -5003 } };
    const baseline = layoutAbilityCanvas(canvasState, 'tree', { phasePositions });
    const reloaded = layoutAbilityCanvas(canvasState, 'tree', {
      manualPositions: { analysis: { x: 1201, y: -4003 } },
      phasePositions
    });
    const baselineGrowth = baseline.nodes.find((item) => item.id === 'growth')!;
    const reloadedGrowth = reloaded.nodes.find((item) => item.id === 'growth')!;
    const reloadedAnalysis = reloaded.nodes.find((item) => item.id === 'analysis')!;
    const reloadedPhase = reloaded.phases.find((item) => item.id === 'phase-2')!;
    const phaseEdgeCoordinates = reloaded.phaseEdges.flatMap((edge) => [edge.from.x, edge.from.y, edge.to.x, edge.to.y]);

    expect(reloadedGrowth).toMatchObject({ x: baselineGrowth.x, y: baselineGrowth.y });
    expect(reloadedAnalysis).toMatchObject({ x: 1200, y: -4000 });
    expect(reloadedPhase).toMatchObject({ x: 992, y: -5008 });
    expect(reloadedPhase.y + reloadedPhase.height).toBeGreaterThanOrEqual(reloadedAnalysis.y + 80 + 64);
    expect(phaseEdgeCoordinates.every(Number.isFinite)).toBe(true);
    expect(phaseEdgeCoordinates.every((value) => value % 16 === 0)).toBe(true);
  });

  it.each([
    ['left', { x: -401, y: 144 }],
    ['right', { x: 1601, y: 144 }],
    ['top', { x: 96, y: -401 }],
    ['bottom', { x: 96, y: 1201 }]
  ] as const)('expands the assigned phase toward a node dragged %s without changing membership', (_, point) => {
    const canvasState = state();
    const layout = layoutAbilityCanvas(canvasState, 'tree', { manualPositions: { root: point } });
    const phase = layout.phases.find((item) => item.id === 'phase')!;
    const root = layout.nodes.find((item) => item.id === 'root')!;

    expect(canvasState.nodes.find((item) => item.id === 'root')?.phaseId).toBe('phase');
    expect(root.x).toBeGreaterThanOrEqual(phase.x + 32);
    expect(root.y).toBeGreaterThanOrEqual(phase.y + 80);
    expect(root.x + 176 + 32).toBeLessThanOrEqual(phase.x + phase.width);
    expect(root.y + 80 + 64).toBeLessThanOrEqual(phase.y + phase.height);
    expect([phase.x, phase.y, phase.width, phase.height].every((value) => Number.isFinite(value) && value % 16 === 0)).toBe(true);
  });

  it('shrinks a phase back to its automatic rectangle after an outlying node returns', () => {
    const canvasState = state();
    const automatic = layoutAbilityCanvas(canvasState, 'tree');
    const expanded = layoutAbilityCanvas(canvasState, 'tree', {
      manualPositions: { root: { x: -401, y: -401 } }
    });
    const returned = layoutAbilityCanvas(canvasState, 'tree', {
      manualPositions: { root: automatic.nodes.find((item) => item.id === 'root')! }
    });

    expect(expanded.phases[0].width).toBeGreaterThan(automatic.phases[0].width);
    expect(expanded.phases[0].height).toBeGreaterThan(automatic.phases[0].height);
    expect(returned.phases).toEqual(automatic.phases);
  });

  it('restores automatic phase and member alignment when phase positions are cleared', () => {
    const canvasState = stateWithTwoPopulatedPhases();
    const automatic = layoutAbilityCanvas(canvasState, 'tree');
    const moved = layoutAbilityCanvas(canvasState, 'tree', {
      phasePositions: { 'phase-2': { x: 1024, y: 448 } }
    });
    const reset = layoutAbilityCanvas(canvasState, 'tree', { phasePositions: {} });

    expect(moved.phases).not.toEqual(automatic.phases);
    expect(reset.phases).toEqual(automatic.phases);
    expect(reset.nodes).toEqual(automatic.nodes);
    expect(reset.phaseEdges).toEqual(automatic.phaseEdges);
  });

  it('ignores non-finite manual points and keeps all layout geometry finite and grid-aligned', () => {
    const layout = layoutAbilityCanvas(stateWithTwoPopulatedPhases(), 'tree', {
      manualPositions: { root: { x: Number.NaN, y: Number.POSITIVE_INFINITY } },
      manualPhasePositions: { 'phase-2': { x: Number.NEGATIVE_INFINITY, y: Number.NaN } }
    });
    const coordinates = [
      ...layout.phases.flatMap((item) => [item.x, item.y, item.width, item.height]),
      ...layout.nodes.flatMap((item) => [item.x, item.y]),
      ...layout.groups.flatMap((item) => [item.x, item.y, item.width, item.height]),
      ...layout.edges.map((item) => item.branchX),
      ...layout.phaseEdges.flatMap((item) => [item.from.x, item.from.y, item.to.x, item.to.y])
    ];

    expect(coordinates.every(Number.isFinite)).toBe(true);
    expect(coordinates.every((value) => value % 16 === 0)).toBe(true);
  });

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
