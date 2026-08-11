import type { StorageLike } from '../lib/storage';
import type { CanvasPoint } from './abilityCanvasLayout';

const CANVAS_STORAGE_KEY = 'dice-life.ability-canvas.v1';

export type CanvasPreferences = {
  positions: Record<string, CanvasPoint>;
  collapsedNodeIds: string[];
  viewport: { x: number; y: number; zoom: number };
};

type CanvasStore = { trees: Record<string, CanvasPreferences> };

const defaults = (): CanvasPreferences => ({
  positions: {},
  collapsedNodeIds: [],
  viewport: { x: 0, y: 0, zoom: 1 }
});

function loadStore(storage: StorageLike): CanvasStore {
  try {
    const value = JSON.parse(storage.getItem(CANVAS_STORAGE_KEY) ?? 'null') as CanvasStore | null;
    return value && value.trees && typeof value.trees === 'object' ? value : { trees: {} };
  } catch {
    return { trees: {} };
  }
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizePreferences(value: unknown): CanvasPreferences {
  if (!value || typeof value !== 'object') return defaults();
  const saved = value as Partial<CanvasPreferences>;
  const positions = Object.fromEntries(Object.entries(saved.positions ?? {}).filter((entry): entry is [string, CanvasPoint] => {
    const point = entry[1];
    return !!point && typeof point === 'object' && Number.isFinite(point.x) && Number.isFinite(point.y);
  }));
  const viewport = saved.viewport;
  const viewportIsFinite = !!viewport && Number.isFinite(viewport.x) && Number.isFinite(viewport.y) && Number.isFinite(viewport.zoom) && viewport.zoom > 0;
  return {
    positions,
    collapsedNodeIds: Array.isArray(saved.collapsedNodeIds)
      ? saved.collapsedNodeIds.filter((id): id is string => typeof id === 'string')
      : [],
    viewport: viewportIsFinite ? {
      x: finiteNumber(viewport.x, 0),
      y: finiteNumber(viewport.y, 0),
      zoom: finiteNumber(viewport.zoom, 1)
    } : defaults().viewport
  };
}

export function loadCanvasPreferences(storage: StorageLike, treeId: string): CanvasPreferences {
  const saved = loadStore(storage).trees[treeId];
  if (!saved) return defaults();
  return sanitizePreferences(saved);
}

export function saveCanvasPreferences(storage: StorageLike, treeId: string, preferences: CanvasPreferences): void {
  const store = loadStore(storage);
  storage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({
    ...store,
    trees: { ...store.trees, [treeId]: sanitizePreferences(preferences) }
  }));
}
