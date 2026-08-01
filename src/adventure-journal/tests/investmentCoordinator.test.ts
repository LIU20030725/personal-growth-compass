import { describe, expect, it } from 'vitest';
import { createInitialTaskState } from '../../tasks/taskEngine';
import { TASK_RULE_VERSION } from '../../tasks/taskConfig';
import { saveTaskState } from '../../tasks/taskStorage';
import { createInitialAdventureState, findInvestment } from '../domain/adventureEngine';
import { createInvestmentCoordinator } from '../integrations/investmentCoordinator';
import { createTaskLedgerAdapter } from '../integrations/taskLedgerAdapter';
import { loadAdventureState, saveAdventureState } from '../storage/adventureStorage';

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

describe('recoverable investment coordinator', () => {
  const now = '2026-08-01T09:00:00+08:00';
  const input = {
    operationId: 'operation-1',
    targetType: 'home-item' as const,
    targetId: 'home-field-desk',
    amount: 6,
    createdAt: now
  };

  it('recovers progress after a crash that happens after the ledger spend', () => {
    const storage = createMemoryStorage();
    seedEightDice(storage);
    const ledger = createTaskLedgerAdapter(storage);
    const interrupted = createInvestmentCoordinator({
      storage,
      ledger,
      afterLedgerWrite: () => { throw new Error('simulated crash'); }
    });

    expect(() => interrupted.invest(input)).toThrow('simulated crash');
    expect(loadAdventureState(storage, now).operations[0].status).toBe('pending');
    expect(ledger.getBalance()).toBe(2);

    const coordinator = createInvestmentCoordinator({ storage, ledger });
    const recovered = coordinator.recover(now);
    expect(recovered.operations[0]).toMatchObject({ status: 'applied', error: '' });
    expect(findInvestment(recovered, 'home-item', 'home-field-desk')).toMatchObject({
      invested: 6,
      status: 'unlocked'
    });

    coordinator.recover(now);
    expect(ledger.getTransactions().filter((item) => item.sourceId === 'operation-1')).toHaveLength(1);
    expect(ledger.getBalance()).toBe(2);
  });

  it('marks an uncharged pending operation failed without spending during startup', () => {
    const storage = createMemoryStorage();
    seedEightDice(storage);
    const initial = createInitialAdventureState(now);
    saveAdventureState(storage, {
      ...initial,
      operations: [{
        id: 'pending-without-spend',
        targetType: 'route',
        targetId: 'route-wind-valley',
        amount: 3,
        status: 'pending',
        createdAt: now,
        appliedAt: null,
        error: ''
      }]
    });
    const ledger = createTaskLedgerAdapter(storage);

    const recovered = createInvestmentCoordinator({ storage, ledger }).recover(now);

    expect(recovered.operations[0]).toMatchObject({
      status: 'failed',
      error: '扣款未发生，请重新提交'
    });
    expect(ledger.getBalance()).toBe(8);
    expect(findInvestment(recovered, 'route', 'route-wind-valley').invested).toBe(0);
  });
});
