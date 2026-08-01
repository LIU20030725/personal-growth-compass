import { getDiceBalance, spendAdventureDice } from '../../tasks/taskEngine';
import { loadTaskState, saveTaskState, type StorageLike } from '../../tasks/taskStorage';
import type { AdventureSpendInput, DiceTransaction } from '../../tasks/types';

export type TaskLedgerAdapter = {
  getBalance(): number;
  getTransactions(): DiceTransaction[];
  hasSpend(operationId: string): boolean;
  spend(input: AdventureSpendInput): DiceTransaction;
};

export function createTaskLedgerAdapter(storage: StorageLike): TaskLedgerAdapter {
  return {
    getBalance: () => getDiceBalance(loadTaskState(storage)),
    getTransactions: () => loadTaskState(storage).diceTransactions,
    hasSpend: (operationId) => loadTaskState(storage).diceTransactions.some((transaction) =>
      transaction.type === 'adventure-spend' && transaction.sourceId === operationId
    ),
    spend: (input) => {
      const current = loadTaskState(storage);
      const next = spendAdventureDice(current, input);
      saveTaskState(storage, next);
      const transaction = next.diceTransactions.find((item) =>
        item.type === 'adventure-spend' && item.sourceId === input.operationId
      );
      if (!transaction) throw new Error('冒险支出写入失败');
      return transaction;
    }
  };
}
