import { TREE_LAYOUT } from './abilityConfig';
import type { AbilityState, LearningPhase, SkillNode } from './types';

export type LayoutNode = {
  id: string;
  kind: 'skill' | 'outcome';
  phaseId: string;
  row: number;
  column: number;
  x: number;
  y: number;
};

export type TreeLayout = {
  width: number;
  height: number;
  phases: Array<{
    id: string;
    name: string;
    order: number;
    row: number;
    collapsed: boolean;
  }>;
  nodes: LayoutNode[];
  unlockEdges: Array<{ id: string; fromId: string; toId: string }>;
};

const columnOrder = [2, 1, 3, 0, 4];

function sortPhaseNodes(state: AbilityState, phase: LearningPhase, nodes: SkillNode[]): SkillNode[] {
  const groupOrder = new Map<string, number>();
  const memberOrder = new Map<string, number>();
  state.parallelGroups
    .filter((group) => group.phaseId === phase.id)
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((group, groupIndex) => {
      group.nodeIds.forEach((nodeId, nodeIndex) => {
        groupOrder.set(nodeId, groupIndex);
        memberOrder.set(nodeId, nodeIndex);
      });
    });
  return [...nodes].sort((a, b) => {
    const aGroup = groupOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bGroup = groupOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aGroup !== bGroup) return aGroup - bGroup;
    const aMember = memberOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bMember = memberOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aMember !== bMember) return aMember - bMember;
    return a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id);
  });
}

function position(row: number, column: number): { x: number; y: number } {
  return {
    x: column * TREE_LAYOUT.columnWidth + TREE_LAYOUT.columnWidth / 2,
    y: row * TREE_LAYOUT.rowHeight + TREE_LAYOUT.rowHeight / 2
  };
}

export function layoutSkillTree(
  state: AbilityState,
  treeId: string,
  collapsedPhaseIds: ReadonlySet<string> = new Set()
): TreeLayout {
  const phases = state.phases
    .filter((phase) => phase.skillTreeId === treeId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const layoutNodes: LayoutNode[] = [];
  const layoutPhases: TreeLayout['phases'] = [];
  let nextRow = 0;

  for (const phase of phases) {
    const collapsed = collapsedPhaseIds.has(phase.id);
    layoutPhases.push({
      id: phase.id,
      name: phase.name,
      order: phase.order,
      row: nextRow,
      collapsed
    });
    if (collapsed) {
      nextRow += 1;
      continue;
    }

    const phaseNodes = sortPhaseNodes(
      state,
      phase,
      state.nodes.filter((node) => node.phaseId === phase.id && !node.archivedAt)
    );
    phaseNodes.forEach((node, index) => {
      const row = nextRow + Math.floor(index / TREE_LAYOUT.columns);
      const column = columnOrder[index % TREE_LAYOUT.columns];
      layoutNodes.push({ id: node.id, kind: 'skill', phaseId: phase.id, row, column, ...position(row, column) });
    });
    nextRow += Math.max(1, Math.ceil(phaseNodes.length / TREE_LAYOUT.columns));
  }

  const visibleSkillNodes = new Map(
    layoutNodes.filter((node) => node.kind === 'skill').map((node) => [node.id, node])
  );
  const fallbackPhase = layoutPhases.at(-1);
  let unlinkedOutcomeIndex = 0;
  for (const outcome of state.outcomes
    .filter((item) => item.skillTreeId === treeId && item.showOnTree)
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id))) {
    const parent = outcome.skillNodeId ? visibleSkillNodes.get(outcome.skillNodeId) : undefined;
    if (parent) {
      layoutNodes.push({
        id: outcome.id,
        kind: 'outcome',
        phaseId: parent.phaseId,
        row: parent.row,
        column: parent.column,
        x: parent.x + 72,
        y: parent.y + 72
      });
    } else if (fallbackPhase) {
      const row = Math.max(nextRow, fallbackPhase.row + 1) + Math.floor(unlinkedOutcomeIndex / TREE_LAYOUT.columns);
      const column = columnOrder[unlinkedOutcomeIndex % TREE_LAYOUT.columns];
      layoutNodes.push({ id: outcome.id, kind: 'outcome', phaseId: fallbackPhase.id, row, column, ...position(row, column) });
      unlinkedOutcomeIndex += 1;
    }
  }

  const visibleIds = new Set(visibleSkillNodes.keys());
  const unlockEdges = state.dependencies
    .filter((edge) => edge.skillTreeId === treeId && visibleIds.has(edge.prerequisiteNodeId) && visibleIds.has(edge.dependentNodeId))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((edge) => ({ id: edge.id, fromId: edge.prerequisiteNodeId, toId: edge.dependentNodeId }));
  const maxRow = layoutNodes.reduce((max, node) => Math.max(max, node.row), Math.max(0, nextRow - 1));

  return {
    width: TREE_LAYOUT.columns * TREE_LAYOUT.columnWidth,
    height: phases.length ? (maxRow + 1) * TREE_LAYOUT.rowHeight : 0,
    phases: layoutPhases,
    nodes: layoutNodes,
    unlockEdges
  };
}
