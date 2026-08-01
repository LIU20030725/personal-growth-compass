import { V0_1_TARGETS } from '../content/v0_1';
import { ADVENTURE_CONTENT_VERSION, ADVENTURE_SCHEMA_VERSION } from '../moduleVersion';
import type { AdventureJournalState, InvestmentProgress } from './types';

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
