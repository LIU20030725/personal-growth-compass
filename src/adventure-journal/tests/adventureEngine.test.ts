import { describe, expect, it } from 'vitest';
import { createInitialAdventureState } from '../domain/adventureEngine';

describe('adventure journal initial state', () => {
  it('starts on Sunny Trail with frozen V0.1 prices', () => {
    const state = createInitialAdventureState('2026-08-01T08:00:00+08:00');

    expect(state).toMatchObject({
      schemaVersion: 1,
      contentVersion: '0.1.0',
      currentChapterId: 'map-sunny-trail',
      viewingMapId: 'map-sunny-trail',
      unlockedMapIds: ['map-sunny-trail']
    });
    expect(state.routeInvestments[0]).toMatchObject({
      targetId: 'route-wind-valley',
      price: 30,
      invested: 0,
      status: 'available'
    });
    expect(state.homeInvestments.map((item) => item.price)).toEqual([6, 12]);
  });
});
