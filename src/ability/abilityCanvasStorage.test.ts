import { describe, expect, it } from 'vitest';
import { loadCanvasPreferences, saveCanvasPreferences } from './abilityCanvasStorage';

describe('ability canvas preferences', () => {
  it('loads legacy preferences without phase positions as an empty record', () => {
    localStorage.setItem('dice-life.ability-canvas.v1', JSON.stringify({
      trees: {
        legacy: {
          positions: { root: { x: 16, y: 32 } },
          collapsedNodeIds: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        }
      }
    }));

    expect(loadCanvasPreferences(localStorage, 'legacy').phasePositions).toEqual({});
  });

  it('stores positions, collapsed branches, and viewport independently per tree', () => {
    saveCanvasPreferences(localStorage, 'tree-a', {
      positions: { root: { x: 12, y: 34 } },
      phasePositions: {},
      collapsedNodeIds: ['root'],
      viewport: { x: 90, y: 40, zoom: 0.8 }
    });
    saveCanvasPreferences(localStorage, 'tree-b', {
      positions: {}, phasePositions: {}, collapsedNodeIds: [], viewport: { x: 0, y: 0, zoom: 1 }
    });

    expect(loadCanvasPreferences(localStorage, 'tree-a')).toEqual({
      positions: { root: { x: 12, y: 34 } },
      phasePositions: {},
      collapsedNodeIds: ['root'],
      viewport: { x: 90, y: 40, zoom: 0.8 }
    });
    expect(loadCanvasPreferences(localStorage, 'tree-b').viewport.zoom).toBe(1);
  });

  it('drops invalid coordinates and restores a finite viewport from damaged persisted preferences', () => {
    localStorage.setItem('dice-life.ability-canvas.v1', JSON.stringify({
      trees: {
        tree: {
          positions: { valid: { x: 32, y: 48 }, nullish: { x: null, y: 16 }, text: { x: 'bad', y: 16 } },
          phasePositions: {
            valid: { x: 64, y: 80 },
            nan: { x: Number.NaN, y: 16 },
            infinite: { x: 16, y: Number.POSITIVE_INFINITY }
          },
          collapsedNodeIds: ['root', 42],
          viewport: { x: null, y: 10, zoom: 'huge' }
        }
      }
    }));

    expect(loadCanvasPreferences(localStorage, 'tree')).toEqual({
      positions: { valid: { x: 32, y: 48 } },
      phasePositions: { valid: { x: 64, y: 80 } },
      collapsedNodeIds: ['root'],
      viewport: { x: 0, y: 0, zoom: 1 }
    });
  });

  it('persists only finite phase points through the public save interface', () => {
    saveCanvasPreferences(localStorage, 'tree', {
      positions: {},
      phasePositions: {
        valid: { x: 160, y: 96 },
        nan: { x: Number.NaN, y: 16 },
        infinite: { x: 16, y: Number.POSITIVE_INFINITY }
      },
      collapsedNodeIds: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    });

    expect(loadCanvasPreferences(localStorage, 'tree').phasePositions).toEqual({
      valid: { x: 160, y: 96 }
    });
  });
});
