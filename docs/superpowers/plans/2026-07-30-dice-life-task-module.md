# Dice Life Task Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Dice Life task-module MVP: long-term goals, daily/weekly tasks, evidence-backed completion, immediate dice rewards, weekly bonus settlement, long-term goal rewards, dice ledger, and local persistence.

**Architecture:** Add an isolated `src/tasks/` feature package. Pure domain functions own reward and period rules, a versioned storage adapter owns persistence, a reducer-based hook owns atomic state transitions, and focused React components own presentation. `App.tsx` only replaces the current quests preview with `TaskBoard`.

**Tech Stack:** React 18, TypeScript 5.7, Vitest 2, Testing Library, lucide-react, CSS, localStorage.

---

## File Map

### New domain files

- `src/tasks/types.ts` — task-system domain types and state shape.
- `src/tasks/taskConfig.ts` — reward constants, storage key, rule version, dimension labels.
- `src/tasks/taskEngine.ts` — pure date, difficulty, reward, progress, and invariant functions.
- `src/tasks/taskEngine.test.ts` — unit tests for all reward and anti-duplication rules.

### New state and persistence files

- `src/tasks/taskStorage.ts` — versioned localStorage load/save and damaged-data backup.
- `src/tasks/taskStorage.test.ts` — storage initialization, round-trip, and corruption tests.
- `src/tasks/useTaskSystem.ts` — reducer-based atomic actions and public task-system API.
- `src/tasks/useTaskSystem.test.tsx` — hook-level workflow tests.

### New UI files

- `src/tasks/TaskBoard.tsx` — module page composition and filter state.
- `src/tasks/TaskBoard.css` — isolated responsive Dice Life task styles.
- `src/tasks/components/GoalCard.tsx` — long-term goal summary and actions.
- `src/tasks/components/TaskCard.tsx` — daily/weekly progress and completion action.
- `src/tasks/components/GoalForm.tsx` — long-term goal creation/edit form.
- `src/tasks/components/TaskForm.tsx` — short-task creation/edit form.
- `src/tasks/components/CompletionDialog.tsx` — progress/evidence capture.
- `src/tasks/components/WeeklyReviewPanel.tsx` — bonus preview and one-time settlement.
- `src/tasks/components/DiceLedger.tsx` — reward history.
- `src/tasks/TaskBoard.test.tsx` — full UI workflows.
- `src/tasks/AppTaskIntegration.test.tsx` — navigation integration regression.

### Existing file

- `src/App.tsx` — import and render `TaskBoard` only when `activeView === 'quests'`.

The existing worktree contains user-owned changes in `App.tsx`, `App.test.tsx`, and `styles.css`. Implementation must preserve them. New task CSS stays in `TaskBoard.css`, and no existing dirty file is staged automatically.

---

### Task 1: Define Domain Types and Config

**Files:**

- Create: `src/tasks/types.ts`
- Create: `src/tasks/taskConfig.ts`
- Test: `src/tasks/taskEngine.test.ts`

- [ ] **Step 1: Write the type-level fixture test**

Create `src/tasks/taskEngine.test.ts` with an initial fixture that imports the types and config:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialTaskState } from './taskEngine';
import {
  MAINTENANCE_WEEKLY_DICE_CAP,
  TASK_REWARD_DICE,
  WEEKLY_BONUS_DICE_CAP
} from './taskConfig';

describe('task system configuration', () => {
  it('starts with a zero-balance, versioned state and confirmed reward caps', () => {
    const state = createInitialTaskState();

    expect(state.schemaVersion).toBe(1);
    expect(state.goals).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.diceTransactions).toEqual([]);
    expect(TASK_REWARD_DICE).toBe(1);
    expect(MAINTENANCE_WEEKLY_DICE_CAP).toBe(3);
    expect(WEEKLY_BONUS_DICE_CAP).toBe(5);
  });
});
```

- [ ] **Step 2: Run the fixture test and verify failure**

Run:

```bash
npx vitest run src/tasks/taskEngine.test.ts
```

Expected: FAIL because `types.ts`, `taskConfig.ts`, and `taskEngine.ts` do not exist.

- [ ] **Step 3: Define the complete domain types**

Create `src/tasks/types.ts` with these exported types:

```ts
export type GrowthDimension = 'wealth' | 'ability' | 'health';
export type TaskDimension = GrowthDimension | 'recovery';
export type RecordStatus = 'active' | 'completed' | 'archived';
export type TaskCadence = 'daily' | 'weekly';
export type VerificationType = 'reflection' | 'metric' | 'module-data' | 'link';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type RelativeChallenge = 'comfortable' | 'challenging' | 'stretch';

export type LongTermGoal = {
  id: string;
  dimension: GrowthDimension;
  title: string;
  meaning: string;
  startDate: string;
  targetDate: string;
  baselineLabel: string;
  baselineValue: number | null;
  targetLabel: string;
  targetValue: number | null;
  currentValue: number | null;
  progressPercent: number;
  verificationType: VerificationType;
  suggestedDifficulty: Difficulty;
  confirmedDifficulty: Difficulty;
  difficultyReason: string;
  status: RecordStatus;
  createdAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  completionReflection: string;
  completionEvidenceLink: string;
};

export type ShortTask = {
  id: string;
  goalId: string | null;
  dimension: TaskDimension;
  title: string;
  completionStandard: string;
  cadence: TaskCadence;
  targetCount: number;
  estimatedMinutesPerOccurrence: number;
  relativeChallenge: RelativeChallenge;
  startDate: string;
  endDate: string | null;
  verificationType: VerificationType;
  suggestedDifficulty: Difficulty;
  confirmedDifficulty: Difficulty;
  difficultyReason: string;
  isMaintenance: boolean;
  rewardEligible: boolean;
  status: RecordStatus;
  createdAt: string;
  archivedAt: string | null;
};

export type TaskCompletion = {
  id: string;
  taskId: string;
  periodKey: string;
  sequenceInPeriod: number;
  completedAt: string;
  reflection: string;
  metricValue: number | null;
  evidenceLink: string;
  rewardGranted: boolean;
  diceTransactionId: string | null;
};

export type DiceTransactionType =
  | 'task-reward'
  | 'weekly-bonus'
  | 'goal-reward'
  | 'adventure-spend';

export type DiceTransaction = {
  id: string;
  type: DiceTransactionType;
  amount: number;
  sourceId: string;
  dimension: GrowthDimension | 'mixed';
  ruleVersion: string;
  createdAt: string;
  balanceAfter: number;
};

export type WeeklyReview = {
  id: string;
  weekKey: string;
  eligibleTaskCount: number;
  completionCount: number;
  completionRate: number;
  evidenceCoverageRate: number;
  qualifyingStreakWeeks: number;
  bonusDice: number;
  settledAt: string;
  diceTransactionId: string;
};

export type AdventureProgress = {
  chapter: number;
  position: number;
  unlockedChapter: number;
};

export type TaskSystemState = {
  schemaVersion: 1;
  goals: LongTermGoal[];
  tasks: ShortTask[];
  completions: TaskCompletion[];
  diceTransactions: DiceTransaction[];
  weeklyReviews: WeeklyReview[];
  adventure: AdventureProgress;
};

export type GoalDraft = Omit<
  LongTermGoal,
  | 'id'
  | 'suggestedDifficulty'
  | 'status'
  | 'createdAt'
  | 'completedAt'
  | 'archivedAt'
  | 'completionReflection'
  | 'completionEvidenceLink'
>;

export type TaskDraft = Omit<
  ShortTask,
  'id' | 'suggestedDifficulty' | 'rewardEligible' | 'status' | 'createdAt' | 'archivedAt'
>;

export type CompletionDraft = {
  taskId: string;
  completedAt: string;
  reflection: string;
  metricValue: number | null;
  evidenceLink: string;
};
```

- [ ] **Step 4: Define centralized constants**

Create `src/tasks/taskConfig.ts`:

```ts
import type { GrowthDimension } from './types';

export const TASK_STORAGE_KEY = 'dice-life.task-system.v1';
export const TASK_RULE_VERSION = 'task-rewards-v1';
export const TASK_REWARD_DICE = 1;
export const MAINTENANCE_WEEKLY_DICE_CAP = 3;
export const WEEKLY_BONUS_DICE_CAP = 5;

export const DIMENSION_LABELS: Record<GrowthDimension, string> = {
  wealth: '财富积累',
  ability: '能力提升',
  health: '健康锻炼'
};

export const GOAL_REWARD_BY_DIFFICULTY = {
  1: 4,
  2: 5,
  3: 6,
  4: 7,
  5: 8
} as const;
```

- [ ] **Step 5: Add the initial state factory**

Create the first implementation in `src/tasks/taskEngine.ts`:

```ts
import type { TaskSystemState } from './types';

export function createInitialTaskState(): TaskSystemState {
  return {
    schemaVersion: 1,
    goals: [],
    tasks: [],
    completions: [],
    diceTransactions: [],
    weeklyReviews: [],
    adventure: { chapter: 1, position: 0, unlockedChapter: 1 }
  };
}
```

- [ ] **Step 6: Run the test**

Run:

```bash
npx vitest run src/tasks/taskEngine.test.ts
```

Expected: PASS.

---

### Task 2: Implement Pure Task and Reward Rules with TDD

**Files:**

- Modify: `src/tasks/taskEngine.ts`
- Modify: `src/tasks/taskEngine.test.ts`

- [ ] **Step 1: Add failing tests for difficulty and periods**

Add tests that assert:

```ts
expect(suggestDifficulty({
  estimatedMinutesPerOccurrence: 60,
  targetCount: 5,
  relativeChallenge: 'stretch'
})).toBe(5);

expect(getPeriodKey('daily', '2026-07-30T09:00:00+08:00')).toBe('2026-07-30');
expect(getPeriodKey('weekly', '2026-07-30T09:00:00+08:00')).toBe('2026-W31');
```

Run `npx vitest run src/tasks/taskEngine.test.ts`; expected FAIL because the functions are missing.

- [ ] **Step 2: Implement transparent difficulty and period helpers**

Add:

```ts
export function suggestDifficulty(input: {
  estimatedMinutesPerOccurrence: number;
  targetCount: number;
  relativeChallenge: RelativeChallenge;
}): Difficulty {
  const weeklyMinutes = input.estimatedMinutesPerOccurrence * input.targetCount;
  let score = 1;
  if (weeklyMinutes >= 120) score += 1;
  if (weeklyMinutes >= 300) score += 1;
  if (input.targetCount >= 5) score += 1;
  if (input.relativeChallenge === 'stretch') score += 1;
  return Math.min(5, score) as Difficulty;
}

export function getPeriodKey(cadence: TaskCadence, isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  if (cadence === 'daily') return `${year}-${month}-${dayOfMonth}`;
  const local = new Date(year, date.getMonth(), date.getDate());
  const day = local.getDay() || 7;
  local.setDate(local.getDate() + 4 - day);
  const yearStart = new Date(local.getFullYear(), 0, 1);
  const week = Math.ceil((((local.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${local.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
```

- [ ] **Step 3: Add failing tests for task completion rewards**

Cover:

- Daily task rewards exactly once per day.
- Weekly task with `targetCount: 3` rewards only the third progress entry.
- Maintenance rewards stop after three in the same week.
- A task created after its completion timestamp records progress but does not reward.
- A task without a long-term goal and without maintenance status cannot reward.

The main assertion must be:

```ts
expect(result.state.diceTransactions.at(-1)?.amount).toBe(1);
expect(result.state.diceTransactions.at(-1)?.balanceAfter).toBe(1);
expect(result.rewardGranted).toBe(true);
```

Run the test; expected FAIL because `recordTaskProgress` is missing.

- [ ] **Step 4: Implement atomic task progress**

Implement:

```ts
export function recordTaskProgress(
  state: TaskSystemState,
  input: {
    taskId: string;
    completedAt: string;
    reflection: string;
    metricValue?: number | null;
    evidenceLink?: string;
    idFactory?: () => string;
  }
): { state: TaskSystemState; rewardGranted: boolean } {
  const task = state.tasks.find((candidate) => candidate.id === input.taskId);
  if (!task || task.status !== 'active') {
    throw new Error('任务不存在或已结束');
  }

  const periodKey = getPeriodKey(task.cadence, input.completedAt);
  const periodCompletions = state.completions.filter(
    (completion) => completion.taskId === task.id && completion.periodKey === periodKey
  );
  const sequenceInPeriod = periodCompletions.length + 1;
  const alreadyRewarded = periodCompletions.some((completion) => completion.rewardGranted);
  const goalExists = task.goalId === null
    ? false
    : state.goals.some(
        (goal) => goal.id === task.goalId && goal.dimension === task.dimension && goal.status === 'active'
      );
  const completedAfterCreation = new Date(input.completedAt).getTime() >= new Date(task.createdAt).getTime();
  const reachedTarget = sequenceInPeriod >= task.targetCount;
  const weekKey = getPeriodKey('weekly', input.completedAt);
  const maintenanceRewards = state.diceTransactions.filter(
    (transaction) =>
      transaction.type === 'task-reward' &&
      getPeriodKey('weekly', transaction.createdAt) === weekKey &&
      state.tasks.some((candidate) => candidate.id === transaction.sourceId && candidate.isMaintenance)
  ).length;
  const maintenanceAllowed = !task.isMaintenance || maintenanceRewards < MAINTENANCE_WEEKLY_DICE_CAP;
  const rewardGranted =
    task.rewardEligible &&
    completedAfterCreation &&
    reachedTarget &&
    !alreadyRewarded &&
    (goalExists || task.isMaintenance) &&
    maintenanceAllowed;

  const idFactory = input.idFactory ?? (() => crypto.randomUUID());
  const completionId = idFactory();
  const transactionId = rewardGranted ? idFactory() : null;
  const completion: TaskCompletion = {
    id: completionId,
    taskId: task.id,
    periodKey,
    sequenceInPeriod,
    completedAt: input.completedAt,
    reflection: input.reflection.trim(),
    metricValue: input.metricValue ?? null,
    evidenceLink: input.evidenceLink?.trim() ?? '',
    rewardGranted,
    diceTransactionId: transactionId
  };
  const nextCompletions = [...state.completions, completion];

  if (!rewardGranted || transactionId === null) {
    return { state: { ...state, completions: nextCompletions }, rewardGranted: false };
  }

  const balanceAfter = getDiceBalance(state) + TASK_REWARD_DICE;
  const transaction: DiceTransaction = {
    id: transactionId,
    type: 'task-reward',
    amount: TASK_REWARD_DICE,
    sourceId: task.id,
    dimension: task.dimension === 'recovery' ? 'mixed' : task.dimension,
    ruleVersion: TASK_RULE_VERSION,
    createdAt: input.completedAt,
    balanceAfter
  };

  return {
    state: {
      ...state,
      completions: nextCompletions,
      diceTransactions: [...state.diceTransactions, transaction]
    },
    rewardGranted: true
  };
}
```

Add the helpers used above:

```ts
export function getDiceBalance(state: TaskSystemState): number {
  return state.diceTransactions.reduce((total, transaction) => total + transaction.amount, 0);
}

export function getQualifyingStreakWeeks(reviews: WeeklyReview[]): number {
  let streak = 0;
  for (const review of [...reviews].sort((a, b) => b.weekKey.localeCompare(a.weekKey))) {
    if (review.completionRate < 75) break;
    streak += 1;
  }
  return streak;
}
```

The implementation must clone arrays, never mutate input state, and compute `balanceAfter` from transactions.

- [ ] **Step 5: Add failing weekly bonus tests**

Test these exact cases:

```ts
expect(calculateWeeklyBonus({ completionRate: 59, evidenceCoverageRate: 100, qualifyingStreakWeeks: 5 })).toBe(1);
expect(calculateWeeklyBonus({ completionRate: 60, evidenceCoverageRate: 0, qualifyingStreakWeeks: 0 })).toBe(1);
expect(calculateWeeklyBonus({ completionRate: 75, evidenceCoverageRate: 70, qualifyingStreakWeeks: 0 })).toBe(3);
expect(calculateWeeklyBonus({ completionRate: 90, evidenceCoverageRate: 100, qualifyingStreakWeeks: 3 })).toBe(5);
```

The first case returns 1 only because evidence coverage qualifies; completion alone returns zero below 60%.

- [ ] **Step 6: Implement weekly summary and one-time settlement**

Add:

```ts
export function calculateWeeklyBonus(input: {
  completionRate: number;
  evidenceCoverageRate: number;
  qualifyingStreakWeeks: number;
}): number {
  let bonus = input.completionRate >= 90 ? 3 : input.completionRate >= 75 ? 2 : input.completionRate >= 60 ? 1 : 0;
  if (input.evidenceCoverageRate >= 70) bonus += 1;
  if (input.qualifyingStreakWeeks >= 3) bonus += 1;
  return Math.min(WEEKLY_BONUS_DICE_CAP, bonus);
}
```

Implement `buildWeeklyReviewPreview` and `settleWeeklyReview`, ensuring one review per `weekKey`.

```ts
export function buildWeeklyReviewPreview(
  state: TaskSystemState,
  weekKey: string
): Omit<WeeklyReview, 'id' | 'settledAt' | 'diceTransactionId'> {
  const eligibleTasks = state.tasks.filter((task) => {
    const started = getPeriodKey('weekly', `${task.startDate}T12:00:00`) <= weekKey;
    const notEnded = task.endDate === null || getPeriodKey('weekly', `${task.endDate}T12:00:00`) >= weekKey;
    const activeDuringWeek =
      task.status === 'active' ||
      (task.archivedAt !== null && getPeriodKey('weekly', task.archivedAt) === weekKey);
    return task.rewardEligible && started && notEnded && activeDuringWeek;
  });
  const completedTaskIds = new Set(
    state.completions
      .filter((completion) => getPeriodKey('weekly', completion.completedAt) === weekKey)
      .filter((completion) => completion.rewardGranted)
      .map((completion) => completion.taskId)
  );
  const objectiveEvidence = state.completions.filter(
    (completion) =>
      getPeriodKey('weekly', completion.completedAt) === weekKey &&
      (completion.metricValue !== null || completion.evidenceLink.length > 0)
  ).length;
  const completionCount = eligibleTasks.filter((task) => completedTaskIds.has(task.id)).length;
  const completionRate = eligibleTasks.length === 0 ? 0 : Math.round((completionCount / eligibleTasks.length) * 100);
  const evidenceCoverageRate =
    completionCount === 0 ? 0 : Math.round((objectiveEvidence / completionCount) * 100);
  const qualifyingStreakWeeks = getQualifyingStreakWeeks(state.weeklyReviews);
  return {
    weekKey,
    eligibleTaskCount: eligibleTasks.length,
    completionCount,
    completionRate,
    evidenceCoverageRate,
    qualifyingStreakWeeks,
    bonusDice: calculateWeeklyBonus({ completionRate, evidenceCoverageRate, qualifyingStreakWeeks })
  };
}

export function settleWeeklyReview(
  state: TaskSystemState,
  weekKey: string,
  settledAt: string,
  idFactory: () => string = () => crypto.randomUUID()
): TaskSystemState {
  if (state.weeklyReviews.some((review) => review.weekKey === weekKey)) return state;
  const preview = buildWeeklyReviewPreview(state, weekKey);
  const reviewId = idFactory();
  const transactionId = idFactory();
  const balanceAfter = getDiceBalance(state) + preview.bonusDice;
  const review: WeeklyReview = { ...preview, id: reviewId, settledAt, diceTransactionId: transactionId };
  const transaction: DiceTransaction = {
    id: transactionId,
    type: 'weekly-bonus',
    amount: preview.bonusDice,
    sourceId: reviewId,
    dimension: 'mixed',
    ruleVersion: TASK_RULE_VERSION,
    createdAt: settledAt,
    balanceAfter
  };
  return {
    ...state,
    weeklyReviews: [...state.weeklyReviews, review],
    diceTransactions: preview.bonusDice === 0
      ? state.diceTransactions
      : [...state.diceTransactions, transaction]
  };
}
```

- [ ] **Step 7: Add failing long-term goal tests**

Assert difficulty 1–5 returns 4–8 dice, the goal becomes completed, the chapter unlock event is preserved, and completing twice creates no second transaction.

- [ ] **Step 8: Implement goal progress and completion**

Add pure functions:

```ts
export function calculateGoalProgress(
  baselineValue: number | null,
  currentValue: number | null,
  targetValue: number | null,
  manualPercent: number
): number {
  if (baselineValue === null || currentValue === null || targetValue === null || baselineValue === targetValue) {
    return Math.max(0, Math.min(100, manualPercent));
  }
  const percent = ((currentValue - baselineValue) / (targetValue - baselineValue)) * 100;
  return Math.round(Math.max(0, Math.min(100, percent)));
}

export function completeLongTermGoal(
  state: TaskSystemState,
  goalId: string,
  reflection: string,
  evidenceLink: string,
  completedAt: string,
  idFactory?: () => string
): TaskSystemState {
  const goal = state.goals.find((candidate) => candidate.id === goalId);
  if (!goal || goal.status !== 'active') return state;
  const id = idFactory ?? (() => crypto.randomUUID());
  const transactionId = id();
  const amount = GOAL_REWARD_BY_DIFFICULTY[goal.confirmedDifficulty];
  const transaction: DiceTransaction = {
    id: transactionId,
    type: 'goal-reward',
    amount,
    sourceId: goal.id,
    dimension: goal.dimension,
    ruleVersion: TASK_RULE_VERSION,
    createdAt: completedAt,
    balanceAfter: getDiceBalance(state) + amount
  };
  return {
    ...state,
    goals: state.goals.map((candidate) =>
      candidate.id === goalId
        ? {
            ...candidate,
            status: 'completed',
            completedAt,
            progressPercent: 100,
            completionReflection: reflection.trim(),
            completionEvidenceLink: evidenceLink.trim()
          }
        : candidate
    ),
    diceTransactions: [...state.diceTransactions, transaction],
    adventure: {
      ...state.adventure,
      unlockedChapter: Math.max(state.adventure.unlockedChapter, state.adventure.chapter + 1)
    }
  };
}
```

- [ ] **Step 9: Run the complete engine suite**

Run:

```bash
npx vitest run src/tasks/taskEngine.test.ts
```

Expected: all task-engine tests PASS.

---

### Task 3: Add Versioned Persistence

**Files:**

- Create: `src/tasks/taskStorage.ts`
- Create: `src/tasks/taskStorage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Tests must cover:

```ts
const memoryStorage = createMemoryStorage();
saveTaskState(memoryStorage, populatedState);
expect(loadTaskState(memoryStorage)).toEqual(populatedState);

memoryStorage.setItem(TASK_STORAGE_KEY, '{broken json');
expect(loadTaskState(memoryStorage)).toEqual(createInitialTaskState());
expect(memoryStorage.getItem(`${TASK_STORAGE_KEY}.corrupt`)).toBe('{broken json');
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run src/tasks/taskStorage.test.ts
```

Expected: FAIL because storage functions do not exist.

- [ ] **Step 3: Implement storage validation**

Implement:

```ts
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isTaskState(value: unknown): value is TaskSystemState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TaskSystemState>;
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.goals) &&
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.completions) &&
    Array.isArray(candidate.diceTransactions) &&
    Array.isArray(candidate.weeklyReviews) &&
    typeof candidate.adventure === 'object' &&
    candidate.adventure !== null
  );
}

export function loadTaskState(storage: StorageLike): TaskSystemState {
  const raw = storage.getItem(TASK_STORAGE_KEY);
  if (raw === null) return createInitialTaskState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isTaskState(parsed)) throw new Error('Unsupported task state');
    return parsed;
  } catch {
    storage.setItem(`${TASK_STORAGE_KEY}.corrupt`, raw);
    return createInitialTaskState();
  }
}

export function saveTaskState(storage: StorageLike, state: TaskSystemState): void {
  storage.setItem(TASK_STORAGE_KEY, JSON.stringify(state));
}
```

Validate `schemaVersion === 1` and all six root arrays/objects. Unknown fields are ignored by object spreading only at the root; missing required structures cause safe initialization. Catch parse errors, back up raw content to `${TASK_STORAGE_KEY}.corrupt`, and return `createInitialTaskState()`.

- [ ] **Step 4: Run storage tests**

Run:

```bash
npx vitest run src/tasks/taskStorage.test.ts
```

Expected: PASS.

---

### Task 4: Build the Atomic Reducer Hook

**Files:**

- Create: `src/tasks/useTaskSystem.ts`
- Create: `src/tasks/useTaskSystem.test.tsx`

- [ ] **Step 1: Write failing hook workflow tests**

Create a small harness and verify:

1. Initial state loads from storage.
2. `createGoal` adds an active goal.
3. `createTask` adds a linked task.
4. `recordProgress` writes evidence and one dice transaction.
5. A rerender with the same storage restores the data.

The public API must be:

```ts
type UseTaskSystemResult = {
  state: TaskSystemState;
  diceBalance: number;
  createGoal(input: GoalDraft): LongTermGoal;
  updateGoal(id: string, input: GoalDraft): void;
  archiveGoal(id: string): void;
  completeGoal(id: string, reflection: string, evidenceLink?: string, completedAt?: string): void;
  createTask(input: TaskDraft): ShortTask;
  updateTask(id: string, input: TaskDraft): void;
  archiveTask(id: string): void;
  recordProgress(input: CompletionDraft): { rewardGranted: boolean };
  settleWeek(weekKey: string): void;
};
```

- [ ] **Step 2: Run hook tests and verify failure**

Run:

```bash
npx vitest run src/tasks/useTaskSystem.test.tsx
```

Expected: FAIL because the hook is missing.

- [ ] **Step 3: Implement reducer actions and persistence**

Use `useReducer` with actions:

```ts
type TaskAction =
  | { type: 'goal/create'; goal: LongTermGoal }
  | { type: 'goal/update'; goal: LongTermGoal }
  | { type: 'goal/archive'; id: string; archivedAt: string }
  | {
      type: 'goal/complete';
      id: string;
      reflection: string;
      evidenceLink: string;
      completedAt: string;
    }
  | { type: 'task/create'; task: ShortTask }
  | { type: 'task/update'; task: ShortTask }
  | { type: 'task/archive'; id: string; archivedAt: string }
  | { type: 'task/progress'; input: CompletionDraft }
  | { type: 'week/settle'; weekKey: string };
```

Initialize through `loadTaskState(window.localStorage)`. Persist the complete state in one effect. Expose deterministic `idFactory` and `now` overrides for tests.

Use this concrete hook structure:

```ts
import { useEffect, useMemo, useReducer } from 'react';
import {
  completeLongTermGoal,
  getDiceBalance,
  recordTaskProgress,
  settleWeeklyReview,
  suggestDifficulty
} from './taskEngine';
import { loadTaskState, saveTaskState, type StorageLike } from './taskStorage';
import type {
  CompletionDraft,
  GoalDraft,
  LongTermGoal,
  ShortTask,
  TaskDraft,
  TaskSystemState
} from './types';

type TaskAction =
  | { type: 'goal/create'; goal: LongTermGoal }
  | { type: 'goal/update'; goal: LongTermGoal }
  | { type: 'goal/archive'; id: string; archivedAt: string }
  | {
      type: 'goal/complete';
      id: string;
      reflection: string;
      evidenceLink: string;
      completedAt: string;
      idFactory: () => string;
    }
  | { type: 'task/create'; task: ShortTask }
  | { type: 'task/update'; task: ShortTask }
  | { type: 'task/archive'; id: string; archivedAt: string }
  | { type: 'task/progress'; input: CompletionDraft; idFactory: () => string }
  | { type: 'week/settle'; weekKey: string; settledAt: string; idFactory: () => string };

function taskReducer(state: TaskSystemState, action: TaskAction): TaskSystemState {
  switch (action.type) {
    case 'goal/create':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'goal/update':
      return { ...state, goals: state.goals.map((goal) => goal.id === action.goal.id ? action.goal : goal) };
    case 'goal/archive':
      return {
        ...state,
        goals: state.goals.map((goal) =>
          goal.id === action.id ? { ...goal, status: 'archived', archivedAt: action.archivedAt } : goal
        )
      };
    case 'goal/complete':
      return completeLongTermGoal(
        state,
        action.id,
        action.reflection,
        action.evidenceLink,
        action.completedAt,
        action.idFactory
      );
    case 'task/create':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'task/update':
      return { ...state, tasks: state.tasks.map((task) => task.id === action.task.id ? action.task : task) };
    case 'task/archive':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, status: 'archived', archivedAt: action.archivedAt } : task
        )
      };
    case 'task/progress':
      return recordTaskProgress(state, { ...action.input, idFactory: action.idFactory }).state;
    case 'week/settle':
      return settleWeeklyReview(state, action.weekKey, action.settledAt, action.idFactory);
  }
}

export function useTaskSystem(options: {
  storage?: StorageLike;
  idFactory?: () => string;
  now?: () => string;
} = {}): UseTaskSystemResult {
  const storage = options.storage ?? window.localStorage;
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date().toISOString());
  const [state, dispatch] = useReducer(taskReducer, storage, loadTaskState);

  useEffect(() => saveTaskState(storage, state), [state, storage]);

  return useMemo(() => ({
    state,
    diceBalance: getDiceBalance(state),
    createGoal(input: GoalDraft) {
      const createdAt = now();
      const goal: LongTermGoal = {
        ...input,
        id: idFactory(),
        suggestedDifficulty: input.confirmedDifficulty,
        status: 'active',
        createdAt,
        completedAt: null,
        archivedAt: null,
        completionReflection: '',
        completionEvidenceLink: ''
      };
      dispatch({ type: 'goal/create', goal });
      return goal;
    },
    updateGoal(id: string, input: GoalDraft) {
      const current = state.goals.find((goal) => goal.id === id);
      if (!current) throw new Error('长期目标不存在');
      dispatch({ type: 'goal/update', goal: { ...current, ...input } });
    },
    archiveGoal(id: string) {
      dispatch({ type: 'goal/archive', id, archivedAt: now() });
    },
    completeGoal(id: string, reflection: string, evidenceLink = '', completedAt = now()) {
      dispatch({ type: 'goal/complete', id, reflection, evidenceLink, completedAt, idFactory });
    },
    createTask(input: TaskDraft) {
      const suggestedDifficulty = suggestDifficulty(input);
      const task: ShortTask = {
        ...input,
        id: idFactory(),
        suggestedDifficulty,
        rewardEligible: input.isMaintenance || input.goalId !== null,
        status: 'active',
        createdAt: now(),
        archivedAt: null
      };
      dispatch({ type: 'task/create', task });
      return task;
    },
    updateTask(id: string, input: TaskDraft) {
      const current = state.tasks.find((task) => task.id === id);
      if (!current) throw new Error('短期任务不存在');
      dispatch({
        type: 'task/update',
        task: { ...current, ...input, suggestedDifficulty: suggestDifficulty(input) }
      });
    },
    archiveTask(id: string) {
      dispatch({ type: 'task/archive', id, archivedAt: now() });
    },
    recordProgress(input: CompletionDraft) {
      const preview = recordTaskProgress(state, { ...input, idFactory });
      dispatch({ type: 'task/progress', input, idFactory });
      return { rewardGranted: preview.rewardGranted };
    },
    settleWeek(weekKey: string) {
      dispatch({ type: 'week/settle', weekKey, settledAt: now(), idFactory });
    }
  }), [state, storage, idFactory, now]);
}
```

- [ ] **Step 4: Run hook tests**

Run:

```bash
npx vitest run src/tasks/useTaskSystem.test.tsx
```

Expected: PASS.

---

### Task 5: Build Task Board Read Views

**Files:**

- Create: `src/tasks/TaskBoard.tsx`
- Create: `src/tasks/TaskBoard.css`
- Create: `src/tasks/components/GoalCard.tsx`
- Create: `src/tasks/components/TaskCard.tsx`
- Create: `src/tasks/components/DiceLedger.tsx`
- Create: `src/tasks/components/WeeklyReviewPanel.tsx`
- Create: `src/tasks/TaskBoard.test.tsx`

- [ ] **Step 1: Write the failing empty-state and seeded-state tests**

Assert the rendered page exposes:

```ts
expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
expect(screen.getByText('骰子背包')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '新建长期目标' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '新建短期任务' })).toBeInTheDocument();
expect(screen.getByRole('tab', { name: '财富积累' })).toBeInTheDocument();
expect(screen.getByText('今日任务')).toBeInTheDocument();
expect(screen.getByText('本周任务')).toBeInTheDocument();
expect(screen.getByText('周度复盘')).toBeInTheDocument();
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npx vitest run src/tasks/TaskBoard.test.tsx
```

Expected: FAIL because `TaskBoard` does not exist.

- [ ] **Step 3: Implement the read-only board composition**

`TaskBoard` must:

- Render header metrics for dice balance, week completion, and qualifying streak.
- Render dimension tabs for all, wealth, ability, and health.
- Render active long-term goals using `GoalCard`.
- Split active tasks into daily and weekly lists.
- Render last five dice transactions.
- Render weekly review preview.
- Use semantic headings, tabs, buttons, lists, and `aria-live`.

Start with this page composition:

```tsx
import { useMemo, useState } from 'react';
import { Dices, Plus, Route } from 'lucide-react';
import { buildWeeklyReviewPreview, getPeriodKey } from './taskEngine';
import { useTaskSystem } from './useTaskSystem';
import { DIMENSION_LABELS } from './taskConfig';
import type { GrowthDimension, ShortTask } from './types';
import { DiceLedger } from './components/DiceLedger';
import { GoalCard } from './components/GoalCard';
import { TaskCard } from './components/TaskCard';
import { WeeklyReviewPanel } from './components/WeeklyReviewPanel';
import './TaskBoard.css';

type DimensionFilter = 'all' | GrowthDimension;

export function TaskBoard() {
  const system = useTaskSystem();
  const [filter, setFilter] = useState<DimensionFilter>('all');
  const [notice, setNotice] = useState('');
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const now = new Date().toISOString();
  const todayKey = getPeriodKey('daily', now);
  const weekKey = getPeriodKey('weekly', now);
  const goals = system.state.goals.filter(
    (goal) => goal.status === 'active' && (filter === 'all' || goal.dimension === filter)
  );
  const tasks = system.state.tasks.filter(
    (task) => task.status === 'active' && (filter === 'all' || task.dimension === filter)
  );
  const dailyTasks = tasks.filter((task) => task.cadence === 'daily');
  const weeklyTasks = tasks.filter((task) => task.cadence === 'weekly');
  const review = useMemo(
    () => buildWeeklyReviewPreview(system.state, weekKey),
    [system.state, weekKey]
  );

  const renderTask = (task: ShortTask) => (
    <TaskCard
      key={task.id}
      task={task}
      completions={system.state.completions.filter((item) => item.taskId === task.id)}
      periodKey={task.cadence === 'daily' ? todayKey : weekKey}
      onRecord={() => setNotice(`准备记录：${task.title}`)}
      onArchive={() => system.archiveTask(task.id)}
    />
  );

  return (
    <section className="task-board" aria-label="任务中心">
      <header className="task-board-hero task-panel">
        <div>
          <p className="eyebrow">Quest Command</p>
          <h1>任务中心</h1>
          <p>让财富、能力和健康中的真实行动，推动同一段人生冒险。</p>
        </div>
        <div className="task-dice-wallet">
          <Dices aria-hidden="true" />
          <span>骰子背包</span>
          <strong>骰子余额 {system.diceBalance}</strong>
        </div>
        <div className="task-hero-actions">
          <button type="button" onClick={() => setGoalFormOpen(true)}><Plus /> 新建长期目标</button>
          <button type="button" onClick={() => setTaskFormOpen(true)}><Plus /> 新建短期任务</button>
          <button type="button" disabled><Route /> 前往冒险</button>
        </div>
      </header>

      <div className="task-filter-tabs" role="tablist" aria-label="成长维度">
        <button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>全部</button>
        {(Object.keys(DIMENSION_LABELS) as GrowthDimension[]).map((dimension) => (
          <button
            key={dimension}
            role="tab"
            aria-selected={filter === dimension}
            onClick={() => setFilter(dimension)}
          >
            {DIMENSION_LABELS[dimension]}
          </button>
        ))}
      </div>

      <section className="task-panel task-section">
        <h2>长期目标</h2>
        <div className="task-goal-grid">
          {goals.length === 0 ? <p>还没有长期目标，从一个真正重要的改变开始。</p> : goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onArchive={() => system.archiveGoal(goal.id)}
              onComplete={() => system.completeGoal(goal.id, '目标成果已确认')}
            />
          ))}
        </div>
      </section>

      <div className="task-list-grid">
        <section className="task-panel task-section"><h2>今日任务</h2>{dailyTasks.map(renderTask)}</section>
        <section className="task-panel task-section"><h2>本周任务</h2>{weeklyTasks.map(renderTask)}</section>
      </div>

      <WeeklyReviewPanel
        preview={review}
        settled={system.state.weeklyReviews.some((item) => item.weekKey === weekKey)}
        onSettle={() => system.settleWeek(weekKey)}
      />
      <DiceLedger transactions={system.state.diceTransactions.slice(-5).reverse()} />

      <p className="task-live-notice" role="status" aria-live="polite">{notice}</p>
      {goalFormOpen ? <div role="dialog" aria-label="长期目标表单" /> : null}
      {taskFormOpen ? <div role="dialog" aria-label="短期任务表单" /> : null}
    </section>
  );
}
```

- [ ] **Step 4: Implement isolated CSS**

`TaskBoard.css` must use:

```css
.task-board {
  display: grid;
  gap: 24px;
}

.task-panel {
  background: #fff;
  border: 2px solid #191c1d;
  box-shadow: 4px 4px 0 #191c1d;
  border-radius: 4px;
}

.task-dimension-wealth { --task-accent: #ffd700; }
.task-dimension-ability { --task-accent: #6cf8bb; }
.task-dimension-health { --task-accent: #ffceca; }
```

At `max-width: 760px`, convert metrics and cards to one column and keep all interactive controls at least 44px tall.

- [ ] **Step 5: Run the board tests**

Run:

```bash
npx vitest run src/tasks/TaskBoard.test.tsx
```

Expected: PASS.

---

### Task 6: Add Goal and Task Creation Forms

**Files:**

- Create: `src/tasks/components/GoalForm.tsx`
- Create: `src/tasks/components/TaskForm.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/TaskBoard.test.tsx`

- [ ] **Step 1: Add failing creation tests**

Goal workflow:

```ts
fireEvent.click(screen.getByRole('button', { name: '新建长期目标' }));
fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: '六个月建立应急储备' } });
fireEvent.change(screen.getByLabelText('目标日期'), { target: { value: '2027-01-30' } });
fireEvent.click(screen.getByRole('button', { name: '保存长期目标' }));
expect(screen.getByText('六个月建立应急储备')).toBeInTheDocument();
```

Task workflow must select the created goal, enter title, cadence, target count, estimated minutes, completion standard, and save.

Then open each card’s “编辑” action, change its title, save, and assert the updated title is visible while the original ID and historical records remain unchanged. Open “归档”, confirm it, and assert the card moves out of the active list without deleting its history.

- [ ] **Step 2: Run and verify failure**

Run `npx vitest run src/tasks/TaskBoard.test.tsx`; expected FAIL because forms are missing.

- [ ] **Step 3: Implement `GoalForm`**

Use controlled native inputs. Validate:

- Non-empty title and meaning.
- Target date is 3–12 months after start date.
- Baseline/target numeric fields are both empty or both valid.
- Difficulty adjustment requires a reason.

Display suggested difficulty and 4–8 dice goal reward preview.

Use this submission contract:

```tsx
type GoalFormProps = {
  initialValue?: LongTermGoal;
  onSubmit: (draft: GoalDraft) => void;
  onCancel: () => void;
};

function submitGoal(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const months = monthDistance(startDate, targetDate);
  if (!title.trim() || !meaning.trim()) {
    setError('请填写目标名称和现实意义');
    return;
  }
  if (months < 3 || months > 12) {
    setError('长期目标周期必须为 3–12 个月');
    return;
  }
  onSubmit({
    dimension,
    title: title.trim(),
    meaning: meaning.trim(),
    startDate,
    targetDate,
    baselineLabel,
    baselineValue: numberOrNull(baselineValue),
    targetLabel,
    targetValue: numberOrNull(targetValue),
    currentValue: numberOrNull(currentValue),
    progressPercent,
    verificationType,
    confirmedDifficulty,
    difficultyReason: difficultyReason.trim()
  });
}
```

When `initialValue` exists, initialize every field from it and call `updateGoal(initialValue.id, draft)` without changing its ID, timestamps, completion data, or history.

- [ ] **Step 4: Implement `TaskForm`**

Validate:

- Non-maintenance tasks require an active same-dimension goal.
- `targetCount >= 1`.
- Estimated minutes are positive.
- End date is not before start date.
- Difficulty adjustment requires a reason.

Show the fixed “完成后获得 1 枚骰子” reward and the weekly-task rule that progress rewards only after the target count is reached.

Use this exact draft shape:

```ts
const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
onSubmit({
  goalId: isMaintenance ? null : selectedGoalId,
  dimension: isMaintenance ? 'recovery' : selectedGoal!.dimension,
  title: title.trim(),
  completionStandard: completionStandard.trim(),
  cadence,
  targetCount: Number(targetCount),
  estimatedMinutesPerOccurrence: Number(estimatedMinutes),
  relativeChallenge,
  startDate,
  endDate: endDate || null,
  verificationType,
  confirmedDifficulty,
  difficultyReason: difficultyReason.trim(),
  isMaintenance
});
```

When `initialValue` exists, call `updateTask(initialValue.id, draft)` and preserve its ID, creation date, archival date, completions, and reward transactions.

- [ ] **Step 5: Run creation tests**

Run:

```bash
npx vitest run src/tasks/TaskBoard.test.tsx
```

Expected: PASS.

---

### Task 7: Add Completion, Dice Reward, and Ledger

**Files:**

- Create: `src/tasks/components/CompletionDialog.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/components/TaskCard.tsx`
- Modify: `src/tasks/components/DiceLedger.tsx`
- Modify: `src/tasks/TaskBoard.test.tsx`

- [ ] **Step 1: Add failing completion tests**

Test:

```ts
fireEvent.click(screen.getByRole('button', { name: /记录进度/ }));
fireEvent.change(screen.getByLabelText('成果说明'), { target: { value: '完成计划训练并记录重量' } });
fireEvent.click(screen.getByRole('button', { name: '确认完成' }));
expect(screen.getByRole('status')).toHaveTextContent('获得 1 枚骰子');
expect(screen.getByText('骰子余额 1')).toBeInTheDocument();
```

Also click again in the same period and assert balance remains 1.

- [ ] **Step 2: Run and verify failure**

Run `npx vitest run src/tasks/TaskBoard.test.tsx`; expected FAIL.

- [ ] **Step 3: Implement evidence capture**

`CompletionDialog` exposes:

- Read-only completion standard.
- Required reflection.
- Optional numeric value.
- Optional evidence URL with URL validation.
- Current weekly progress for weekly tasks.
- Confirm and cancel buttons.

Use `role="dialog"`, focus the first field, close with Escape, and return focus to the opening button.

The confirmation handler is:

```ts
function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!reflection.trim()) {
    setError('请填写本次行动的成果说明');
    return;
  }
  if (evidenceLink && !URL.canParse(evidenceLink)) {
    setError('成果链接格式不正确');
    return;
  }
  onConfirm({
    taskId: task.id,
    completedAt: new Date().toISOString(),
    reflection: reflection.trim(),
    metricValue: metricValue === '' ? null : Number(metricValue),
    evidenceLink: evidenceLink.trim()
  });
}
```

- [ ] **Step 4: Connect atomic reward flow**

On confirmation:

- Call `recordProgress`.
- Display `aria-live` message only if reward was granted.
- Update task progress.
- Update dice balance.
- Append ledger transaction.
- Persist through the hook.

Connect it with:

```ts
const result = system.recordProgress(draft);
setNotice(result.rewardGranted ? '任务完成，获得 1 枚骰子' : '进度已记录');
setCompletingTask(null);
```

- [ ] **Step 5: Run completion tests**

Run:

```bash
npx vitest run src/tasks/TaskBoard.test.tsx
```

Expected: PASS.

---

### Task 8: Add Weekly Settlement and Goal Completion

**Files:**

- Modify: `src/tasks/components/WeeklyReviewPanel.tsx`
- Modify: `src/tasks/components/GoalCard.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/TaskBoard.test.tsx`

- [ ] **Step 1: Add failing weekly settlement tests**

Seed a state with qualifying tasks and completions. Assert:

```ts
expect(screen.getByText(/预计额外获得 3 枚骰子/)).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: '结算本周奖励' }));
expect(screen.getByText('本周已结算')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '结算本周奖励' })).toBeDisabled();
```

Assert a second click creates no extra transaction.

- [ ] **Step 2: Add failing goal completion tests**

Complete a difficulty-3 goal and assert:

- Status becomes complete.
- Six dice are added.
- One `goal-reward` ledger entry exists.
- A second completion action is unavailable.

- [ ] **Step 3: Implement weekly review UI**

Show:

- Eligible task count.
- Completion count and rate.
- Objective evidence coverage.
- Qualifying streak weeks.
- Bonus breakdown.
- One-time settlement button.

Render the settlement action as:

```tsx
<button type="button" disabled={settled} onClick={onSettle}>
  {settled ? '本周已结算' : `结算本周奖励 · ${preview.bonusDice} 枚`}
</button>
```

- [ ] **Step 4: Implement long-term goal completion UI**

Require final result text, show the preconfigured reward, call `completeGoal`, and keep completed goals visible under a completed filter.

The completion callback is:

```ts
if (!finalReflection.trim()) {
  setError('请填写长期目标的最终成果');
  return;
}
system.completeGoal(goal.id, finalReflection.trim(), finalEvidenceLink.trim());
setNotice(`长期目标完成，获得 ${GOAL_REWARD_BY_DIFFICULTY[goal.confirmedDifficulty]} 枚骰子`);
```

- [ ] **Step 5: Run task-board tests**

Run:

```bash
npx vitest run src/tasks/TaskBoard.test.tsx
```

Expected: PASS.

---

### Task 9: Integrate the Task Module into Dice Life

**Files:**

- Modify: `src/App.tsx`
- Create: `src/tasks/AppTaskIntegration.test.tsx`

- [ ] **Step 1: Write the failing integration test**

```ts
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('Dice Life task navigation', () => {
  beforeEach(() => localStorage.clear());

  it('opens the real task board from the existing top navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '任务' }));

    expect(screen.getByRole('heading', { name: '任务中心' })).toBeInTheDocument();
    expect(screen.queryByText('模块正在构建中')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /财富状况/ }));
    expect(screen.getByRole('heading', { name: '净资产' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
npx vitest run src/tasks/AppTaskIntegration.test.tsx
```

Expected: FAIL because `App` still renders `ModuleView` for quests.

- [ ] **Step 3: Integrate `TaskBoard`**

Add:

```ts
import { TaskBoard } from './tasks/TaskBoard';
```

Change the main conditional to:

```tsx
) : activeView === 'character' ? (
  <CharacterStatusView />
) : activeView === 'quests' ? (
  <TaskBoard />
) : (
  <ModuleView view={activeView} />
)}
```

Do not alter the finance, character, ability, body, emotion, achievements, or journal paths.

- [ ] **Step 4: Run integration and existing UI tests**

Run:

```bash
npx vitest run src/tasks/AppTaskIntegration.test.tsx src/App.test.tsx
```

Expected: PASS.

---

### Task 10: Full Verification and Completion Audit

**Files:**

- Verify: `docs/superpowers/specs/2026-07-30-dice-life-task-adventure-design.md`
- Verify: all `src/tasks/**` files
- Verify: `src/App.tsx`

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: all existing and new tests PASS.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript check and Vite build PASS.

- [ ] **Step 3: Audit PRD acceptance criteria**

Verify each item against code and tests:

- Long-term goal create/edit/complete/archive.
- Short task create/edit/progress/archive.
- Dimension filtering.
- Suggested and confirmed difficulty.
- Immediate one-die reward.
- Dice balance and ledger.
- One-time weekly settlement.
- Long-term 4–8 dice reward.
- Duplicate and retroactive reward prevention.
- localStorage persistence and corruption fallback.
- Existing navigation and finance regression.

- [ ] **Step 4: Inspect the rendered page**

Open `http://127.0.0.1:4173/`, click “任务”, and verify:

- Desktop fixed shell remains intact.
- Task content is readable without horizontal overflow.
- Dialogs open and close correctly.
- Completing a demo task updates the dice balance immediately.
- Reloading preserves the task state.

- [ ] **Step 5: Review worktree scope**

Run:

```bash
git status --short
git diff -- src/App.tsx
git diff -- src/tasks
```

Confirm unrelated pre-existing worktree changes were preserved and not overwritten.
