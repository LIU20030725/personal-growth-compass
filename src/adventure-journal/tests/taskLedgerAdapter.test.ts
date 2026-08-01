import { describe, expect, it } from 'vitest';
import { createInitialTaskState } from '../../tasks/taskEngine';
import { TASK_RULE_VERSION } from '../../tasks/taskConfig';
import { saveTaskState } from '../../tasks/taskStorage';
import { createTaskLedgerAdapter } from '../integrations/taskLedgerAdapter';

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

describe('task ledger adapter', () => {
  it('reads the latest balance and writes one idempotent adventure spend', () => {
    const storage = createMemoryStorage();
    seedEightDice(storage);
    const adapter = createTaskLedgerAdapter(storage);
    const input = {
      transactionId: 'adventure-spend-operation-1',
      operationId: 'operation-1',
      targetType: 'home-item' as const,
      targetId: 'home-field-desk',
      amount: 6,
      createdAt: '2026-08-01T09:00:00+08:00'
    };

    expect(adapter.getBalance()).toBe(8);
    adapter.spend(input);
    adapter.spend(input);

    expect(adapter.getBalance()).toBe(2);
    expect(adapter.hasSpend('operation-1')).toBe(true);
    expect(adapter.getTransactions().filter((item) => item.sourceId === 'operation-1')).toHaveLength(1);
  });
});
