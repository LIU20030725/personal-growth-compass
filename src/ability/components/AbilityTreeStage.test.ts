import { describe, expect, it, vi } from 'vitest';
import { layoutAbilityCanvas } from '../abilityCanvasLayout';
import type { CanvasPreferences } from '../abilityCanvasStorage';
import { createInitialAbilityState } from '../abilityStorage';
import {
  applyCanvasDragPreference,
  applyPhaseDragPreference,
  commitCanvasDragPreference,
  consumeAbilityFocusRequest,
  consumeFocusRequest,
  getRenderedSkillNodeIds,
  isCanvasPaneTarget,
  resetCanvasLayoutPreferences
} from './AbilityTreeStage';
import { getKeyboardNavigationTarget } from '../abilityKeyboard';
import {
  applyCanvasPreferenceChange,
  createCanvasPreferenceHistory,
  redoCanvasPreferenceChange,
  runCanvasPreferenceReset,
  runAbilityHistoryAction,
  undoCanvasPreferenceChange
} from '../abilityCanvasHistory';

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

  it('excludes descendants hidden by a collapsed branch from keyboard navigation', () => {
    const state = createInitialAbilityState();
    state.trees = [{ id: 'tree', name: 'Tree', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: '', updatedAt: '' }];
    state.phases = [{ id: 'phase', skillTreeId: 'tree', name: 'Phase', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 }];
    state.nodes = [
      { id: 'root', skillTreeId: 'tree', phaseId: 'phase', name: 'Root', description: '', progress: 'available', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: '1', updatedAt: '' },
      { id: 'child', skillTreeId: 'tree', phaseId: 'phase', name: 'Child', description: '', progress: 'available', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: '2', updatedAt: '' }
    ];
    state.dependencies = [{ id: 'edge', skillTreeId: 'tree', prerequisiteNodeId: 'root', dependentNodeId: 'child', kind: 'primary' }];
    const layout = layoutAbilityCanvas(state, 'tree', { collapsedNodeIds: new Set(['root']) });

    expect(getKeyboardNavigationTarget(
      state,
      'root',
      'select-first-child',
      getRenderedSkillNodeIds(layout.nodes)
    )).toBeNull();
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

  it('reports a failed canvas position commit so the rendered node can be restored', () => {
    const commit = vi.fn(() => false);

    expect(commitCanvasDragPreference(preferences, 'skill', { x: 113, y: 79 }, commit)).toBe(false);
    expect(commit).toHaveBeenCalledWith({
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

  it('invokes the focus action once for a fresh request and not for the same sequence again', () => {
    const focus = vi.fn();
    const consumed = consumeAbilityFocusRequest(2, { nodeId: 'next-node', sequence: 3 }, focus);

    expect(consumed).toBe(3);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith('next-node');
    expect(consumeAbilityFocusRequest(consumed, { nodeId: 'next-node', sequence: 3 }, focus)).toBe(3);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('routes history shortcuts to canvas before domain and falls back when canvas is empty', () => {
    const canvasUndo = vi.fn(() => true);
    const domainUndo = vi.fn();
    const history = applyCanvasPreferenceChange(createCanvasPreferenceHistory(preferences), {
      ...preferences,
      positions: { skill: { x: 80, y: 96 } }
    });

    expect(runAbilityHistoryAction('undo', history, true, canvasUndo, domainUndo)).toBe('canvas');
    expect(canvasUndo).toHaveBeenCalledOnce();
    expect(domainUndo).not.toHaveBeenCalled();

    expect(runAbilityHistoryAction('undo', createCanvasPreferenceHistory(preferences), true, canvasUndo, domainUndo)).toBe('domain');
    expect(domainUndo).toHaveBeenCalledOnce();
  });

  it('does not report success or fall back to domain when a canvas history action fails', () => {
    const canvasUndo = vi.fn(() => false);
    const domainUndo = vi.fn();
    const history = applyCanvasPreferenceChange(createCanvasPreferenceHistory(preferences), {
      ...preferences,
      positions: { skill: { x: 80, y: 96 } }
    });

    expect(runAbilityHistoryAction('undo', history, true, canvasUndo, domainUndo)).toBeNull();
    expect(canvasUndo).toHaveBeenCalledOnce();
    expect(domainUndo).not.toHaveBeenCalled();
  });

  it('does not request a fit when resetting canvas preferences fails', () => {
    const commit = vi.fn(() => false);
    const requestFit = vi.fn();

    expect(runCanvasPreferenceReset(preferences, resetCanvasLayoutPreferences, commit, requestFit)).toBe(false);
    expect(commit).toHaveBeenCalledOnce();
    expect(requestFit).not.toHaveBeenCalled();
  });

});
