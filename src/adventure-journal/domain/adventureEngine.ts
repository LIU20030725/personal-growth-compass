import { V0_1_TARGETS } from '../content/v0_1';
import { ADVENTURE_CONTENT_VERSION, ADVENTURE_SCHEMA_VERSION } from '../moduleVersion';
import type {
  AdventureJournalState,
  InvestmentInput,
  InvestmentProgress,
  InvestmentTargetType
} from './types';

export function getProgressStage(invested: number, price: number): 0 | 1 | 2 | 3 | 4 {
  if (price <= 0 || invested <= 0) return 0;
  const ratio = Math.min(1, invested / price);
  if (ratio >= 1) return 4;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
  if (ratio >= 0.25) return 1;
  return 0;
}

function createProgress(target: (typeof V0_1_TARGETS)[number]): InvestmentProgress {
  return {
    targetType: target.targetType,
    targetId: target.targetId,
    price: target.price,
    invested: 0,
    status: 'available',
    unlockedAt: null
  };
}

export function createInitialAdventureState(_createdAt: string): AdventureJournalState {
  const targets = V0_1_TARGETS.map(createProgress);

  return {
    schemaVersion: ADVENTURE_SCHEMA_VERSION,
    contentVersion: ADVENTURE_CONTENT_VERSION,
    currentChapterId: 'map-sunny-trail',
    viewingMapId: 'map-sunny-trail',
    unlockedMapIds: ['map-sunny-trail'],
    routeInvestments: targets.filter((target) => target.targetType === 'route'),
    homeInvestments: targets.filter((target) => target.targetType === 'home-item'),
    gearInvestments: targets.filter((target) => target.targetType === 'gear'),
    operations: [],
    preferences: {
      reducedMotion: false,
      musicEnabled: false,
      ambientSoundEnabled: false,
      interfaceSoundEnabled: false
    }
  };
}

function getInvestmentList(
  state: AdventureJournalState,
  targetType: InvestmentTargetType
): InvestmentProgress[] {
  if (targetType === 'route') return state.routeInvestments;
  if (targetType === 'home-item') return state.homeInvestments;
  return state.gearInvestments;
}

export function findInvestment(
  state: AdventureJournalState,
  targetType: InvestmentTargetType,
  targetId: string
): InvestmentProgress {
  const target = getInvestmentList(state, targetType).find((item) => item.targetId === targetId);
  if (!target) throw new Error('投资目标不存在');
  return target;
}

export function applyInvestment(
  state: AdventureJournalState,
  input: InvestmentInput
): AdventureJournalState {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('投入数量必须是大于 0 的整数');
  }

  const target = findInvestment(state, input.targetType, input.targetId);
  if (target.status === 'ready' || target.status === 'unlocked') {
    throw new Error('该目标已经完成');
  }

  const remaining = target.price - target.invested;
  if (input.amount > remaining) {
    throw new Error(`本次最多还能投入 ${remaining} 枚骰子`);
  }

  const invested = target.invested + input.amount;
  const status = invested === target.price
    ? input.targetType === 'route' ? 'ready' : 'unlocked'
    : 'building';
  const nextTarget: InvestmentProgress = {
    ...target,
    invested,
    status,
    unlockedAt: status === 'unlocked' ? input.createdAt : null
  };
  const update = (list: InvestmentProgress[]) => list.map((item) =>
    item.targetId === input.targetId ? nextTarget : item
  );

  if (input.targetType === 'route') {
    return { ...state, routeInvestments: update(state.routeInvestments) };
  }
  if (input.targetType === 'home-item') {
    return { ...state, homeInvestments: update(state.homeInvestments) };
  }
  return { ...state, gearInvestments: update(state.gearInvestments) };
}

const ROUTE_DESTINATIONS: Record<string, string> = {
  'route-wind-valley': 'map-wind-valley'
};

export function completeRoute(
  state: AdventureJournalState,
  targetId: string,
  completedAt: string
): AdventureJournalState {
  const route = findInvestment(state, 'route', targetId);
  if (route.status === 'unlocked') return state;
  if (route.status !== 'ready') throw new Error('路线尚未准备好');
  const destinationId = ROUTE_DESTINATIONS[targetId];
  if (!destinationId) throw new Error('路线目的地不存在');

  return {
    ...state,
    currentChapterId: destinationId,
    viewingMapId: destinationId,
    unlockedMapIds: state.unlockedMapIds.includes(destinationId)
      ? state.unlockedMapIds
      : [...state.unlockedMapIds, destinationId],
    routeInvestments: state.routeInvestments.map((item) => item.targetId === targetId
      ? { ...item, status: 'unlocked', unlockedAt: completedAt }
      : item)
  };
}
