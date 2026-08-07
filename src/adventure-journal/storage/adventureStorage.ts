import { TASK_STORAGE_KEY } from '../../tasks/taskConfig';
import { createInitialAdventureState } from '../domain/adventureEngine';
import type {
  AdventureJournalState,
  InvestmentOperation,
  InvestmentProgress,
  JournalPreferences
} from '../domain/types';

export const ADVENTURE_STORAGE_KEY = 'dice-life.adventure-journal.v1';
export const ADVENTURE_MOTION_PREFERENCE_KEY = 'dice-life.adventure-journal.motion-preference.v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function isInvestment(value: unknown): value is InvestmentProgress {
  if (!isRecord(value)) return false;
  const price = value.price;
  const invested = value.invested;
  const validPrice = typeof price === 'number' && Number.isInteger(price) && price > 0;
  const validInvested = typeof invested === 'number' && Number.isInteger(invested) &&
    invested >= 0 && typeof price === 'number' && invested <= price;
  return (value.targetType === 'route' || value.targetType === 'home-item' || value.targetType === 'gear') &&
    typeof value.targetId === 'string' &&
    validPrice &&
    validInvested &&
    (value.status === 'available' || value.status === 'building' || value.status === 'ready' || value.status === 'unlocked') &&
    (value.unlockedAt === null || typeof value.unlockedAt === 'string');
}

function isOperation(value: unknown): value is InvestmentOperation {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' &&
    (value.targetType === 'route' || value.targetType === 'home-item' || value.targetType === 'gear') &&
    typeof value.targetId === 'string' &&
    typeof value.amount === 'number' &&
    (value.status === 'pending' || value.status === 'applied' || value.status === 'failed') &&
    typeof value.createdAt === 'string' &&
    (value.appliedAt === null || typeof value.appliedAt === 'string') &&
    typeof value.error === 'string';
}

function isPreferences(value: unknown): value is JournalPreferences {
  if (!isRecord(value)) return false;
  return typeof value.reducedMotion === 'boolean' &&
    typeof value.musicEnabled === 'boolean' &&
    typeof value.ambientSoundEnabled === 'boolean' &&
    typeof value.interfaceSoundEnabled === 'boolean';
}

function isAdventureState(value: unknown): value is AdventureJournalState {
  if (!isRecord(value)) return false;
  return value.schemaVersion === 1 &&
    typeof value.contentVersion === 'string' &&
    typeof value.currentChapterId === 'string' &&
    typeof value.viewingMapId === 'string' &&
    Array.isArray(value.unlockedMapIds) && value.unlockedMapIds.every((id) => typeof id === 'string') &&
    Array.isArray(value.routeInvestments) && value.routeInvestments.every(isInvestment) &&
    Array.isArray(value.homeInvestments) && value.homeInvestments.every(isInvestment) &&
    Array.isArray(value.gearInvestments) && value.gearInvestments.every(isInvestment) &&
    Array.isArray(value.operations) && value.operations.every(isOperation) &&
    isPreferences(value.preferences);
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function migrateLegacyAdventureSeed(
  storage: StorageLike,
  initial: AdventureJournalState,
  now: string
): AdventureJournalState {
  const rawTaskState = storage.getItem(TASK_STORAGE_KEY);
  if (!rawTaskState) return initial;

  try {
    const parsed: unknown = JSON.parse(rawTaskState);
    if (!isRecord(parsed) || !isRecord(parsed.adventure)) return initial;
    const chapter = readNumber(parsed.adventure.chapter, 1);
    const unlockedChapter = readNumber(parsed.adventure.unlockedChapter, 1);
    const position = Math.max(0, Math.floor(readNumber(parsed.adventure.position, 0)));
    const hasReachedWindValley = chapter >= 2 || unlockedChapter >= 2;
    const route = initial.routeInvestments[0];
    const invested = hasReachedWindValley ? route.price : Math.min(route.price, position);
    const status = hasReachedWindValley
      ? 'unlocked' as const
      : invested === route.price ? 'ready' as const
      : invested > 0 ? 'building' as const
      : 'available' as const;

    return {
      ...initial,
      currentChapterId: chapter >= 2 ? 'map-wind-valley' : 'map-sunny-trail',
      viewingMapId: chapter >= 2 ? 'map-wind-valley' : 'map-sunny-trail',
      unlockedMapIds: hasReachedWindValley
        ? ['map-sunny-trail', 'map-wind-valley']
        : ['map-sunny-trail'],
      routeInvestments: [{
        ...route,
        invested,
        status,
        unlockedAt: hasReachedWindValley ? now : null
      }]
    };
  } catch {
    return initial;
  }
}

export function saveAdventureState(storage: StorageLike, state: AdventureJournalState): void {
  storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(state));
}

export function loadAdventureState(storage: StorageLike, now: string): AdventureJournalState {
  const raw = storage.getItem(ADVENTURE_STORAGE_KEY);
  if (!raw) {
    const initial = migrateLegacyAdventureSeed(storage, createInitialAdventureState(now), now);
    saveAdventureState(storage, initial);
    return initial;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isAdventureState(parsed)) throw new Error('unsupported adventure state');
    return parsed;
  } catch {
    storage.setItem(`${ADVENTURE_STORAGE_KEY}.corrupt.${Date.now()}`, raw);
    const initial = createInitialAdventureState(now);
    saveAdventureState(storage, initial);
    return initial;
  }
}
