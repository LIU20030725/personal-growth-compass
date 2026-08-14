import { describe, expect, it } from 'vitest';
import { createCanvasPreferenceHistory } from './abilityCanvasHistory';
import { layoutAbilityCanvas } from './abilityCanvasLayout';
import { getNextActionCandidates } from './abilityGraph';
import { createInitialAbilityState } from './abilityStorage';
import type { AbilityState, LearningPhase, SkillNode } from './types';

const stamp = '2026-08-14T00:00:00.000Z';

function stage(id: string, order: number, name = id): LearningPhase {
  return { id, skillTreeId: 'tree', name, description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order };
}

function node(id: string, phaseId: string, progress: SkillNode['progress'] = 'available'): SkillNode {
  return {
    id, skillTreeId: 'tree', phaseId, name: `节点 ${id}`, description: '', progress,
    requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: `${stamp}-${id}`, updatedAt: stamp
  };
}

function state(phases: LearningPhase[], nodes: SkillNode[]): AbilityState {
  return {
    ...createInitialAbilityState(),
    trees: [{ id: 'tree', name: '验收树', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases,
    nodes,
    lastVisitedTreeId: 'tree'
  };
}

describe('Ability V4 independent acceptance boundaries', () => {
  it('keeps zero, one, duplicate-title, and extremely long stages finite and ordered', () => {
    expect(layoutAbilityCanvas(state([], []), 'tree')).toMatchObject({ phases: [], phaseEdges: [], nodes: [] });

    const longTitle = '一个非常长但不应破坏坐标系统的学习阶段标题'.repeat(12);
    const phases = [stage('p3', 2, longTitle), stage('p1', 0, '重复标题'), stage('p2', 1, '重复标题')];
    const layout = layoutAbilityCanvas(state(phases, [node('a', 'p1')]), 'tree');
    const coordinates = [
      ...layout.phases.flatMap((item) => [item.x, item.y, item.width, item.height]),
      ...layout.phaseEdges.flatMap((edge) => [edge.from.x, edge.from.y, edge.to.x, edge.to.y])
    ];

    expect(layout.phases.map((item) => item.id)).toEqual(['p1', 'p2', 'p3']);
    expect(layout.phases.map((item) => item.name)).toEqual(['重复标题', '重复标题', longTitle]);
    expect(layout.phaseEdges).toHaveLength(2);
    expect(coordinates.every(Number.isFinite)).toBe(true);
  });

  it('uses stage order only for recommendation priority, never as an unlock dependency', () => {
    const phases = [stage('later', 20), stage('earlier', -5)];
    const ability = state(phases, [node('later-node', 'later'), node('early-node', 'earlier')]);

    expect(getNextActionCandidates(ability, 'tree').map((item) => item.id)).toEqual(['early-node', 'later-node']);
    expect(getNextActionCandidates(ability, 'tree')).toHaveLength(2);
  });

  it('ignores orphan and non-finite stage positions while keeping extreme finite points snapped', () => {
    const ability = state([stage('phase', 0)], [node('root', 'phase')]);
    const layout = layoutAbilityCanvas(ability, 'tree', {
      phasePositions: {
        orphan: { x: 128, y: 128 },
        phase: { x: 1_000_003, y: -1_000_003 }
      },
      manualPositions: { missing: { x: Number.NaN, y: Number.POSITIVE_INFINITY } }
    });

    expect(layout.phases).toHaveLength(1);
    expect(layout.phases[0]).toMatchObject({ id: 'phase', x: 1_000_000, y: -1_000_000 });
    expect(layout.nodes.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y))).toBe(true);
  });

  it('starts each tree and each reload with isolated, selection-free canvas history', () => {
    const base = { positions: {}, phasePositions: {}, collapsedNodeIds: [], viewport: { x: 0, y: 0, zoom: 1 } };
    const treeA = createCanvasPreferenceHistory(base);
    const treeB = createCanvasPreferenceHistory({ ...base, positions: { b: { x: 16, y: 32 } } });
    const reloadedA = createCanvasPreferenceHistory(treeA.present);

    expect(treeA).toMatchObject({ past: [], future: [] });
    expect(treeB.present.positions).toEqual({ b: { x: 16, y: 32 } });
    expect(reloadedA).toEqual(treeA);
  });

  it('lays out a representative 20-stage, 200-node route without invalid geometry', () => {
    const phases = Array.from({ length: 20 }, (_, index) => stage(`phase-${index}`, index));
    const nodes = Array.from({ length: 200 }, (_, index) => node(`node-${String(index).padStart(3, '0')}`, `phase-${Math.floor(index / 10)}`, index === 0 ? 'in_progress' : 'available'));
    const ability = state(phases, nodes);
    ability.dependencies = nodes.slice(1).map((item, index) => ({
      id: `edge-${index}`,
      skillTreeId: 'tree',
      prerequisiteNodeId: nodes[index].id,
      dependentNodeId: item.id,
      kind: 'primary'
    }));

    const started = performance.now();
    const layout = layoutAbilityCanvas(ability, 'tree');
    const durationMs = performance.now() - started;
    const coordinates = [
      ...layout.phases.flatMap((item) => [item.x, item.y, item.width, item.height]),
      ...layout.nodes.flatMap((item) => [item.x, item.y]),
      ...layout.edges.map((item) => item.branchX)
    ];

    expect(layout.phases).toHaveLength(20);
    expect(layout.nodes).toHaveLength(200);
    expect(layout.edges).toHaveLength(199);
    expect(coordinates.every(Number.isFinite)).toBe(true);
    expect(durationMs).toBeLessThan(1_000);
  });
});
