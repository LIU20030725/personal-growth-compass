import { describe, expect, it } from 'vitest';
import type { CanvasPreferences } from '../abilityCanvasStorage';
import { applyCanvasDragPreference, isCanvasPaneTarget } from './AbilityTreeStage';

const preferences: CanvasPreferences = {
  positions: { skill: { x: 32, y: 48 } },
  phasePositions: {},
  collapsedNodeIds: [],
  viewport: { x: 0, y: 0, zoom: 1 }
};

describe('AbilityTreeStage canvas drag preferences', () => {
  it('persists an absolute snapped phase position separately from skill positions', () => {
    expect(applyCanvasDragPreference(preferences, 'phase:practice', { x: 999, y: 415 })).toEqual({
      ...preferences,
      phasePositions: { practice: { x: 992, y: 416 } }
    });
  });

  it('persists an absolute snapped skill position without changing phase positions', () => {
    expect(applyCanvasDragPreference(preferences, 'skill', { x: 113, y: 79 })).toEqual({
      ...preferences,
      positions: { skill: { x: 112, y: 80 } }
    });
  });

  it('recognizes only the React Flow pane as canvas whitespace', () => {
    const pane = document.createElement('div');
    pane.className = 'react-flow__pane';
    const node = document.createElement('div');
    node.className = 'react-flow__node';

    expect(isCanvasPaneTarget(pane)).toBe(true);
    expect(isCanvasPaneTarget(node)).toBe(false);
  });
});
