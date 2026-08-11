import { describe, expect, it } from 'vitest';
import { loadCanvasPreferences, saveCanvasPreferences } from './abilityCanvasStorage';

describe('ability canvas preferences', () => {
  it('stores positions, collapsed branches, and viewport independently per tree', () => {
    saveCanvasPreferences(localStorage, 'tree-a', {
      positions: { root: { x: 12, y: 34 } },
      collapsedNodeIds: ['root'],
      viewport: { x: 90, y: 40, zoom: 0.8 }
    });
    saveCanvasPreferences(localStorage, 'tree-b', {
      positions: {}, collapsedNodeIds: [], viewport: { x: 0, y: 0, zoom: 1 }
    });

    expect(loadCanvasPreferences(localStorage, 'tree-a')).toEqual({
      positions: { root: { x: 12, y: 34 } },
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
          collapsedNodeIds: ['root', 42],
          viewport: { x: null, y: 10, zoom: 'huge' }
        }
      }
    }));

    expect(loadCanvasPreferences(localStorage, 'tree')).toEqual({
      positions: { valid: { x: 32, y: 48 } },
      collapsedNodeIds: ['root'],
      viewport: { x: 0, y: 0, zoom: 1 }
    });
  });
});
