import { getDependencyKind, getPrimaryChildren, getPrimaryParent } from './abilityGraph';
import type { AbilityState } from './types';

export type CanvasPoint = { x: number; y: number };

export type AbilityCanvasLayoutOptions = {
  collapsedNodeIds?: ReadonlySet<string>;
  manualPositions?: Record<string, CanvasPoint>;
};

export type AbilityCanvasNode = CanvasPoint & {
  id: string;
  kind: 'skill' | 'outcome';
  hiddenChildCount: number;
};

export type AbilityCanvasEdge = {
  id: string;
  fromId: string;
  toId: string;
  kind: 'primary' | 'auxiliary';
  branchX: number;
};

export type AbilityCanvasGroup = CanvasPoint & {
  id: string;
  name: string;
  width: number;
  height: number;
  nodeIds: string[];
};

export type AbilityCanvasLayout = {
  nodes: AbilityCanvasNode[];
  edges: AbilityCanvasEdge[];
  groups: AbilityCanvasGroup[];
};

export const CANVAS_GRID = 16;
export const COLUMN_GAP = 272;
export const ROW_GAP = 144;
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 80;
export const BRANCH_X_OFFSET = 224;
const GROUP_PADDING_X = 32;
const GROUP_PADDING_TOP = 64;
const GROUP_PADDING_BOTTOM = 32;

function snapCoordinate(value: number): number {
  return Math.round(value / CANVAS_GRID) * CANVAS_GRID;
}

export function snapCanvasPoint(point: CanvasPoint): CanvasPoint {
  return { x: snapCoordinate(point.x), y: snapCoordinate(point.y) };
}

export function layoutAbilityCanvas(
  state: AbilityState,
  treeId: string,
  options: AbilityCanvasLayoutOptions = {}
): AbilityCanvasLayout {
  const collapsed = options.collapsedNodeIds ?? new Set<string>();
  const activeNodes = state.nodes
    .filter((node) => node.skillTreeId === treeId && !node.archivedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const activeIds = new Set(activeNodes.map((node) => node.id));
  const hiddenIds = new Set<string>();

  const hideDescendants = (nodeId: string): void => {
    for (const child of getPrimaryChildren(state, nodeId)) {
      if (!activeIds.has(child.id) || hiddenIds.has(child.id)) continue;
      hiddenIds.add(child.id);
      hideDescendants(child.id);
    }
  };
  collapsed.forEach((nodeId) => hideDescendants(nodeId));

  const visibleNodes = activeNodes.filter((node) => !hiddenIds.has(node.id));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const positions = new Map<string, CanvasPoint>();
  let nextLeafRow = 0;

  const place = (nodeId: string, depth: number, visiting = new Set<string>()): number => {
    if (positions.has(nodeId)) return positions.get(nodeId)?.y ?? 0;
    if (visiting.has(nodeId)) return nextLeafRow * ROW_GAP;
    visiting.add(nodeId);
    const children = getPrimaryChildren(state, nodeId)
      .filter((child) => visibleIds.has(child.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    let y: number;
    if (children.length && !collapsed.has(nodeId)) {
      const childYs = children.map((child) => place(child.id, depth + 1, new Set(visiting)));
      y = snapCoordinate((childYs[0] + childYs[childYs.length - 1]) / 2);
    } else {
      y = nextLeafRow * ROW_GAP;
      nextLeafRow += 1;
    }
    positions.set(nodeId, { x: depth * COLUMN_GAP, y });
    return y;
  };

  const roots = visibleNodes.filter((node) => {
    const parent = getPrimaryParent(state, node.id);
    return !parent || !visibleIds.has(parent.id);
  });
  roots.forEach((root) => place(root.id, 0));
  visibleNodes.forEach((node) => {
    if (!positions.has(node.id)) place(node.id, 0);
  });

  const explicitGroups = state.parallelGroups.filter((group) => group.skillTreeId === treeId);
  for (const group of explicitGroups) {
    if (!group.continuationNodeId || !visibleIds.has(group.continuationNodeId)) continue;
    const memberPositions = group.nodeIds.map((id) => positions.get(id)).filter((point): point is CanvasPoint => !!point);
    if (!memberPositions.length) continue;
    const continuation = positions.get(group.continuationNodeId);
    if (!continuation) continue;
    continuation.x = snapCoordinate(Math.max(...memberPositions.map((point) => point.x)) + COLUMN_GAP);
    continuation.y = snapCoordinate(memberPositions.reduce((sum, point) => sum + point.y, 0) / memberPositions.length);
  }

  for (const [id, point] of Object.entries(options.manualPositions ?? {})) {
    if (positions.has(id)) positions.set(id, snapCanvasPoint(point));
  }

  const nodes: AbilityCanvasNode[] = visibleNodes.map((node) => ({
    id: node.id,
    kind: 'skill',
    ...(positions.get(node.id) ?? { x: 0, y: 0 }),
    hiddenChildCount: collapsed.has(node.id)
      ? getPrimaryChildren(state, node.id).filter((child) => activeIds.has(child.id)).length
      : 0
  }));

  for (const outcome of state.outcomes.filter((item) => item.skillTreeId === treeId && item.showOnTree)) {
    const parent = outcome.skillNodeId ? positions.get(outcome.skillNodeId) : undefined;
    if (!parent || (outcome.skillNodeId && !visibleIds.has(outcome.skillNodeId))) continue;
    nodes.push({ id: outcome.id, kind: 'outcome', x: parent.x + 38, y: parent.y + 92, hiddenChildCount: 0 });
  }

  const continuationById = new Map(
    explicitGroups.filter((group) => group.continuationNodeId).map((group) => [group.continuationNodeId as string, group])
  );
  const edges: AbilityCanvasEdge[] = state.dependencies
    .filter((edge) => edge.skillTreeId === treeId && visibleIds.has(edge.prerequisiteNodeId) && visibleIds.has(edge.dependentNodeId))
    .filter((edge) => !(getDependencyKind(state, edge) === 'primary' && continuationById.has(edge.dependentNodeId)))
    .map((edge) => ({
      id: edge.id,
      fromId: edge.prerequisiteNodeId,
      toId: edge.dependentNodeId,
      kind: getDependencyKind(state, edge),
      branchX: (positions.get(edge.prerequisiteNodeId)?.x ?? 0) + BRANCH_X_OFFSET
    }));
  explicitGroups.forEach((group) => {
    if (!group.continuationNodeId || !visibleIds.has(group.continuationNodeId)) return;
    group.nodeIds.filter((id) => visibleIds.has(id)).forEach((nodeId) => edges.push({
      id: `merge-${group.id}-${nodeId}`,
      fromId: nodeId,
      toId: group.continuationNodeId as string,
      kind: 'primary',
      branchX: (positions.get(nodeId)?.x ?? 0) + BRANCH_X_OFFSET
    }));
  });

  const groups: AbilityCanvasGroup[] = [];
  const groupedIds = new Set<string>();
  const addGroup = (id: string, name: string, nodeIds: string[]): void => {
    const members = nodeIds.filter((nodeId) => visibleIds.has(nodeId) && positions.has(nodeId));
    if (members.length < 2) return;
    members.forEach((nodeId) => groupedIds.add(nodeId));
    const points = members.map((nodeId) => positions.get(nodeId) as CanvasPoint);
    const minX = Math.min(...points.map((point) => point.x)) - GROUP_PADDING_X;
    const maxX = Math.max(...points.map((point) => point.x)) + NODE_WIDTH + GROUP_PADDING_X;
    const minY = Math.min(...points.map((point) => point.y)) - GROUP_PADDING_TOP;
    const maxY = Math.max(...points.map((point) => point.y)) + NODE_HEIGHT + GROUP_PADDING_BOTTOM;
    groups.push({ id, name, nodeIds: members, x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  };
  explicitGroups.forEach((group) => addGroup(group.id, group.name || '可并行', group.nodeIds));
  visibleNodes.forEach((parent) => {
    const children = getPrimaryChildren(state, parent.id)
      .filter((child) => visibleIds.has(child.id) && !groupedIds.has(child.id) && !continuationById.has(child.id))
      .map((child) => child.id);
    if (children.length > 1) addGroup(`auto-${parent.id}`, '可并行', children);
  });

  return { nodes, edges, groups };
}
