import { describe, expect, it } from 'vitest';
import { layoutAbilityCanvas } from '../abilityCanvasLayout';
import type { CanvasPreferences } from '../abilityCanvasStorage';
import { createInitialAbilityState } from '../abilityStorage';
import {
  applyCanvasDragPreference,
  applyCanvasPreferenceChange,
  applyPhaseDragPreference,
  createCanvasPreferenceHistory,
  consumeFocusRequest,
  isCanvasPaneTarget,
  redoCanvasPreferenceChange,
  resetCanvasLayoutPreferences,
  undoCanvasPreferenceChange
} from './AbilityTreeStage';

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

  it('moves saved manual members by the snapped phase drag delta', () => {
    const current = {
      ...preferences,
      positions: { member: { x: 112, y: 80 }, outside: { x: 320, y: 160 } },
      phasePositions: { practice: { x: 992, y: 416 } }
    };
    expect(applyPhaseDragPreference(current, 'practice', { x: 992, y: 416 }, { x: 1025, y: 449 }, ['member'])).toEqual({
      ...current,
      positions: { member: { x: 144, y: 112 }, outside: { x: 320, y: 160 } },
      phasePositions: { practice: { x: 1024, y: 448 } }
    });
  });

  it('keeps a manually positioned member attached after reloading the moved phase layout', () => {
    const state = createInitialAbilityState();
    state.trees = [{ id: 'tree', name: 'Tree', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: '', updatedAt: '' }];
    state.phases = [{ id: 'practice', skillTreeId: 'tree', name: 'Practice', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 }];
    state.nodes = [{ id: 'member', skillTreeId: 'tree', phaseId: 'practice', name: 'Member', description: '', progress: 'available', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: '', updatedAt: '' }];
    const moved = applyPhaseDragPreference({
      ...preferences,
      positions: { member: { x: 112, y: 80 } },
      phasePositions: { practice: { x: 0, y: -144 } }
    }, 'practice', { x: 0, y: -144 }, { x: 32, y: -112 }, ['member']);

    const reloaded = layoutAbilityCanvas(state, 'tree', {
      manualPositions: moved.positions,
      phasePositions: moved.phasePositions
    });
    expect(reloaded.nodes.find((node) => node.id === 'member')).toMatchObject({ x: 144, y: 112 });
    expect(reloaded.phases[0]).toMatchObject({ x: 32, y: -112 });
  });

  it('resets both skill and phase manual positions', () => {
    expect(resetCanvasLayoutPreferences({
      ...preferences,
      phasePositions: { practice: { x: 992, y: 416 } }
    })).toEqual({ ...preferences, positions: {}, phasePositions: {} });
  });

  it('undoes and redoes canvas changes while a new change clears future history', () => {
    const initial = createCanvasPreferenceHistory(preferences);
    const moved = applyCanvasPreferenceChange(initial, applyCanvasDragPreference(preferences, 'skill', { x: 80, y: 96 }));
    const undone = undoCanvasPreferenceChange(moved);
    expect(undone.present).toEqual(preferences);
    expect(undone.future).toHaveLength(1);
    expect(redoCanvasPreferenceChange(undone).present.positions.skill).toEqual({ x: 80, y: 96 });

    const divergent = applyCanvasPreferenceChange(undone, { ...preferences, collapsedNodeIds: ['skill'] });
    expect(divergent.future).toEqual([]);
    expect(divergent.present.collapsedNodeIds).toEqual(['skill']);
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

  it('focuses a fresh request token once and ignores an already consumed request', () => {
    expect(consumeFocusRequest(2, { nodeId: 'next-node', sequence: 3 })).toEqual({ nodeId: 'next-node', sequence: 3 });
    expect(consumeFocusRequest(3, { nodeId: 'next-node', sequence: 3 })).toBeNull();
    expect(consumeFocusRequest(3, { nodeId: 'other-node', sequence: 4 })).toEqual({ nodeId: 'other-node', sequence: 4 });
  });
});
