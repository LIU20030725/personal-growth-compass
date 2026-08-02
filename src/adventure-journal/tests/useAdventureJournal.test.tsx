import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInitialTaskState } from '../../tasks/taskEngine';
import { TASK_RULE_VERSION } from '../../tasks/taskConfig';
import { loadTaskState, saveTaskState } from '../../tasks/taskStorage';
import { ADVENTURE_STORAGE_KEY } from '../storage/adventureStorage';
import { useAdventureJournal } from '../useAdventureJournal';

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); }
  };
}

function seedEightDice(storage: ReturnType<typeof createMemoryStorage>) {
  const state = createInitialTaskState();
  state.diceTransactions = [{
    id: 'income',
    type: 'goal-reward',
    amount: 8,
    sourceId: 'goal',
    dimension: 'health',
    ruleVersion: TASK_RULE_VERSION,
    createdAt: '2026-08-01T08:00:00+08:00',
    balanceAfter: 8
  }];
  saveTaskState(storage, state);
}

describe('useAdventureJournal', () => {
  it('coordinates recovery, preferences, tabs, investment, and ledger refresh', () => {
    const storage = createMemoryStorage();
    seedEightDice(storage);
    const { result } = renderHook(() => useAdventureJournal({
      storage,
      now: () => '2026-08-01T09:00:00+08:00',
      idFactory: () => 'operation-1',
      reducedMotion: true
    }));

    expect(result.current.activeTab).toBe('journey');
    expect(result.current.state.preferences.reducedMotion).toBe(true);
    expect(result.current.diceBalance).toBe(8);

    act(() => result.current.invest('home-item', 'home-field-desk', 6));
    expect(result.current.diceBalance).toBe(2);
    expect(result.current.state.homeInvestments[0]).toMatchObject({
      invested: 6,
      status: 'unlocked'
    });
    expect(result.current.ledgerTransactions.filter((item) => item.type === 'adventure-spend')).toHaveLength(1);

    act(() => result.current.setActiveTab('home'));
    expect(result.current.activeTab).toBe('home');

    act(() => result.current.refresh());
    expect(result.current.diceBalance).toBe(2);
  });

  it('only allows viewing maps that have already been unlocked', () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useAdventureJournal({
      storage,
      now: () => '2026-08-01T09:00:00+08:00',
      idFactory: () => 'operation-1',
      reducedMotion: false
    }));

    expect(() => act(() => result.current.setViewingMap('map-wind-valley')))
      .toThrow('地图尚未解锁');
    act(() => result.current.setViewingMap('map-sunny-trail'));
    expect(result.current.state.viewingMapId).toBe('map-sunny-trail');
  });

  it('updates and persists the user motion preference', () => {
    const storage = createMemoryStorage();
    const { result } = renderHook(() => useAdventureJournal({
      storage,
      now: () => '2026-08-01T09:00:00+08:00',
      reducedMotion: false
    }));

    act(() => result.current.setReducedMotion(true));

    expect(result.current.state.preferences.reducedMotion).toBe(true);
    const saved = JSON.parse(storage.getItem(ADVENTURE_STORAGE_KEY) ?? '{}');
    expect(saved.preferences.reducedMotion).toBe(true);
  });

  it('preserves an explicit user motion preference across remounts', () => {
    const storage = createMemoryStorage();
    const firstMount = renderHook(() => useAdventureJournal({
      storage,
      now: () => '2026-08-01T09:00:00+08:00',
      reducedMotion: false
    }));

    act(() => firstMount.result.current.setReducedMotion(true));
    firstMount.unmount();

    const secondMount = renderHook(() => useAdventureJournal({
      storage,
      now: () => '2026-08-01T10:00:00+08:00',
      reducedMotion: false
    }));
    expect(secondMount.result.current.state.preferences.reducedMotion).toBe(true);
  });

  it('refreshes its balance after another module writes to the shared ledger', () => {
    const storage = createMemoryStorage();
    seedEightDice(storage);
    const journal = renderHook(() => useAdventureJournal({
      storage,
      now: () => '2026-08-01T09:00:00+08:00'
    }));
    const externalTaskState = loadTaskState(storage);
    externalTaskState.diceTransactions.push({
      id: 'external-income',
      type: 'task-reward',
      amount: 5,
      sourceId: 'task-outside-journal',
      dimension: 'ability',
      ruleVersion: TASK_RULE_VERSION,
      createdAt: '2026-08-01T09:30:00+08:00',
      balanceAfter: 13
    });
    saveTaskState(storage, externalTaskState);

    act(() => journal.result.current.refresh());

    expect(journal.result.current.diceBalance).toBe(13);
    expect(journal.result.current.ledgerTransactions).toContainEqual(
      expect.objectContaining({ id: 'external-income', balanceAfter: 13 })
    );
  });
});
