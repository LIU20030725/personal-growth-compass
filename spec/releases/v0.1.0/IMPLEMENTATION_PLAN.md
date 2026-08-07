# Dice Life Adventure Journal V0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a runnable V0.1.0 adventure-journal vertical slice with Journey/Home views, fixed-price partial investment, task-ledger spending, crash recovery, local persistence, original bright pixel scenes, accessibility, and module-level version records.

**Architecture:** Build an isolated `src/adventure-journal/` feature package. Pure domain functions own target state and unlock rules; a versioned storage adapter owns journal persistence; a task-ledger adapter remains the single source of dice balance; a recoverable operation coordinator prevents duplicate deductions across the two localStorage records. React pages consume one hook/controller and preserve the existing Dice Life shell.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Vitest 2, Testing Library, jsdom, Lucide React, scoped CSS, localStorage.

---

## Scope and file map

Create or modify only the following production areas for V0.1.0:

```text
src/adventure-journal/
├─ moduleVersion.ts
├─ content/v0_1.ts
├─ domain/types.ts
├─ domain/adventureEngine.ts
├─ storage/adventureStorage.ts
├─ integrations/taskLedgerAdapter.ts
├─ integrations/investmentCoordinator.ts
├─ useAdventureJournal.ts
├─ assets/maps/v0.1.0/SunnyTrailScene.tsx
├─ assets/home/v0.1.0/PermanentHomeScene.tsx
├─ components/DiceBalance.tsx
├─ components/InvestDialog.tsx
├─ components/LedgerDialog.tsx
├─ pages/JourneyView.tsx
├─ pages/HomeView.tsx
├─ pages/AdventureJournalPage.tsx
├─ styles/AdventureJournal.css
└─ tests/
   ├─ adventureEngine.test.ts
   ├─ adventureStorage.test.ts
   ├─ taskLedgerAdapter.test.ts
   ├─ investmentCoordinator.test.ts
   ├─ useAdventureJournal.test.tsx
   ├─ AdventureJournalPage.test.tsx
   └─ AppAdventureJournalIntegration.test.tsx
```

Modify shared integration files:

```text
src/tasks/types.ts
src/tasks/taskEngine.ts
src/tasks/taskEngineV2.test.ts
src/App.tsx
spec/03-计划实施路线.md
spec/VERSION.md
spec/CHANGELOG.md
spec/releases/v0.1.0/README.md
```

Do not add a router, global state library, animation library, canvas engine, audio dependency, backend, or duplicate source tree in this release.

## Confirmed V0.1.0 content values

These values are frozen for this implementation plan:

| ID | Type | Name | Fixed price |
| --- | --- | --- | ---: |
| `map-sunny-trail` | initial map | 晴日林径 | unlocked |
| `route-wind-valley` | route | 通往风过山谷 | 30 dice |
| `home-field-desk` | home item | 田野书桌 | 6 dice |
| `home-memory-shelf` | home item | 记忆陈列架 | 12 dice |

Thirty dice represents roughly four weeks at a normal mix of task, weekly, and goal rewards. Started targets persist their captured `price`; later content changes must not rewrite it.

### Task 1: Create module versions, content contracts, and initial state

**Files:**

- Create: `src/adventure-journal/moduleVersion.ts`
- Create: `src/adventure-journal/domain/types.ts`
- Create: `src/adventure-journal/content/v0_1.ts`
- Create: `src/adventure-journal/tests/adventureEngine.test.ts`
- Create: `src/adventure-journal/domain/adventureEngine.ts`

- [ ] **Step 1: Write the failing initial-state test**

Create `src/adventure-journal/tests/adventureEngine.test.ts`:

```ts
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
      targetId: 'route-wind-valley', price: 30, invested: 0, status: 'available'
    });
    expect(state.homeInvestments.map((item) => item.price)).toEqual([6, 12]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```text
npx vitest run src/adventure-journal/tests/adventureEngine.test.ts
```

Expected: FAIL because the feature files do not exist.

- [ ] **Step 3: Define the version and domain types**

Create `moduleVersion.ts`:

```ts
export const ADVENTURE_MODULE_VERSION = '0.1.0';
export const ADVENTURE_SCHEMA_VERSION = 1 as const;
export const ADVENTURE_CONTENT_VERSION = '0.1.0';
export const ADVENTURE_RULE_VERSION = 'adventure-investment-v1';
```

Create `domain/types.ts` with these complete contracts:

```ts
export type InvestmentTargetType = 'route' | 'home-item' | 'gear';
export type InvestmentStatus = 'available' | 'building' | 'ready' | 'unlocked';
export type OperationStatus = 'pending' | 'applied' | 'failed';

export type InvestmentProgress = {
  targetType: InvestmentTargetType;
  targetId: string;
  price: number;
  invested: number;
  status: InvestmentStatus;
  unlockedAt: string | null;
};

export type InvestmentOperation = {
  id: string;
  targetType: InvestmentTargetType;
  targetId: string;
  amount: number;
  status: OperationStatus;
  createdAt: string;
  appliedAt: string | null;
  error: string;
};

export type JournalPreferences = {
  reducedMotion: boolean;
  musicEnabled: boolean;
  ambientSoundEnabled: boolean;
  interfaceSoundEnabled: boolean;
};

export type AdventureJournalState = {
  schemaVersion: 1;
  contentVersion: string;
  currentChapterId: string;
  viewingMapId: string;
  unlockedMapIds: string[];
  routeInvestments: InvestmentProgress[];
  homeInvestments: InvestmentProgress[];
  gearInvestments: InvestmentProgress[];
  operations: InvestmentOperation[];
  preferences: JournalPreferences;
};

export type InvestmentInput = {
  operationId: string;
  targetType: InvestmentTargetType;
  targetId: string;
  amount: number;
  createdAt: string;
};
```

- [ ] **Step 4: Add frozen V0.1 content and initial state**

Create `content/v0_1.ts`:

```ts
export const V0_1_MAPS = [
  { id: 'map-sunny-trail', title: '晴日林径', titleEn: 'SUNNY TRAIL', chapter: 1 },
  { id: 'map-wind-valley', title: '风过山谷', titleEn: 'WIND VALLEY', chapter: 2 }
] as const;

export const V0_1_TARGETS = [
  { targetType: 'route', targetId: 'route-wind-valley', title: '通往风过山谷', price: 30 },
  { targetType: 'home-item', targetId: 'home-field-desk', title: '田野书桌', price: 6 },
  { targetType: 'home-item', targetId: 'home-memory-shelf', title: '记忆陈列架', price: 12 }
] as const;
```

Create `domain/adventureEngine.ts` with `createInitialAdventureState()` that maps those targets into `InvestmentProgress`, sets route status to `available`, home statuses to `available`, and uses the four disabled audio defaults plus `matchMedia('(prefers-reduced-motion: reduce)')` only in the hook, not the domain.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```text
npx vitest run src/adventure-journal/tests/adventureEngine.test.ts
```

Expected: 1 test passes.

Commit:

```text
git add src/adventure-journal
git commit -m "feat(adventure-journal): 2026-08-01 V0.1.0 建立领域模型与内容版本"
```

### Task 2: Implement fixed-price partial investment and unlock rules

**Files:**

- Modify: `src/adventure-journal/tests/adventureEngine.test.ts`
- Modify: `src/adventure-journal/domain/adventureEngine.ts`

- [ ] **Step 1: Write failing investment tests**

Add tests asserting all required invariants:

```ts
import { applyInvestment, findInvestment } from '../domain/adventureEngine';

it('keeps partial progress and unlocks exactly at the frozen price', () => {
  let state = createInitialAdventureState('2026-08-01T08:00:00+08:00');
  state = applyInvestment(state, {
    operationId: 'op-1', targetType: 'route', targetId: 'route-wind-valley', amount: 11,
    createdAt: '2026-08-01T09:00:00+08:00'
  });
  expect(findInvestment(state, 'route', 'route-wind-valley')).toMatchObject({ invested: 11, status: 'building', price: 30 });

  state = applyInvestment(state, {
    operationId: 'op-2', targetType: 'route', targetId: 'route-wind-valley', amount: 19,
    createdAt: '2026-08-02T09:00:00+08:00'
  });
  expect(findInvestment(state, 'route', 'route-wind-valley')).toMatchObject({ invested: 30, status: 'ready' });
});

it('rejects zero, overflow, missing, and already completed targets', () => {
  const state = createInitialAdventureState('2026-08-01T08:00:00+08:00');
  const base = { operationId: 'op', targetType: 'home-item' as const, targetId: 'home-field-desk', createdAt: '2026-08-01T09:00:00+08:00' };
  expect(() => applyInvestment(state, { ...base, amount: 0 })).toThrow('投入数量必须大于 0');
  expect(() => applyInvestment(state, { ...base, amount: 7 })).toThrow('本次最多还能投入 6 枚骰子');
  expect(() => applyInvestment(state, { ...base, targetId: 'missing', amount: 1 })).toThrow('投资目标不存在');
});
```

- [ ] **Step 2: Run and verify RED**

Run the single test file. Expected: FAIL because `applyInvestment` and `findInvestment` are missing.

- [ ] **Step 3: Implement the pure rules**

Add these exports to `adventureEngine.ts`:

```ts
export function findInvestment(state: AdventureJournalState, type: InvestmentTargetType, id: string): InvestmentProgress {
  const list = type === 'route' ? state.routeInvestments : type === 'home-item' ? state.homeInvestments : state.gearInvestments;
  const target = list.find((item) => item.targetId === id);
  if (!target) throw new Error('投资目标不存在');
  return target;
}

export function applyInvestment(state: AdventureJournalState, input: InvestmentInput): AdventureJournalState {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('投入数量必须大于 0');
  const target = findInvestment(state, input.targetType, input.targetId);
  if (target.status === 'ready' || target.status === 'unlocked') throw new Error('该目标已经完成');
  const remaining = target.price - target.invested;
  if (input.amount > remaining) throw new Error(`本次最多还能投入 ${remaining} 枚骰子`);
  const invested = target.invested + input.amount;
  const status = invested === target.price ? (input.targetType === 'route' ? 'ready' : 'unlocked') : 'building';
  const next = { ...target, invested, status, unlockedAt: status === 'unlocked' ? input.createdAt : null };
  const key = input.targetType === 'route' ? 'routeInvestments' : input.targetType === 'home-item' ? 'homeInvestments' : 'gearInvestments';
  return { ...state, [key]: state[key].map((item) => item.targetId === input.targetId ? next : item) };
}
```

- [ ] **Step 4: Run targeted and domain tests**

Run:

```text
npx vitest run src/adventure-journal/tests/adventureEngine.test.ts
```

Expected: all domain tests pass.

- [ ] **Step 5: Commit**

```text
git add src/adventure-journal/domain src/adventure-journal/tests/adventureEngine.test.ts
git commit -m "feat(adventure-journal): 2026-08-01 V0.1.0 实现固定价格投资规则"
```

### Task 3: Add versioned journal storage, corruption backup, and legacy seed migration

**Files:**

- Create: `src/adventure-journal/storage/adventureStorage.ts`
- Create: `src/adventure-journal/tests/adventureStorage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Use an in-memory `StorageLike` fixture and assert:

```ts
expect(loadAdventureState(storage, now)).toEqual(createInitialAdventureState(now));
saveAdventureState(storage, state);
expect(loadAdventureState(storage, now)).toEqual(state);

storage.setItem(ADVENTURE_STORAGE_KEY, '{broken');
expect(loadAdventureState(storage, now)).toEqual(createInitialAdventureState(now));
expect([...storage.keys()].some((key) => key.startsWith(`${ADVENTURE_STORAGE_KEY}.corrupt.`))).toBe(true);

storage.setItem('dice-life.task-system.v1', JSON.stringify({
  schemaVersion: 2,
  goals: [], goalProgressEntries: [], tasks: [], completions: [], diceTransactions: [], weeklyReviews: [],
  adventure: { chapter: 2, position: 7, unlockedChapter: 2 }
}));
expect(loadAdventureState(storage, now).viewingMapId).toBe('map-wind-valley');
```

- [ ] **Step 2: Run and verify RED**

Run `npx vitest run src/adventure-journal/tests/adventureStorage.test.ts`. Expected: missing module failure.

- [ ] **Step 3: Implement storage**

Create `adventureStorage.ts` exporting:

```ts
export const ADVENTURE_STORAGE_KEY = 'dice-life.adventure-journal.v1';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function saveAdventureState(storage: StorageLike, state: AdventureJournalState): void {
  storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(state));
}

export function loadAdventureState(storage: StorageLike, now: string): AdventureJournalState {
  const raw = storage.getItem(ADVENTURE_STORAGE_KEY);
  if (!raw) {
    const initial = migrateLegacyAdventureSeed(storage, createInitialAdventureState(now));
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
```

`isAdventureState()` must check schema `1`, string versions, all investment/operation arrays, map IDs, and preferences. `migrateLegacyAdventureSeed()` may map chapter 2 to an unlocked/viewed Wind Valley but must never remove or rewrite the task key.

- [ ] **Step 4: Verify storage tests**

Run the storage test. Expected: empty, round-trip, corruption, and legacy-seed tests pass.

- [ ] **Step 5: Commit**

```text
git add src/adventure-journal/storage src/adventure-journal/tests/adventureStorage.test.ts
git commit -m "feat(adventure-journal): 2026-08-01 V0.1.0 增加版本化存储与恢复"
```

### Task 4: Extend the task ledger with idempotent adventure spending

**Files:**

- Modify: `src/tasks/types.ts`
- Modify: `src/tasks/taskEngine.ts`
- Modify: `src/tasks/taskEngineV2.test.ts`

- [ ] **Step 1: Write failing ledger tests**

Add to `taskEngineV2.test.ts`:

```ts
it('spends adventure dice once per operation and preserves target metadata', () => {
  const state = createInitialTaskState();
  state.diceTransactions = [{
    id: 'income', type: 'goal-reward', amount: 8, sourceId: 'goal', dimension: 'health',
    ruleVersion: TASK_RULE_VERSION, createdAt: '2026-08-01T08:00:00+08:00', balanceAfter: 8
  }];
  const input = {
    transactionId: 'spend-1', operationId: 'operation-1', targetType: 'home-item' as const,
    targetId: 'home-field-desk', amount: 6, createdAt: '2026-08-01T09:00:00+08:00'
  };
  const first = spendAdventureDice(state, input);
  const second = spendAdventureDice(first, input);

  expect(getDiceBalance(first)).toBe(2);
  expect(second.diceTransactions).toHaveLength(first.diceTransactions.length);
  expect(first.diceTransactions.at(-1)).toMatchObject({
    type: 'adventure-spend', amount: -6, sourceId: 'operation-1',
    targetType: 'home-item', targetId: 'home-field-desk'
  });
});

it('rejects an adventure spend when balance is insufficient', () => {
  expect(() => spendAdventureDice(createInitialTaskState(), {
    transactionId: 'spend', operationId: 'operation', targetType: 'route',
    targetId: 'route-wind-valley', amount: 3, createdAt: '2026-08-01T09:00:00+08:00'
  })).toThrow('骰子余额不足，还差 3 枚');
});
```

- [ ] **Step 2: Run and verify RED**

Run `npx vitest run src/tasks/taskEngineV2.test.ts`. Expected: missing `spendAdventureDice` and metadata fields.

- [ ] **Step 3: Extend transaction metadata and implement spending**

Add optional fields to `DiceTransaction`:

```ts
targetType?: 'route' | 'home-item' | 'gear';
targetId?: string;
```

Export this engine function:

```ts
export function spendAdventureDice(state: TaskSystemState, input: {
  transactionId: string;
  operationId: string;
  targetType: 'route' | 'home-item' | 'gear';
  targetId: string;
  amount: number;
  createdAt: string;
}): TaskSystemState {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('投入数量必须大于 0');
  if (state.diceTransactions.some((item) => item.type === 'adventure-spend' && item.sourceId === input.operationId)) return state;
  const missing = input.amount - getDiceBalance(state);
  if (missing > 0) throw new Error(`骰子余额不足，还差 ${missing} 枚`);
  return addTransaction(state, {
    id: input.transactionId,
    type: 'adventure-spend',
    amount: -input.amount,
    sourceId: input.operationId,
    dimension: 'mixed',
    ruleVersion: 'adventure-investment-v1',
    createdAt: input.createdAt,
    targetType: input.targetType,
    targetId: input.targetId
  });
}
```

- [ ] **Step 4: Run task regressions**

Run:

```text
npx vitest run src/tasks/taskEngine.test.ts src/tasks/taskEngineV2.test.ts src/tasks/taskStorage.test.ts
```

Expected: all task engine and storage tests pass.

- [ ] **Step 5: Commit**

```text
git add src/tasks
git commit -m "feat(tasks): 2026-08-01 V2.0 支持冒险日志幂等支出"
```

### Task 5: Build the task-ledger adapter and recoverable investment coordinator

**Files:**

- Create: `src/adventure-journal/integrations/taskLedgerAdapter.ts`
- Create: `src/adventure-journal/integrations/investmentCoordinator.ts`
- Create: `src/adventure-journal/tests/taskLedgerAdapter.test.ts`
- Create: `src/adventure-journal/tests/investmentCoordinator.test.ts`

- [ ] **Step 1: Write failing adapter and recovery tests**

Cover these outcomes:

```ts
expect(adapter.getBalance()).toBe(8);
adapter.spend(input);
expect(adapter.getBalance()).toBe(2);
expect(adapter.hasSpend('operation-1')).toBe(true);

const interrupted = coordinator.beginInvestment(input, { interruptAfterLedger: true });
expect(interrupted.operations[0].status).toBe('pending');
const recovered = coordinator.recover();
expect(recovered.operations[0].status).toBe('applied');
expect(findInvestment(recovered, 'home-item', 'home-field-desk').invested).toBe(6);
expect(adapter.getBalance()).toBe(2);

coordinator.recover();
expect(adapter.getTransactions().filter((item) => item.sourceId === 'operation-1')).toHaveLength(1);
```

The test coordinator may expose an injected `afterLedgerWrite` callback that throws to simulate a crash; do not add a production boolean named `interruptAfterLedger`.

- [ ] **Step 2: Run and verify RED**

Run both new test files. Expected: missing modules.

- [ ] **Step 3: Implement `createTaskLedgerAdapter()`**

The adapter must load the latest task state for every read/write:

```ts
export function createTaskLedgerAdapter(storage: StorageLike) {
  return {
    getBalance: () => getDiceBalance(loadTaskState(storage)),
    getTransactions: () => loadTaskState(storage).diceTransactions,
    hasSpend: (operationId: string) => loadTaskState(storage).diceTransactions.some(
      (item) => item.type === 'adventure-spend' && item.sourceId === operationId
    ),
    spend: (input: AdventureSpendInput) => {
      const current = loadTaskState(storage);
      const next = spendAdventureDice(current, input);
      saveTaskState(storage, next);
      return next.diceTransactions.find((item) => item.type === 'adventure-spend' && item.sourceId === input.operationId)!;
    }
  };
}
```

- [ ] **Step 4: Implement the coordinator and recovery**

`createInvestmentCoordinator()` must:

1. Re-read journal state and validate the target before any write.
2. Append one pending operation and save journal state.
3. Call ledger `spend()` with `transactionId: adventure-spend-${operationId}`.
4. Apply progress, mark the operation `applied`, and save both changes in one journal write.
5. On recovery, apply pending operations that already exist in the ledger.
6. Mark pending operations without a ledger transaction as `failed` with `error: '扣款未发生，请重新提交'`; never deduct automatically during startup.

Expose:

```ts
type InvestmentCoordinator = {
  invest(input: InvestmentInput): AdventureJournalState;
  recover(): AdventureJournalState;
};
```

- [ ] **Step 5: Verify, run task regressions, and commit**

Run:

```text
npx vitest run src/adventure-journal/tests/taskLedgerAdapter.test.ts src/adventure-journal/tests/investmentCoordinator.test.ts src/tasks
```

Expected: all adapter, recovery, and task tests pass.

Commit:

```text
git add src/adventure-journal/integrations src/adventure-journal/tests src/tasks
git commit -m "feat(adventure-journal): 2026-08-01 V0.1.0 打通骰子账本与恢复事务"
```

### Task 6: Add the React controller hook

**Files:**

- Create: `src/adventure-journal/useAdventureJournal.ts`
- Create: `src/adventure-journal/tests/useAdventureJournal.test.tsx`

- [ ] **Step 1: Write failing hook tests**

Use `renderHook()` with deterministic storage, IDs, and time:

```ts
const { result } = renderHook(() => useAdventureJournal({
  storage,
  now: () => '2026-08-01T09:00:00+08:00',
  idFactory: () => 'operation-1',
  reducedMotion: true
}));

expect(result.current.activeTab).toBe('journey');
expect(result.current.state.preferences.reducedMotion).toBe(true);
expect(result.current.diceBalance).toBe(8);

act(() => result.current.invest('home-item', 'home-field-desk', 6));
expect(result.current.diceBalance).toBe(2);
expect(result.current.state.homeInvestments[0]).toMatchObject({ invested: 6, status: 'unlocked' });

act(() => result.current.setActiveTab('home'));
expect(result.current.activeTab).toBe('home');
```

- [ ] **Step 2: Run and verify RED**

Run `npx vitest run src/adventure-journal/tests/useAdventureJournal.test.tsx`. Expected: missing hook.

- [ ] **Step 3: Implement the hook**

Use one state initializer that calls coordinator `recover()`. Return this public API:

```ts
type AdventureJournalController = {
  state: AdventureJournalState;
  activeTab: 'journey' | 'home';
  diceBalance: number;
  ledgerTransactions: DiceTransaction[];
  setActiveTab(tab: 'journey' | 'home'): void;
  setViewingMap(mapId: string): void;
  invest(type: InvestmentTargetType, targetId: string, amount: number): void;
  refresh(): void;
};
```

`invest()` must generate a new operation ID, call the coordinator, refresh balance/transactions from the adapter, and rethrow domain errors so the dialog can show the exact recovery message.

- [ ] **Step 4: Verify hook and storage tests**

Run:

```text
npx vitest run src/adventure-journal/tests/useAdventureJournal.test.tsx src/adventure-journal/tests/adventureStorage.test.ts src/adventure-journal/tests/investmentCoordinator.test.ts
```

Expected: all controller and persistence workflows pass.

- [ ] **Step 5: Commit**

```text
git add src/adventure-journal/useAdventureJournal.ts src/adventure-journal/tests/useAdventureJournal.test.tsx
git commit -m "feat(adventure-journal): 2026-08-01 V0.1.0 增加页面状态控制器"
```

### Task 7: Build accessible shared controls and original pixel stages

**Files:**

- Create: `src/adventure-journal/assets/maps/v0.1.0/SunnyTrailScene.tsx`
- Create: `src/adventure-journal/assets/home/v0.1.0/PermanentHomeScene.tsx`
- Create: `src/adventure-journal/components/DiceBalance.tsx`
- Create: `src/adventure-journal/components/InvestDialog.tsx`
- Create: `src/adventure-journal/components/LedgerDialog.tsx`
- Create: `src/adventure-journal/styles/AdventureJournal.css`
- Create: `src/adventure-journal/tests/AdventureJournalPage.test.tsx`

- [ ] **Step 1: Write failing shared-component tests**

Assert:

```ts
render(<InvestDialog open targetName="田野书桌" balance={8} remaining={6} onClose={onClose} onConfirm={onConfirm} />);
expect(screen.getByRole('dialog', { name: '投入骰子' })).toBeInTheDocument();
expect(screen.getByLabelText('投入数量')).toHaveAttribute('max', '6');
fireEvent.change(screen.getByLabelText('投入数量'), { target: { value: '7' } });
fireEvent.click(screen.getByRole('button', { name: '确认投入' }));
expect(screen.getByText('本次最多还能投入 6 枚骰子')).toBeInTheDocument();
expect(onConfirm).not.toHaveBeenCalled();

render(<DiceBalance value={12} />);
expect(screen.getByLabelText('成长骰子余额 12')).toBeInTheDocument();
```

- [ ] **Step 2: Run and verify RED**

Run the page test. Expected: missing shared components.

- [ ] **Step 3: Implement shared controls**

`InvestDialog` must use a native `<dialog>`-semantics container (`role="dialog"`, `aria-modal="true"`), visible `<label htmlFor="investment-amount">`, integer input, `min="1"`, `max={Math.min(balance, remaining)}`, quick buttons for 1, 5, and max, inline error text with `role="alert"`, Cancel, and Confirm. Buttons must have at least 44px hit areas.

`LedgerDialog` must render transactions newest-first with source labels, signed dice amounts, dates, and empty state “还没有骰子记录”. Adventure spends must show their `targetId` metadata without relying on color.

- [ ] **Step 4: Implement original scene components and base CSS**

Both scene components must render original inline SVG with `viewBox="0 0 960 520"`, `shapeRendering="crispEdges"`, descriptive `role="img"` labels, three depth groups, and no copied game assets. `SunnyTrailScene` includes sky, clouds, far mountains, forest, path, flowers, and a small walking character. `PermanentHomeScene` includes the stable house, coral mailbox, fixed desk/shelf locations, vegetation, and warm window light.

Create scoped CSS under `.adventure-journal` using the confirmed palette and these tokens:

```css
.adventure-journal {
  --journal-sky: #83ced5;
  --journal-cloud: #edf7ec;
  --journal-forest: #568966;
  --journal-grass: #86ad6d;
  --journal-path: #e0c488;
  --journal-wood: #5b4c32;
  --journal-coral: #c86446;
  display: grid;
  gap: 20px;
}

.journal-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1.85 / 1;
  min-height: 420px;
  border: 2px solid var(--ink);
  background: var(--journal-sky);
  box-shadow: var(--shadow-hard);
}

@media (prefers-reduced-motion: reduce) {
  .adventure-journal *, .adventure-journal *::before, .adventure-journal *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

- [ ] **Step 5: Verify and commit**

Run the page test. Expected: shared control tests pass.

Commit:

```text
git add src/adventure-journal/assets src/adventure-journal/components src/adventure-journal/styles src/adventure-journal/tests/AdventureJournalPage.test.tsx
git commit -m "style(adventure-journal): 2026-08-01 V0.1.0 建立像素舞台与通用交互"
```

### Task 8: Implement Journey and Home views

**Files:**

- Create: `src/adventure-journal/pages/JourneyView.tsx`
- Create: `src/adventure-journal/pages/HomeView.tsx`
- Create: `src/adventure-journal/pages/AdventureJournalPage.tsx`
- Modify: `src/adventure-journal/tests/AdventureJournalPage.test.tsx`
- Modify: `src/adventure-journal/styles/AdventureJournal.css`

- [ ] **Step 1: Write failing user-visible workflow tests**

Seed eight dice in task storage, render `AdventureJournalPage`, then assert:

```ts
expect(screen.getByRole('heading', { name: '冒险日志' })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: '旅途 JOURNEY' })).toHaveAttribute('aria-selected', 'true');
expect(screen.getByRole('img', { name: '晴日林径像素旅途场景' })).toBeInTheDocument();
expect(screen.getByText('0 / 30')).toBeInTheDocument();

fireEvent.click(screen.getByRole('tab', { name: '家园 HOME' }));
expect(screen.getByRole('img', { name: '永久家园像素场景' })).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: '建设田野书桌' }));
fireEvent.change(screen.getByLabelText('投入数量'), { target: { value: '6' } });
fireEvent.click(screen.getByRole('button', { name: '确认投入' }));
expect(screen.getByText('田野书桌已建成')).toBeInTheDocument();
expect(screen.getByLabelText('成长骰子余额 2')).toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: '查看骰子账本' }));
expect(screen.getByRole('dialog', { name: '骰子账本' })).toHaveTextContent('-6');
```

Add a zero-balance test that submits one route die and expects “骰子余额不足，还差 1 枚” with no progress change.

- [ ] **Step 2: Run and verify RED**

Run `npx vitest run src/adventure-journal/tests/AdventureJournalPage.test.tsx`. Expected: missing page components.

- [ ] **Step 3: Implement `JourneyView` and `HomeView`**

`JourneyView` renders the scene as the dominant stage, documentary labels, current route name, fixed price, numeric progress, accessible progress bar, one gold “投入骰子 INVEST” action, and a bottom discovery strip marked “V0.2.0 开放旅途发现” without presenting it as an active feature.

`HomeView` renders the permanent-home scene, two build rows, current invested/price values, one build action per available item, completed text, and a visible mailbox marked “V0.3.0 开放阶段来信” without red dots or countdowns.

- [ ] **Step 4: Implement `AdventureJournalPage` orchestration**

The page must:

- instantiate `useAdventureJournal()` once;
- render title, English micro-label, dice balance, and ledger button;
- use `role="tablist"`, `role="tab"`, `aria-selected`, and associated `tabpanel` IDs;
- keep the active investment target in local UI state;
- catch `invest()` errors and display them in `InvestDialog`;
- close the dialog only after a successful investment;
- avoid any direct localStorage calls.

- [ ] **Step 5: Verify page workflows and commit**

Run:

```text
npx vitest run src/adventure-journal/tests/AdventureJournalPage.test.tsx src/adventure-journal/tests/useAdventureJournal.test.tsx
```

Expected: journey, home, investment, insufficient balance, and ledger workflows pass.

Commit:

```text
git add src/adventure-journal/pages src/adventure-journal/styles src/adventure-journal/tests
git commit -m "feat(adventure-journal): 2026-08-01 V0.1.0 实现旅途与家园页面"
```

### Task 9: Integrate the feature into the Dice Life shell

**Files:**

- Modify: `src/App.tsx:37,543-550,1040-1046`
- Create: `src/adventure-journal/tests/AppAdventureJournalIntegration.test.tsx`
- Verify: `src/App.test.tsx`
- Verify: `src/tasks/AppTaskIntegration.test.tsx`

- [ ] **Step 1: Write the failing App integration test**

```ts
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';

describe('Dice Life adventure journal navigation', () => {
  beforeEach(() => localStorage.clear());

  it('opens the real adventure journal without breaking task navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '冒险日志' }));
    expect(screen.getByRole('heading', { name: '冒险日志' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '旅途 JOURNEY' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '任务' }));
    expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run the new integration test. Expected: the journal button still opens `ModuleView`, so the Journey tab is absent.

- [ ] **Step 3: Wire `AdventureJournalPage` into App**

Import `AdventureJournalPage`, remove the `journal` placeholder entry from `moduleViewContent`, change its record type to exclude `journal`, and add this branch before the fallback:

```tsx
) : activeView === 'quests' ? (
  <TaskBoard />
) : activeView === 'journal' ? (
  <AdventureJournalPage />
) : (
  <ModuleView view={activeView} />
)}
```

Do not change Header, Sidebar, finance layout, or other module navigation.

- [ ] **Step 4: Run App and task integration regressions**

Run:

```text
npx vitest run src/adventure-journal/tests/AppAdventureJournalIntegration.test.tsx src/App.test.tsx src/tasks/AppTaskIntegration.test.tsx
```

Expected: all App-shell, finance, task, and adventure navigation tests pass.

- [ ] **Step 5: Commit**

```text
git add src/App.tsx src/adventure-journal/tests/AppAdventureJournalIntegration.test.tsx
git commit -m "feat(app): 2026-08-01 V2.0 接入冒险日志模块入口"
```

### Task 10: Responsive, reduced-motion, and visual quality pass

**Files:**

- Modify: `src/adventure-journal/styles/AdventureJournal.css`
- Modify: `src/adventure-journal/tests/AdventureJournalPage.test.tsx`
- Verify: `src/styles.css`

- [ ] **Step 1: Add failing accessibility-state assertions**

Add assertions for:

- tab selection and tabpanel relationships;
- every icon-only button having an accessible name;
- investment errors using `role="alert"`;
- progress having `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and visible numeric text;
- all disabled build/invest controls using the native `disabled` attribute.

- [ ] **Step 2: Run and verify RED**

Run the page test. Expected: at least one missing ARIA relationship or disabled state assertion fails.

- [ ] **Step 3: Complete scoped responsive CSS**

Add these behavior breakpoints without altering global layout:

```css
@media (max-width: 1180px) {
  .journal-stage { min-height: 360px; }
  .journal-stage-panel { width: min(240px, 32%); }
  .journal-documentary-secondary { display: none; }
}

@media (max-width: 900px) {
  .adventure-journal { gap: 16px; }
  .journal-header { align-items: flex-start; flex-direction: column; }
  .journal-stage { min-height: 320px; }
  .journal-stage-panel { position: static; width: auto; margin: 12px; }
  .journal-bottom-strip { grid-auto-flow: row; overflow: visible; }
}
```

Ensure no component uses font size below 12px for meaningful text, no functional state relies on hover, and transitions remain 150–300ms outside reduced motion.

- [ ] **Step 4: Verify page tests and production build**

Run:

```text
npx vitest run src/adventure-journal
npm run build
```

Expected: adventure tests pass and TypeScript/Vite build exits 0.

- [ ] **Step 5: Commit**

```text
git add src/adventure-journal
git commit -m "style(adventure-journal): 2026-08-01 V0.1.0 完成响应式与无障碍收敛"
```

### Task 11: Full verification, runtime preview, and release records

**Files:**

- Modify: `spec/03-计划实施路线.md`
- Modify: `spec/VERSION.md`
- Modify: `spec/CHANGELOG.md`
- Modify: `spec/releases/v0.1.0/README.md`
- Verify: all project files

- [ ] **Step 1: Run focused and full automated verification**

Run in order:

```text
npx vitest run src/adventure-journal src/tasks
npm test
npm run build
git diff --check
```

Expected: zero failed tests, build exit 0, and no whitespace errors.

- [ ] **Step 2: Start the preview and verify the page responds**

Start the existing dev server on port 4173, then verify HTTP 200:

```text
npm run dev -- --port 4173
```

Open `http://127.0.0.1:4173/`, enter 冒险日志, and verify Journey and Home both render without console errors.

- [ ] **Step 3: Perform the visual checklist at three widths**

At 1440px, 1180px, and 900px verify:

- global Header and Sidebar dimensions are unchanged;
- the scene is the first visual focus and occupies roughly 75%–80% of the module;
- the stage panel does not cover the character, path, house, or mailbox;
- no horizontal overflow exists;
- text contrast, focus rings, 44px targets, and reduced motion remain usable;
- resource failure can be simulated without blocking investment controls.

Save screenshot evidence paths in `spec/releases/v0.1.0/README.md`; screenshots are evidence, not source assets.

- [ ] **Step 4: Update version and release documents**

Set `VERSION.md` to released `0.1.0`, schema `1`, content `0.1.0`; move completed entries from `[Unreleased]` into `[0.1.0] - 2026-08-01`; check completed items in `03-计划实施路线.md`; replace the release evidence checklist with actual commands, test counts, build result, screenshot paths, migrations, known limitations, and V0.2.0 entry criteria.

- [ ] **Step 5: Commit the verified release state**

```text
git add spec src/adventure-journal src/tasks src/App.tsx
git commit -m "docs(adventure-journal): 2026-08-01 V0.1.0 记录发布验收结果"
```

Do not create `adventure-journal-v0.1.0` until the final diff audit confirms every V0.1.0 release item and the worktree is clean.

## Plan self-review

- **Spec coverage:** Tasks 1–6 cover module boundary, fixed pricing, persistence, task-ledger ownership, idempotency, recovery, and controller state. Tasks 7–10 cover the confirmed UI shell, original pixel stage, Journey/Home structure, responsive behavior, accessibility, static fallback, and reduced motion. Task 11 covers version records, verification, and release evidence.
- **Full V1 fidelity:** V0.2.0 and V0.3.0 remain explicit release successors; no V1 requirement is deleted or falsely marked delivered by V0.1.0.
- **Type consistency:** `InvestmentTargetType`, `InvestmentInput`, operation states, transaction metadata, hook API, adapter API, and storage version names are defined once and reused consistently.
- **No placeholders:** Every implementation task has exact files, failing assertions, commands, expected outcomes, implementation contracts, and commit messages.
- **Isolation:** No task changes unrelated finance, ability, body, emotion, or achievement behavior.
