import { getDependencyKind, getPrimaryChildren, getPrimaryParent } from './abilityGraph';
import type { AbilityState } from './types';

export type CanvasPoint = { x: number; y: number };

export type AbilityCanvasLayoutOptions = {
  collapsedNodeIds?: ReadonlySet<string>;
  manualPositions?: Record<string, CanvasPoint>;
  /** Absolute top-left positions for phase containers. */
  manualPhasePositions?: Record<string, CanvasPoint>;
  /** Alias matching the persisted CanvasPreferences field. */
  phasePositions?: Record<string, CanvasPoint>;
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

export type AbilityCanvasPhaseEdge = {
  id: string;
  fromPhaseId: string;
  toPhaseId: string;
  from: CanvasPoint;
  to: CanvasPoint;
};

export type AbilityCanvasGroup = CanvasPoint & {
  id: string;
  name: string;
  width: number;
  height: number;
  nodeIds: string[];
};

export type AbilityCanvasPhase = CanvasPoint & {
  id: string;
  name: string;
  description: string;
  estimatedDuration: string;
  width: number;
  height: number;
  nodeCount: number;
};

export type AbilityCanvasLayout = {
  phases: AbilityCanvasPhase[];
  phaseEdges: AbilityCanvasPhaseEdge[];
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
const PHASE_PADDING_X = 32;
const PHASE_GAP = 32;
const PHASE_MIN_WIDTH = 320;
const PHASE_HEADER_SPACE = 80;
const PHASE_BOTTOM_SPACE = 64;
const PHASE_MIN_HEIGHT = 320;

function snapCoordinate(value: number): number {
  return Math.round(value / CANVAS_GRID) * CANVAS_GRID;
}

function isFiniteCanvasPoint(point: CanvasPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
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

  const orderedPhases = state.phases
    .filter((phase) => phase.skillTreeId === treeId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  let phaseCursorX = -PHASE_PADDING_X;
  const phaseWidths = new Map<string, number>();
  orderedPhases.forEach((phase) => {
    const members = visibleNodes.filter((node) => node.phaseId === phase.id);
    const memberPoints = members.map((node) => positions.get(node.id)).filter((point): point is CanvasPoint => !!point);
    const minX = memberPoints.length ? Math.min(...memberPoints.map((point) => point.x)) : 0;
    const maxX = memberPoints.length ? Math.max(...memberPoints.map((point) => point.x)) : minX;
    const width = snapCoordinate(Math.max(PHASE_MIN_WIDTH, maxX - minX + NODE_WIDTH + PHASE_PADDING_X * 2));
    members.forEach((node) => {
      const point = positions.get(node.id);
      if (point) point.x = snapCoordinate(phaseCursorX + PHASE_PADDING_X + point.x - minX);
    });
    phaseWidths.set(phase.id, width);
    phaseCursorX = snapCoordinate(phaseCursorX + width + PHASE_GAP);
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
    if (positions.has(id) && isFiniteCanvasPoint(point)) positions.set(id, snapCanvasPoint(point));
  }

  const skillPoints = [...positions.values()];
  const phaseY = snapCoordinate((skillPoints.length ? Math.min(...skillPoints.map((point) => point.y)) : 0) - PHASE_HEADER_SPACE);
  const phaseBottom = snapCoordinate((skillPoints.length ? Math.max(...skillPoints.map((point) => point.y)) + NODE_HEIGHT : 160) + PHASE_BOTTOM_SPACE);
  const phaseHeight = Math.ceil(Math.max(PHASE_MIN_HEIGHT, phaseBottom - phaseY) / (CANVAS_GRID * 2)) * CANVAS_GRID * 2;
  let phaseX = -PHASE_PADDING_X;
  const phases: AbilityCanvasPhase[] = orderedPhases.map((phase) => {
    const width = phaseWidths.get(phase.id) ?? PHASE_MIN_WIDTH;
    const item = {
      id: phase.id,
      name: phase.name,
      description: phase.description,
      estimatedDuration: phase.estimatedDuration,
      x: phaseX,
      y: phaseY,
      width,
      height: phaseHeight,
      nodeCount: visibleNodes.filter((node) => node.phaseId === phase.id).length
    };
    phaseX = snapCoordinate(phaseX + width + PHASE_GAP);
    return item;
  });
  const manualPhasePositions = options.manualPhasePositions ?? options.phasePositions ?? {};
  phases.forEach((phase) => {
    const requestedPosition = manualPhasePositions[phase.id];
    if (!requestedPosition || !isFiniteCanvasPoint(requestedPosition)) return;
    const nextPosition = snapCanvasPoint(requestedPosition);
    const delta = { x: nextPosition.x - phase.x, y: nextPosition.y - phase.y };
    phase.x = nextPosition.x;
    phase.y = nextPosition.y;
    visibleNodes.filter((node) => node.phaseId === phase.id).forEach((node) => {
      const point = positions.get(node.id);
      if (!point) return;
      point.x += delta.x;
      point.y += delta.y;
    });
  });
  const phaseEdges: AbilityCanvasPhaseEdge[] = phases.slice(0, -1).map((phase, index) => {
    const nextPhase = phases[index + 1];
    return {
      id: `phase-order-${phase.id}-${nextPhase.id}`,
      fromPhaseId: phase.id,
      toPhaseId: nextPhase.id,
      from: { x: phase.x + phase.width, y: phase.y + phase.height / 2 },
      to: { x: nextPhase.x, y: nextPhase.y + nextPhase.height / 2 }
    };
  });

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
    nodes.push({
      id: outcome.id,
      kind: 'outcome',
      ...snapCanvasPoint({ x: parent.x + 38, y: parent.y + 92 }),
      hiddenChildCount: 0
    });
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

  return { phases, phaseEdges, nodes, edges, groups };
}
