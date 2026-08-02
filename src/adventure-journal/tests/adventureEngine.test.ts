import { describe, expect, it } from 'vitest';
import {
  applyInvestment,
  completeRoute,
  createInitialAdventureState,
  findInvestment,
  getProgressStage
} from '../domain/adventureEngine';

describe('adventure visual progress stages', () => {
  it('maps investment ratios onto stable 0/25/50/75/100 visual milestones', () => {
    expect(getProgressStage(0, 30)).toBe(0);
    expect(getProgressStage(7, 30)).toBe(0);
    expect(getProgressStage(8, 30)).toBe(1);
    expect(getProgressStage(15, 30)).toBe(2);
    expect(getProgressStage(23, 30)).toBe(3);
    expect(getProgressStage(30, 30)).toBe(4);
  });
});

describe('adventure journal initial state', () => {
  it('starts on Sunny Trail with frozen V0.1 prices', () => {
    const state = createInitialAdventureState('2026-08-01T08:00:00+08:00');

    expect(state).toMatchObject({
      schemaVersion: 1,
      contentVersion: '1.2.0-0803',
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

describe('adventure investment rules', () => {
  it('keeps partial progress and marks a route ready exactly at its frozen price', () => {
    let state = createInitialAdventureState('2026-08-01T08:00:00+08:00');

    state = applyInvestment(state, {
      operationId: 'op-1',
      targetType: 'route',
      targetId: 'route-wind-valley',
      amount: 11,
      createdAt: '2026-08-01T09:00:00+08:00'
    });
    expect(findInvestment(state, 'route', 'route-wind-valley')).toMatchObject({
      invested: 11,
      status: 'building',
      price: 30
    });

    state = applyInvestment(state, {
      operationId: 'op-2',
      targetType: 'route',
      targetId: 'route-wind-valley',
      amount: 19,
      createdAt: '2026-08-02T09:00:00+08:00'
    });
    expect(findInvestment(state, 'route', 'route-wind-valley')).toMatchObject({
      invested: 30,
      status: 'ready',
      price: 30,
      unlockedAt: null
    });
  });

  it('departs only after a route is ready and unlocks the destination once', () => {
    const initial = createInitialAdventureState('2026-08-01T08:00:00+08:00');
    expect(() => completeRoute(initial, 'route-wind-valley', '2026-08-02T10:00:00+08:00'))
      .toThrow('路线尚未准备好');

    const ready = applyInvestment(initial, {
      operationId: 'op-route-ready',
      targetType: 'route',
      targetId: 'route-wind-valley',
      amount: 30,
      createdAt: '2026-08-02T09:00:00+08:00'
    });
    const arrived = completeRoute(ready, 'route-wind-valley', '2026-08-02T10:00:00+08:00');

    expect(findInvestment(arrived, 'route', 'route-wind-valley')).toMatchObject({
      status: 'unlocked',
      unlockedAt: '2026-08-02T10:00:00+08:00'
    });
    expect(arrived.unlockedMapIds).toEqual(['map-sunny-trail', 'map-wind-valley']);
    expect(arrived.currentChapterId).toBe('map-wind-valley');
    expect(arrived.viewingMapId).toBe('map-wind-valley');
    expect(completeRoute(arrived, 'route-wind-valley', '2026-08-02T11:00:00+08:00')).toEqual(arrived);
  });

  it('unlocks a home item once when its fixed price is reached', () => {
    const initial = createInitialAdventureState('2026-08-01T08:00:00+08:00');
    const unlocked = applyInvestment(initial, {
      operationId: 'op-home',
      targetType: 'home-item',
      targetId: 'home-field-desk',
      amount: 6,
      createdAt: '2026-08-01T09:30:00+08:00'
    });

    expect(findInvestment(unlocked, 'home-item', 'home-field-desk')).toMatchObject({
      invested: 6,
      status: 'unlocked',
      unlockedAt: '2026-08-01T09:30:00+08:00'
    });
    expect(() => applyInvestment(unlocked, {
      operationId: 'op-home-again',
      targetType: 'home-item',
      targetId: 'home-field-desk',
      amount: 1,
      createdAt: '2026-08-01T10:00:00+08:00'
    })).toThrow('该目标已经完成');
  });

  it('rejects non-positive, non-integer, overflow, and missing target investments', () => {
    const state = createInitialAdventureState('2026-08-01T08:00:00+08:00');
    const base = {
      operationId: 'op-invalid',
      targetType: 'home-item' as const,
      targetId: 'home-field-desk',
      createdAt: '2026-08-01T09:00:00+08:00'
    };

    expect(() => applyInvestment(state, { ...base, amount: 0 })).toThrow('投入数量必须是大于 0 的整数');
    expect(() => applyInvestment(state, { ...base, amount: 1.5 })).toThrow('投入数量必须是大于 0 的整数');
    expect(() => applyInvestment(state, { ...base, amount: 7 })).toThrow('本次最多还能投入 6 枚骰子');
    expect(() => applyInvestment(state, { ...base, targetId: 'missing', amount: 1 })).toThrow('投资目标不存在');
  });
});
