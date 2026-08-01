import { useCallback, useMemo, useState } from 'react';
import type { DiceTransaction } from '../tasks/types';
import type {
  AdventureJournalState,
  InvestmentTargetType
} from './domain/types';
import { createInvestmentCoordinator } from './integrations/investmentCoordinator';
import { createTaskLedgerAdapter } from './integrations/taskLedgerAdapter';
import {
  loadAdventureState,
  saveAdventureState,
  type StorageLike
} from './storage/adventureStorage';

type AdventureTab = 'journey' | 'home';

type Options = {
  storage?: StorageLike;
  now?: () => string;
  idFactory?: () => string;
  reducedMotion?: boolean;
};

export type AdventureJournalController = {
  state: AdventureJournalState;
  activeTab: AdventureTab;
  diceBalance: number;
  ledgerTransactions: DiceTransaction[];
  setActiveTab(tab: AdventureTab): void;
  setViewingMap(mapId: string): void;
  invest(type: InvestmentTargetType, targetId: string, amount: number): void;
  refresh(): void;
};

const browserStorage = (): StorageLike => window.localStorage;
const currentTime = () => new Date().toISOString();
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useAdventureJournal(options: Options = {}): AdventureJournalController {
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? currentTime;
  const idFactory = options.idFactory ?? newId;
  const preferredReducedMotion = options.reducedMotion ?? systemPrefersReducedMotion();
  const ledger = useMemo(() => createTaskLedgerAdapter(storage), [storage]);
  const coordinator = useMemo(
    () => createInvestmentCoordinator({ storage, ledger }),
    [ledger, storage]
  );
  const [state, setState] = useState<AdventureJournalState>(() => {
    const recovered = coordinator.recover(now());
    if (recovered.preferences.reducedMotion === preferredReducedMotion) return recovered;
    const withPreference = {
      ...recovered,
      preferences: {
        ...recovered.preferences,
        reducedMotion: preferredReducedMotion
      }
    };
    saveAdventureState(storage, withPreference);
    return withPreference;
  });
  const [activeTab, setActiveTab] = useState<AdventureTab>('journey');
  const [diceBalance, setDiceBalance] = useState(() => ledger.getBalance());
  const [ledgerTransactions, setLedgerTransactions] = useState<DiceTransaction[]>(
    () => ledger.getTransactions()
  );

  const syncLedger = useCallback(() => {
    setDiceBalance(ledger.getBalance());
    setLedgerTransactions(ledger.getTransactions());
  }, [ledger]);

  const refresh = useCallback(() => {
    setState(coordinator.recover(now()));
    syncLedger();
  }, [coordinator, now, syncLedger]);

  const invest = useCallback((
    targetType: InvestmentTargetType,
    targetId: string,
    amount: number
  ) => {
    const createdAt = now();
    const next = coordinator.invest({
      operationId: idFactory(),
      targetType,
      targetId,
      amount,
      createdAt
    });
    setState(next);
    syncLedger();
  }, [coordinator, idFactory, now, syncLedger]);

  const setViewingMap = useCallback((mapId: string) => {
    const current = loadAdventureState(storage, now());
    if (!current.unlockedMapIds.includes(mapId)) throw new Error('地图尚未解锁');
    const next = { ...current, viewingMapId: mapId };
    saveAdventureState(storage, next);
    setState(next);
  }, [now, storage]);

  return useMemo(() => ({
    state,
    activeTab,
    diceBalance,
    ledgerTransactions,
    setActiveTab,
    setViewingMap,
    invest,
    refresh
  }), [
    activeTab,
    diceBalance,
    invest,
    ledgerTransactions,
    refresh,
    setViewingMap,
    state
  ]);
}
