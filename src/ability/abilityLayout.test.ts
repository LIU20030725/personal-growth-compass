import { describe, expect, it } from 'vitest';
import { layoutSkillTree } from './abilityLayout';
import type { AbilityState, SkillNode } from './types';

const stamp = '2026-08-02T00:00:00.000Z';

function makeNode(id: string, phaseId: string): SkillNode {
  return {
    id,
    skillTreeId: 'tree',
    phaseId,
    name: id,
    description: '',
    progress: 'available',
    masteryNote: '',
    archivedAt: null,
    createdAt: stamp,
    updatedAt: stamp
  };
}

function makeState(): AbilityState {
  return {
    schemaVersion: 1,
    trees: [{ id: 'tree', name: '前端', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [
      { id: 'phase-2', skillTreeId: 'tree', name: '实践', description: '', order: 2 },
      { id: 'phase-1', skillTreeId: 'tree', name: '基础', description: '', order: 1 }
    ],
    nodes: [
      makeNode('html', 'phase-1'),
      makeNode('css', 'phase-1'),
      makeNode('js', 'phase-1'),
      makeNode('react', 'phase-2')
    ],
    dependencies: [
      { id: 'edge-html-react', skillTreeId: 'tree', prerequisiteNodeId: 'html', dependentNodeId: 'react' }
    ],
    parallelGroups: [{ id: 'group-web', skillTreeId: 'tree', phaseId: 'phase-1', name: 'Web 基础', nodeIds: ['css', 'html'] }],
    masteryCriteria: [],
    taskLinks: [],
    outcomes: [{ id: 'site', skillTreeId: 'tree', skillNodeId: 'react', title: '个人网站', description: '', occurredOn: '2026-08-02', showOnTree: true, createdAt: stamp, updatedAt: stamp }],
    lastVisitedTreeId: 'tree'
  };
}

describe('ability tree layout', () => {
  it('is deterministic and sorts phases by order', () => {
    const state = makeState();
    const first = layoutSkillTree(state, 'tree');
    const second = layoutSkillTree(state, 'tree');
    expect(first).toEqual(second);
    expect(first.phases.map((phase) => phase.order)).toEqual([1, 2]);
  });

  it('keeps same-stage nodes in the same phase band with stable branch columns', () => {
    const result = layoutSkillTree(makeState(), 'tree');
    const basics = result.nodes.filter((item) => ['html', 'css', 'js'].includes(item.id));
    expect(new Set(basics.map((item) => item.row))).toEqual(new Set([0]));
    expect(basics.map((item) => item.column)).toEqual([2, 1, 3]);
  });

  it('renders visible outcomes without adding unlock edges', () => {
    const result = layoutSkillTree(makeState(), 'tree');
    const outcome = result.nodes.find((item) => item.id === 'site');
    expect(outcome?.kind).toBe('outcome');
    expect(result.unlockEdges.every((edge) => edge.toId !== 'site')).toBe(true);
  });

  it('handles empty, single-node, wide, and collapsed phases', () => {
    const empty = makeState();
    empty.nodes = [];
    empty.dependencies = [];
    empty.outcomes = [];
    expect(layoutSkillTree(empty, 'tree').nodes).toEqual([]);

    const single = makeState();
    single.nodes = [makeNode('only', 'phase-1')];
    single.dependencies = [];
    single.outcomes = [];
    expect(layoutSkillTree(single, 'tree').nodes[0].column).toBe(2);

    const wide = makeState();
    wide.nodes = Array.from({ length: 7 }, (_, index) => makeNode(`node-${index}`, 'phase-1'));
    wide.dependencies = [];
    wide.outcomes = [];
    const wideLayout = layoutSkillTree(wide, 'tree');
    expect(new Set(wideLayout.nodes.map((item) => item.row))).toEqual(new Set([0, 1]));

    const collapsed = layoutSkillTree(makeState(), 'tree', new Set(['phase-1']));
    expect(collapsed.nodes.some((item) => ['html', 'css', 'js'].includes(item.id))).toBe(false);
    expect(collapsed.phases.find((phase) => phase.id === 'phase-1')?.collapsed).toBe(true);
    expect(collapsed.nodes.find((item) => item.id === 'react')?.row).toBe(1);
  });
});
