import { selectDefaultTree } from './abilityGraph';
import type { AbilityState } from './types';

export type AbilityRoute =
  | { kind: 'index' }
  | { kind: 'tree'; treeId: string }
  | { kind: 'invalid' };

export function parseAbilityPath(pathname: string): AbilityRoute {
  if (/^\/ability\/?$/.test(pathname)) return { kind: 'index' };
  const match = pathname.match(/^\/ability\/trees\/([^/]+)\/?$/);
  if (!match) return { kind: 'invalid' };
  try {
    return { kind: 'tree', treeId: decodeURIComponent(match[1]) };
  } catch {
    return { kind: 'invalid' };
  }
}

export function abilityTreePath(treeId: string): string {
  return `/ability/trees/${encodeURIComponent(treeId)}`;
}

export function resolveAbilityTreeId(
  state: AbilityState,
  route: AbilityRoute
): { treeId: string | null; notice: string } {
  if (route.kind === 'tree') {
    const requested = state.trees.find((tree) => tree.id === route.treeId && tree.status === 'active');
    if (requested) return { treeId: requested.id, notice: '' };
  }
  const fallback = selectDefaultTree(state);
  return {
    treeId: fallback?.id ?? null,
    notice: route.kind === 'tree' || route.kind === 'invalid' ? '技能树不存在，已返回能力首页' : ''
  };
}

export function pushAbilityTree(treeId: string): void {
  window.history.pushState({}, '', abilityTreePath(treeId));
}

export function replaceAbilityTree(treeId: string): void {
  window.history.replaceState({}, '', abilityTreePath(treeId));
}

export function replaceAbilityIndex(): void {
  window.history.replaceState({}, '', '/ability');
}
