import type { CanvasPreferences } from './abilityCanvasStorage';

export type CanvasPreferenceHistory = {
  past: CanvasPreferences[];
  present: CanvasPreferences;
  future: CanvasPreferences[];
};

export function createCanvasPreferenceHistory(preferences: CanvasPreferences): CanvasPreferenceHistory {
  return { past: [], present: preferences, future: [] };
}

export function applyCanvasPreferenceChange(
  history: CanvasPreferenceHistory,
  next: CanvasPreferences
): CanvasPreferenceHistory {
  return { past: [...history.past.slice(-49), history.present], present: next, future: [] };
}

export function updateCanvasPreferenceViewport(
  history: CanvasPreferenceHistory,
  viewport: CanvasPreferences['viewport']
): CanvasPreferenceHistory {
  return { ...history, present: { ...history.present, viewport } };
}

export function undoCanvasPreferenceChange(history: CanvasPreferenceHistory): CanvasPreferenceHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future].slice(0, 50) };
}

export function redoCanvasPreferenceChange(history: CanvasPreferenceHistory): CanvasPreferenceHistory {
  const next = history.future[0];
  if (!next) return history;
  return { past: [...history.past.slice(-49), history.present], present: next, future: history.future.slice(1) };
}

export function runAbilityHistoryAction(
  direction: 'undo' | 'redo',
  canvasHistory: CanvasPreferenceHistory,
  canRunDomainAction: boolean,
  runCanvasAction: () => void,
  runDomainAction: () => void
): 'canvas' | 'domain' | 'none' {
  const hasCanvasAction = direction === 'undo' ? canvasHistory.past.length > 0 : canvasHistory.future.length > 0;
  if (hasCanvasAction) {
    runCanvasAction();
    return 'canvas';
  }
  if (canRunDomainAction) {
    runDomainAction();
    return 'domain';
  }
  return 'none';
}
