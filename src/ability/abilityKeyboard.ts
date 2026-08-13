import type { AbilityState } from './types';

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

export type AbilityKeyboardEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

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
  const command = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (command && key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (command && key === 'y') return 'redo';
  if (command && key === 'c') return 'copy';
  if (command && key === 'v') return 'paste-child';
  if (command && event.key === 'Enter') return event.shiftKey ? 'add-sibling' : 'add-child';
  if (event.key === 'Enter' || event.key === 'F2') return 'rename';
  if (event.key === 'Delete' || event.key === 'Backspace') return 'delete-branch';
  const navigation: Partial<Record<string, AbilityCanvasCommand>> = {
    ArrowLeft: 'select-parent',
    ArrowRight: 'select-first-child',
    ArrowUp: 'select-previous-sibling',
    ArrowDown: 'select-next-sibling',
    Home: 'select-first-sibling',
    End: 'select-last-sibling'
  };
  if (navigation[event.key]) return navigation[event.key] ?? null;
  if (event.key === 'Escape') return 'clear-selection';
  if (event.key === '?') return 'show-shortcuts';
  return null;
}

export function getKeyboardNavigationTarget(
  state: AbilityState,
  nodeId: string,
  command: Extract<AbilityCanvasCommand, `select-${string}`>
): string | null {
  const primary = state.dependencies.filter((edge) => (edge.kind ?? 'primary') === 'primary');
  if (command === 'select-parent') {
    const parentId = primary.find((edge) => edge.dependentNodeId === nodeId)?.prerequisiteNodeId;
    return state.nodes.some((node) => node.id === parentId && !node.archivedAt) ? parentId ?? null : null;
  }
  if (command === 'select-first-child') {
    const childIds = new Set(primary.filter((edge) => edge.prerequisiteNodeId === nodeId).map((edge) => edge.dependentNodeId));
    return state.nodes
      .filter((node) => childIds.has(node.id) && !node.archivedAt)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))[0]?.id ?? null;
  }
  const parentId = primary.find((edge) => edge.dependentNodeId === nodeId)?.prerequisiteNodeId;
  if (!parentId) return null;
  const siblingIds = new Set(primary.filter((edge) => edge.prerequisiteNodeId === parentId).map((edge) => edge.dependentNodeId));
  const siblings = state.nodes
    .filter((node) => siblingIds.has(node.id) && !node.archivedAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  const index = siblings.findIndex((node) => node.id === nodeId);
  if (index < 0) return null;
  if (command === 'select-previous-sibling') return siblings[index - 1]?.id ?? null;
  if (command === 'select-next-sibling') return siblings[index + 1]?.id ?? null;
  if (command === 'select-first-sibling') return siblings[0]?.id ?? null;
  if (command === 'select-last-sibling') return siblings[siblings.length - 1]?.id ?? null;
  return null;
}
