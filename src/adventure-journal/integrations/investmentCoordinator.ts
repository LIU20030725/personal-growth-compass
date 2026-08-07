import { applyInvestment, findInvestment } from '../domain/adventureEngine';
import type {
  AdventureJournalState,
  InvestmentInput,
  InvestmentOperation
} from '../domain/types';
import {
  loadAdventureState,
  saveAdventureState,
  type StorageLike
} from '../storage/adventureStorage';
import type { TaskLedgerAdapter } from './taskLedgerAdapter';

type CoordinatorOptions = {
  storage: StorageLike;
  ledger: TaskLedgerAdapter;
  afterLedgerWrite?: () => void;
};

export type InvestmentCoordinator = {
  invest(input: InvestmentInput): AdventureJournalState;
  recover(now: string): AdventureJournalState;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '投资失败，请重试';
}

function replaceOperation(
  state: AdventureJournalState,
  operationId: string,
  change: (operation: InvestmentOperation) => InvestmentOperation
): AdventureJournalState {
  return {
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === operationId ? change(operation) : operation
    )
  };
}

export function createInvestmentCoordinator({
  storage,
  ledger,
  afterLedgerWrite
}: CoordinatorOptions): InvestmentCoordinator {
  return {
    invest(input) {
      const current = loadAdventureState(storage, input.createdAt);
      const existing = current.operations.find((operation) => operation.id === input.operationId);
      if (existing?.status === 'applied') return current;
      if (existing) throw new Error('该投资操作已经处理');

      findInvestment(current, input.targetType, input.targetId);
      applyInvestment(current, input);

      const pendingOperation: InvestmentOperation = {
        id: input.operationId,
        targetType: input.targetType,
        targetId: input.targetId,
        amount: input.amount,
        status: 'pending',
        createdAt: input.createdAt,
        appliedAt: null,
        error: ''
      };
      const pendingState = {
        ...current,
        operations: [...current.operations, pendingOperation]
      };
      saveAdventureState(storage, pendingState);

      try {
        ledger.spend({
          transactionId: `adventure-spend-${input.operationId}`,
          operationId: input.operationId,
          targetType: input.targetType,
          targetId: input.targetId,
          amount: input.amount,
          createdAt: input.createdAt
        });
      } catch (error) {
        const failed = replaceOperation(pendingState, input.operationId, (operation) => ({
          ...operation,
          status: 'failed',
          error: errorMessage(error)
        }));
        saveAdventureState(storage, failed);
        throw error;
      }

      afterLedgerWrite?.();

      const progressed = applyInvestment(pendingState, input);
      const applied = replaceOperation(progressed, input.operationId, (operation) => ({
        ...operation,
        status: 'applied',
        appliedAt: input.createdAt,
        error: ''
      }));
      saveAdventureState(storage, applied);
      return applied;
    },

    recover(now) {
      let state = loadAdventureState(storage, now);

      for (const operation of state.operations.filter((item) => item.status === 'pending')) {
        if (!ledger.hasSpend(operation.id)) {
          state = replaceOperation(state, operation.id, (item) => ({
            ...item,
            status: 'failed',
            error: '扣款未发生，请重新提交'
          }));
          continue;
        }

        state = applyInvestment(state, {
          operationId: operation.id,
          targetType: operation.targetType,
          targetId: operation.targetId,
          amount: operation.amount,
          createdAt: operation.createdAt
        });
        state = replaceOperation(state, operation.id, (item) => ({
          ...item,
          status: 'applied',
          appliedAt: now,
          error: ''
        }));
      }

      saveAdventureState(storage, state);
      return state;
    }
  };
}
