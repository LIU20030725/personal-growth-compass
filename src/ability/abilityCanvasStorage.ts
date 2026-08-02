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

export function loadCanvasPreferences(storage: StorageLike, treeId: string): CanvasPreferences {
  const saved = loadStore(storage).trees[treeId];
  if (!saved) return defaults();
  return {
    positions: saved.positions ?? {},
    collapsedNodeIds: Array.isArray(saved.collapsedNodeIds) ? saved.collapsedNodeIds : [],
    viewport: saved.viewport ?? { x: 0, y: 0, zoom: 1 }
  };
}

export function saveCanvasPreferences(storage: StorageLike, treeId: string, preferences: CanvasPreferences): void {
  const store = loadStore(storage);
  storage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({
    ...store,
    trees: { ...store.trees, [treeId]: preferences }
  }));
}
