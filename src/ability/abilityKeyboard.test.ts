import { describe, expect, it } from 'vitest';
import { getKeyboardNavigationTarget, resolveAbilityCanvasCommand } from './abilityKeyboard';
import type { AbilityState, SkillNode } from './types';

function navigationState(): AbilityState {
  const node = (id: string, createdAt: string, archivedAt: string | null = null): SkillNode => ({
    id, skillTreeId: 'tree', phaseId: 'phase', name: id, description: '', progress: 'available',
    requiredForPhase: true, masteryNote: '', archivedAt, createdAt, updatedAt: createdAt
  });
  return {
    schemaVersion: 2,
    trees: [], phases: [], parallelGroups: [], masteryCriteria: [], taskLinks: [], outcomes: [], resources: [], resourceLinks: [], lastVisitedTreeId: 'tree',
    nodes: [node('parent', '2026-01-01'), node('beta', '2026-01-02'), node('alpha', '2026-01-02'), node('last', '2026-01-03'), node('aux', '2026-01-04')],
    dependencies: [
      { id: 'p-beta', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'beta', kind: 'primary' },
      { id: 'p-alpha', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'alpha', kind: 'primary' },
      { id: 'p-last', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'last', kind: 'primary' },
      { id: 'p-aux', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'aux', kind: 'auxiliary' }
    ]
  };
}

describe('resolveAbilityCanvasCommand', () => {
  it('maps Ctrl+Enter to add child for one selected skill', () => {
    expect(resolveAbilityCanvasCommand(
      { key: 'Enter', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false },
      { tagName: 'div' },
      { selectedNodeIds: ['skill'] }
    )).toBe('add-child');
  });

  it('maps Enter and F2 to rename for one selected skill', () => {
    const selection = { selectedNodeIds: ['skill'] };
    const target = { tagName: 'div' };
    expect(resolveAbilityCanvasCommand({ key: 'Enter', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, target, selection)).toBe('rename');
    expect(resolveAbilityCanvasCommand({ key: 'F2', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, target, selection)).toBe('rename');
  });

  it('maps the remaining single-selection commands on Windows and macOS', () => {
    const target = { tagName: 'div' };
    const selection = { selectedNodeIds: ['skill'] };
    const resolve = (key: string, modifiers: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
      resolveAbilityCanvasCommand({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }, target, selection);

    expect(resolve('Enter', { metaKey: true, shiftKey: true })).toBe('add-sibling');
    expect(resolve('Delete')).toBe('delete-branch');
    expect(resolve('Backspace')).toBe('delete-branch');
    expect(resolve('z', { ctrlKey: true })).toBe('undo');
    expect(resolve('Z', { metaKey: true, shiftKey: true })).toBe('redo');
    expect(resolve('y', { ctrlKey: true })).toBe('redo');
    expect(resolve('c', { metaKey: true })).toBe('copy');
    expect(resolve('v', { ctrlKey: true })).toBe('paste-child');
    expect(resolve('ArrowLeft')).toBe('select-parent');
    expect(resolve('ArrowRight')).toBe('select-first-child');
    expect(resolve('ArrowUp')).toBe('select-previous-sibling');
    expect(resolve('ArrowDown')).toBe('select-next-sibling');
    expect(resolve('Home')).toBe('select-first-sibling');
    expect(resolve('End')).toBe('select-last-sibling');
    expect(resolve('Escape')).toBe('clear-selection');
    expect(resolve('?')).toBe('show-shortcuts');
  });

  it('never maps Tab and excludes interactive, menu, dialog, and contenteditable targets', () => {
    const selection = { selectedNodeIds: ['skill'] };
    const event = { key: 'Delete', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(resolveAbilityCanvasCommand({ ...event, key: 'Tab' }, { tagName: 'div' }, selection)).toBeNull();
    expect(resolveAbilityCanvasCommand({ ...event, key: 'Tab', shiftKey: true }, { tagName: 'div' }, selection)).toBeNull();
    for (const tagName of ['input', 'textarea', 'select', 'button', 'a']) {
      expect(resolveAbilityCanvasCommand(event, { tagName }, selection)).toBeNull();
    }
    expect(resolveAbilityCanvasCommand(event, { tagName: 'div', contentEditable: true }, selection)).toBeNull();
    expect(resolveAbilityCanvasCommand(event, { tagName: 'div', insideMenu: true }, selection)).toBeNull();
    expect(resolveAbilityCanvasCommand(event, { tagName: 'div', insideDialog: true }, selection)).toBeNull();
  });

  it('does not map any canvas command without exactly one selected skill', () => {
    const target = { tagName: 'div' };
    const enter = { key: 'Enter', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(resolveAbilityCanvasCommand(enter, target, { selectedNodeIds: [] })).toBeNull();
    expect(resolveAbilityCanvasCommand(enter, target, { selectedNodeIds: ['one', 'two'] })).toBeNull();
    for (const event of [
      { ...enter, key: '?' },
      { ...enter, key: 'z', ctrlKey: true },
      { ...enter, key: 'y', ctrlKey: true },
      { ...enter, key: 'Escape' }
    ]) {
      expect(resolveAbilityCanvasCommand(event, target, { selectedNodeIds: [] })).toBeNull();
      expect(resolveAbilityCanvasCommand(event, target, { selectedNodeIds: ['one', 'two'] })).toBeNull();
    }
  });

  it('requires exact modifiers for every command', () => {
    const target = { tagName: 'div' };
    const selection = { selectedNodeIds: ['skill'] };
    const resolve = (key: string, modifiers: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) =>
      resolveAbilityCanvasCommand({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers }, target, selection);

    for (const key of ['Enter', 'F2', 'Delete', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape', '?']) {
      expect(resolve(key, { altKey: true })).toBeNull();
    }
    for (const key of ['F2', 'Backspace', 'ArrowLeft', 'Home', 'Escape']) {
      expect(resolve(key, { ctrlKey: true })).toBeNull();
    }
    expect(resolve('v', { ctrlKey: true, shiftKey: true })).toBeNull();
    expect(resolve('c', { metaKey: true, shiftKey: true })).toBeNull();
    expect(resolve('y', { ctrlKey: true, shiftKey: true })).toBeNull();
    expect(resolve('z', { ctrlKey: true, shiftKey: true })).toBe('redo');
    expect(resolve('?', { shiftKey: true })).toBe('show-shortcuts');
  });
});

describe('getKeyboardNavigationTarget', () => {
  it('navigates primary parent and first child using stable createdAt/id order', () => {
    const state = navigationState();
    expect(getKeyboardNavigationTarget(state, 'alpha', 'select-parent')).toBe('parent');
    expect(getKeyboardNavigationTarget(state, 'parent', 'select-first-child')).toBe('alpha');
    expect(getKeyboardNavigationTarget(state, 'aux', 'select-parent')).toBeNull();
  });

  it('navigates adjacent, first, and last primary siblings without wrapping', () => {
    const state = navigationState();
    expect(getKeyboardNavigationTarget(state, 'beta', 'select-previous-sibling')).toBe('alpha');
    expect(getKeyboardNavigationTarget(state, 'beta', 'select-next-sibling')).toBe('last');
    expect(getKeyboardNavigationTarget(state, 'beta', 'select-first-sibling')).toBe('alpha');
    expect(getKeyboardNavigationTarget(state, 'alpha', 'select-last-sibling')).toBe('last');
    expect(getKeyboardNavigationTarget(state, 'alpha', 'select-previous-sibling')).toBeNull();
    expect(getKeyboardNavigationTarget(state, 'last', 'select-next-sibling')).toBeNull();
    expect(getKeyboardNavigationTarget(state, 'parent', 'select-next-sibling')).toBeNull();
  });

  it('uses legacy primary semantics and excludes archived, cross-tree, and malformed nodes', () => {
    const state = navigationState();
    state.nodes.push(
      { ...state.nodes[0], id: 'legacy-first', createdAt: '2026-01-05' },
      { ...state.nodes[0], id: 'legacy-aux', createdAt: '2026-01-06' },
      { ...state.nodes[0], id: 'archived', createdAt: '2026-01-07', archivedAt: '2026-02-01' },
      { ...state.nodes[0], id: 'other', skillTreeId: 'other', createdAt: '2026-01-08' }
    );
    state.dependencies.push(
      { id: 'legacy-first-edge', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'legacy-first' },
      { id: 'legacy-aux-edge', skillTreeId: 'tree', prerequisiteNodeId: 'beta', dependentNodeId: 'legacy-first' },
      { id: 'archived-edge', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'archived', kind: 'primary' },
      { id: 'cross-tree', skillTreeId: 'other', prerequisiteNodeId: 'parent', dependentNodeId: 'other', kind: 'primary' },
      { id: 'malformed', skillTreeId: 'tree', prerequisiteNodeId: 'missing', dependentNodeId: 'beta', kind: 'primary' }
    );

    expect(getKeyboardNavigationTarget(state, 'legacy-first', 'select-parent')).toBe('parent');
    expect(getKeyboardNavigationTarget(state, 'legacy-first', 'select-first-child')).toBeNull();
    expect(getKeyboardNavigationTarget(state, 'parent', 'select-last-sibling')).toBeNull();
    expect(getKeyboardNavigationTarget(state, 'archived', 'select-parent')).toBeNull();
    expect(getKeyboardNavigationTarget(state, 'other', 'select-parent')).toBeNull();
  });

  it('navigates the visible parallel merge from every branch and back to a stable branch', () => {
    const state = navigationState();
    state.nodes.push({ ...state.nodes[0], id: 'continuation', createdAt: '2026-01-09' });
    state.dependencies.push({ id: 'suppressed-parent-continuation', skillTreeId: 'tree', prerequisiteNodeId: 'parent', dependentNodeId: 'continuation', kind: 'primary' });
    state.parallelGroups = [{
      id: 'parallel', skillTreeId: 'tree', phaseId: 'phase', name: 'Parallel',
      nodeIds: ['beta', 'alpha', 'last'], parentNodeId: 'parent', continuationNodeId: 'continuation'
    }];

    expect(getKeyboardNavigationTarget(state, 'beta', 'select-first-child')).toBe('continuation');
    expect(getKeyboardNavigationTarget(state, 'last', 'select-first-child')).toBe('continuation');
    expect(getKeyboardNavigationTarget(state, 'continuation', 'select-parent')).toBe('alpha');
  });
});
