import { describe, expect, it } from 'vitest';
import { createInitialAdventureState } from '../domain/adventureEngine';
import {
  ADVENTURE_STORAGE_KEY,
  loadAdventureState,
  saveAdventureState,
  type StorageLike
} from '../storage/adventureStorage';

function createMemoryStorage() {
  const data = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); }
  };
  return { data, storage };
}

describe('adventure journal storage', () => {
  const now = '2026-08-01T08:00:00+08:00';

  it('creates and persists a versioned initial state', () => {
    const { storage } = createMemoryStorage();

    const initial = loadAdventureState(storage, now);
    expect(initial).toEqual(createInitialAdventureState(now));
    expect(storage.getItem(ADVENTURE_STORAGE_KEY)).not.toBeNull();

    const changed = {
      ...initial,
      homeInvestments: initial.homeInvestments.map((item) =>
        item.targetId === 'home-field-desk' ? { ...item, invested: 3, status: 'building' as const } : item
      )
    };
    saveAdventureState(storage, changed);
    expect(loadAdventureState(storage, now)).toEqual(changed);
  });

  it('backs up corrupt data before returning a safe initial state', () => {
    const { data, storage } = createMemoryStorage();
    storage.setItem(ADVENTURE_STORAGE_KEY, '{broken');

    expect(loadAdventureState(storage, now)).toEqual(createInitialAdventureState(now));
    const backupKey = [...data.keys()].find((key) => key.startsWith(`${ADVENTURE_STORAGE_KEY}.corrupt.`));
    expect(backupKey).toBeDefined();
    expect(storage.getItem(backupKey!)).toBe('{broken');
  });

  it('migrates the legacy task adventure seed without changing task data', () => {
    const { storage } = createMemoryStorage();
    const legacyTaskState = {
      schemaVersion: 2,
      goals: [],
      goalProgressEntries: [],
      tasks: [],
      completions: [],
      diceTransactions: [],
      weeklyReviews: [],
      adventure: { chapter: 2, position: 7, unlockedChapter: 2 }
    };
    const original = JSON.stringify(legacyTaskState);
    storage.setItem('dice-life.task-system.v1', original);

    const migrated = loadAdventureState(storage, now);
    expect(migrated).toMatchObject({
      currentChapterId: 'map-wind-valley',
      viewingMapId: 'map-wind-valley',
      unlockedMapIds: ['map-sunny-trail', 'map-wind-valley']
    });
    expect(migrated.routeInvestments[0]).toMatchObject({ invested: 30, status: 'unlocked' });
    expect(storage.getItem('dice-life.task-system.v1')).toBe(original);
  });
});
