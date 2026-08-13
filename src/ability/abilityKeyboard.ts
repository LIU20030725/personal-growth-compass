import type { AbilityState } from './types';
import { getDependencyKind } from './abilityGraph';

export type AbilityCanvasCommand =
  | 'rename'
  | 'add-child'
  | 'add-sibling'
  | 'delete-branch'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste-child'
  | 'select-parent'
  | 'select-first-child'
  | 'select-previous-sibling'
  | 'select-next-sibling'
  | 'select-first-sibling'
  | 'select-last-sibling'
  | 'clear-selection'
  | 'show-shortcuts';

export type AbilityKeyboardEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

export type AbilityKeyboardTarget = {
  tagName?: string;
  contentEditable?: boolean;
  insideMenu?: boolean;
  insideDialog?: boolean;
};

export function resolveAbilityCanvasCommand(
  event: AbilityKeyboardEvent,
  target: AbilityKeyboardTarget,
  selection: { selectedNodeIds: readonly string[] }
): AbilityCanvasCommand | null {
  if (event.key === 'Tab') return null;
  const tagName = target.tagName?.toLowerCase();
  if (target.contentEditable || target.insideMenu || target.insideDialog || (tagName && ['input', 'textarea', 'select', 'button', 'a'].includes(tagName))) return null;
  if (selection.selectedNodeIds.length !== 1) return null;
  if (event.altKey || (event.ctrlKey && event.metaKey)) return null;
  const command = event.ctrlKey !== event.metaKey;
  const plain = !event.ctrlKey && !event.metaKey;
  const key = event.key.toLowerCase();
  if (command && key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (command && key === 'y' && !event.shiftKey) return 'redo';
  if (command && key === 'c' && !event.shiftKey) return 'copy';
  if (command && key === 'v' && !event.shiftKey) return 'paste-child';
  if (command && event.key === 'Enter') return event.shiftKey ? 'add-sibling' : 'add-child';
  if (!plain) return null;
  if (!event.shiftKey && (event.key === 'Enter' || event.key === 'F2')) return 'rename';
  if (!event.shiftKey && (event.key === 'Delete' || event.key === 'Backspace')) return 'delete-branch';
  const navigation: Partial<Record<string, AbilityCanvasCommand>> = {
    ArrowLeft: 'select-parent',
    ArrowRight: 'select-first-child',
    ArrowUp: 'select-previous-sibling',
    ArrowDown: 'select-next-sibling',
    Home: 'select-first-sibling',
    End: 'select-last-sibling'
  };
  if (!event.shiftKey && navigation[event.key]) return navigation[event.key] ?? null;
  if (!event.shiftKey && event.key === 'Escape') return 'clear-selection';
  if (event.key === '?') return 'show-shortcuts';
  return null;
}

export function getKeyboardNavigationTarget(
  state: AbilityState,
  nodeId: string,
  command: Extract<AbilityCanvasCommand, `select-${string}`>
): string | null {
  const selected = state.nodes.find((node) => node.id === nodeId && !node.archivedAt);
  if (!selected) return null;
  const activeNodes = state.nodes.filter((node) => node.skillTreeId === selected.skillTreeId && !node.archivedAt);
  const activeIds = new Set(activeNodes.map((node) => node.id));
  const continuationGroups = state.parallelGroups.filter((group) =>
    group.skillTreeId === selected.skillTreeId &&
    group.continuationNodeId &&
    activeIds.has(group.continuationNodeId) &&
    group.nodeIds.some((id) => activeIds.has(id))
  );
  const suppressedContinuations = new Set(continuationGroups.map((group) => group.continuationNodeId as string));
  const visibleEdges = state.dependencies
    .filter((edge) => edge.skillTreeId === selected.skillTreeId && activeIds.has(edge.prerequisiteNodeId) && activeIds.has(edge.dependentNodeId))
    .filter((edge) => getDependencyKind(state, edge) === 'primary')
    .filter((edge) => !suppressedContinuations.has(edge.dependentNodeId))
    .map((edge) => ({ parentId: edge.prerequisiteNodeId, childId: edge.dependentNodeId }));
  continuationGroups.forEach((group) => group.nodeIds
    .filter((id) => activeIds.has(id))
    .forEach((memberId) => visibleEdges.push({ parentId: memberId, childId: group.continuationNodeId as string })));
  const stableNodes = (ids: Set<string>) => activeNodes
    .filter((node) => ids.has(node.id))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  if (command === 'select-parent') {
    const parentIds = new Set(visibleEdges.filter((edge) => edge.childId === nodeId).map((edge) => edge.parentId));
    return stableNodes(parentIds)[0]?.id ?? null;
  }
  if (command === 'select-first-child') {
    const childIds = new Set(visibleEdges.filter((edge) => edge.parentId === nodeId).map((edge) => edge.childId));
    return stableNodes(childIds)[0]?.id ?? null;
  }
  const parentId = stableNodes(new Set(visibleEdges.filter((edge) => edge.childId === nodeId).map((edge) => edge.parentId)))[0]?.id;
  if (!parentId) return null;
  const siblingIds = new Set(visibleEdges.filter((edge) => edge.parentId === parentId).map((edge) => edge.childId));
  const siblings = stableNodes(siblingIds);
  const index = siblings.findIndex((node) => node.id === nodeId);
  if (index < 0) return null;
  if (command === 'select-previous-sibling') return siblings[index - 1]?.id ?? null;
  if (command === 'select-next-sibling') return siblings[index + 1]?.id ?? null;
  if (command === 'select-first-sibling') return siblings[0]?.id ?? null;
  if (command === 'select-last-sibling') return siblings[siblings.length - 1]?.id ?? null;
  return null;
}
