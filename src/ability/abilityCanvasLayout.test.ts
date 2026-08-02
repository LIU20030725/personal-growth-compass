import { describe, expect, it } from 'vitest';
import { layoutAbilityCanvas } from './abilityCanvasLayout';
import type { AbilityState, SkillNode } from './types';

const stamp = '2026-08-02T00:00:00.000Z';

function node(id: string): SkillNode {
  return { id, skillTreeId: 'tree', phaseId: 'phase', name: id, description: '', progress: 'available', masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp };
}

function state(): AbilityState {
  return {
    schemaVersion: 1,
    trees: [{ id: 'tree', name: '自媒体', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [{ id: 'phase', skillTreeId: 'tree', name: '成长路线', description: '', order: 0 }],
    nodes: ['root', 'writing', 'video', 'growth', 'analysis'].map(node),
    dependencies: [
      { id: 'root-writing', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'writing', kind: 'primary' },
      { id: 'root-video', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'video', kind: 'primary' },
      { id: 'root-growth', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'growth', kind: 'primary' },
      { id: 'growth-analysis', skillTreeId: 'tree', prerequisiteNodeId: 'growth', dependentNodeId: 'analysis', kind: 'primary' },
      { id: 'video-analysis', skillTreeId: 'tree', prerequisiteNodeId: 'video', dependentNodeId: 'analysis', kind: 'auxiliary' }
    ],
    parallelGroups: [{ id: 'group', skillTreeId: 'tree', phaseId: 'phase', name: '可并行', nodeIds: ['writing', 'video'], parentNodeId: 'root', continuationNodeId: 'growth' }],
    masteryCriteria: [], taskLinks: [], outcomes: [], lastVisitedTreeId: 'tree'
  };
}

describe('ability canvas layout', () => {
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
    expect(layout.nodes[0]).toMatchObject({ x: 88, y: 144, hiddenChildCount: 3 });
    expect(layout.edges).toEqual([]);
  });
});
