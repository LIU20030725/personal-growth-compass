# Dice Life Task Module V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify task creation, add monthly and N/A planning, separate one-off tasks from daily maintenance records, link goals to action history, support confirmed archiving, and make weekly rewards incrementally claimable with deterministic chest feedback.

**Architecture:** Upgrade the isolated `src/tasks/` feature package to schema version 2. Pure engine functions continue to own periods, rewards, one-off completion, maintenance recurrence, goal chest tiers, and incremental weekly settlement; the storage adapter migrates version 1 data; the hook exposes atomic mutations; focused React views present goal selection, history, confirmations, progress, review, and animation.

**Tech Stack:** React 18, TypeScript 5.7, Vitest 2, Testing Library, lucide-react, CSS, localStorage.

---

## File Map

- Modify `src/tasks/types.ts`: version 2 types, monthly cadence, nullable minutes, goal progress, aggregate weekly review.
- Modify `src/tasks/taskConfig.ts`: remove difficulty rewards; add deterministic goal chest tiers.
- Modify `src/tasks/taskEngine.ts`: monthly periods, one-off completion, goal progress, chest rewards, incremental review.
- Modify `src/tasks/taskEngine.test.ts`: rule-first regression coverage.
- Modify `src/tasks/taskStorage.ts`: migrate version 1 to version 2 without losing ledger/history.
- Modify `src/tasks/taskStorage.test.ts`: migration and corruption coverage.
- Modify `src/tasks/useTaskSystem.ts`: new progress, review, completion, and archive-confirmed actions.
- Modify `src/tasks/useTaskSystem.test.tsx`: end-to-end state workflows.
- Modify `src/tasks/TaskBoard.tsx`: simplified forms, goal/task linkage, tabs, dialogs, history, review UI.
- Modify `src/tasks/TaskBoard.css`: selected goal, history, confirmation, review and chest styles.
- Create `src/tasks/RewardChest.tsx`: deterministic, accessible and skippable reward overlay.
- Modify `src/tasks/TaskBoard.test.tsx`: user-visible workflows.
- Modify `src/tasks/AppTaskIntegration.test.tsx`: navigation regression remains intact.

### Task 1: Upgrade Domain Types and Period Rules

**Files:**

- Modify: `src/tasks/types.ts`
- Modify: `src/tasks/taskConfig.ts`
- Modify: `src/tasks/taskEngine.test.ts`
- Modify: `src/tasks/taskEngine.ts`

- [ ] **Step 1: Write failing tests for monthly periods and goal chest tiers**

Add tests asserting:

```ts
expect(getPeriodKey('monthly', '2026-08-14T09:00:00+08:00')).toBe('2026-08');
expect(getGoalChest({ startDate: '2026-08-01', targetDate: '2026-12-01' })).toEqual({
  tier: 'bronze', label: '青铜目标宝箱', dice: 8
});
expect(getGoalChest({ startDate: '2026-08-01', targetDate: '2027-02-01' }).dice).toBe(12);
expect(getGoalChest({ startDate: '2026-08-01', targetDate: '2027-05-01' }).dice).toBe(18);
```

- [ ] **Step 2: Run the engine test and verify RED**

Run `npx vitest run src/tasks/taskEngine.test.ts`. Expected: missing monthly cadence and `getGoalChest` failures.

- [ ] **Step 3: Replace the domain shape with version 2**

Define these contracts in `types.ts`:

```ts
export type TaskCadence = 'daily' | 'weekly' | 'monthly';
export type ChestTier = 'bronze' | 'silver' | 'gold';

export type GoalProgressEntry = {
  id: string;
  goalId: string;
  progressPercent: number;
  note: string;
  outcome: string;
  createdAt: string;
};

export type ShortTask = {
  id: string;
  goalId: string | null;
  dimension: TaskDimension;
  title: string;
  completionStandard: string;
  cadence: TaskCadence;
  targetCount: number;
  estimatedMinutesPerOccurrence: number | null;
  verificationType: VerificationType;
  isMaintenance: boolean;
  rewardEligible: boolean;
  status: RecordStatus;
  createdAt: string;
  completedAt: string | null;
  archivedAt: string | null;
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
  awardedDice: number;
  reviewedCompletionIds: string[];
  settlementCount: number;
  lastSettledAt: string | null;
  transactionIds: string[];
};

export type TaskSystemState = {
  schemaVersion: 2;
  goals: LongTermGoal[];
  goalProgressEntries: GoalProgressEntry[];
  tasks: ShortTask[];
  completions: TaskCompletion[];
  diceTransactions: DiceTransaction[];
  weeklyReviews: WeeklyReview[];
  adventure: AdventureProgress;
};
```

Remove difficulty, baseline and numeric-target fields from current version 2 goal/task drafts. Retain legacy compatibility only inside `taskStorage.ts`.

- [ ] **Step 4: Implement monthly and chest helpers**

Add `GOAL_CHESTS` with bronze 8, silver 12, gold 18 and implement `getGoalChest()` from calendar month distance. Extend `getPeriodKey()` so monthly returns the input date's `YYYY-MM`.

- [ ] **Step 5: Run engine tests and verify GREEN**

Run `npx vitest run src/tasks/taskEngine.test.ts`. Expected: new period/tier tests pass; compile failures in old fixtures guide Task 2 updates.

### Task 2: Implement One-Off Tasks and Daily Maintenance Records

**Files:**

- Modify: `src/tasks/taskEngine.test.ts`
- Modify: `src/tasks/taskEngine.ts`

- [ ] **Step 1: Write failing lifecycle tests**

Cover these exact outcomes:

```ts
expect(completeDailyOrdinary.state.tasks[0].status).toBe('completed');
expect(completeWeeklyOrdinary.state.tasks[0].status).toBe('completed');
expect(completeMonthlyOrdinary.state.tasks[0].status).toBe('completed');
expect(firstMaintenance.state.tasks[0].status).toBe('active');
expect(secondDayMaintenance.state.completions).toHaveLength(2);
expect(() => recordTaskProgress(stateWithWeeklyMaintenance, draft)).toThrow(
  '维持型任务只能使用每日周期'
);
```

- [ ] **Step 2: Verify RED**

Run `npx vitest run src/tasks/taskEngine.test.ts`. Expected: ordinary tasks remain active and invalid maintenance cadence is accepted.

- [ ] **Step 3: Implement lifecycle rules**

In `recordTaskProgress()`:

```ts
if (task.isMaintenance && task.cadence !== 'daily') {
  throw new Error('维持型任务只能使用每日周期');
}

const shouldCompleteTask = rewardGranted && !task.isMaintenance;
const nextTasks = shouldCompleteTask
  ? state.tasks.map((candidate) => candidate.id === task.id
      ? { ...candidate, status: 'completed', completedAt: input.completedAt }
      : candidate)
  : state.tasks;
```

Use monthly period keys for monthly target counts. Preserve the existing daily duplicate guard and maintenance weekly dice cap.

- [ ] **Step 4: Verify GREEN**

Run `npx vitest run src/tasks/taskEngine.test.ts`. Expected: all lifecycle and anti-farming tests pass.

### Task 3: Add Goal Progress and Incremental Weekly Review

**Files:**

- Modify: `src/tasks/taskEngine.test.ts`
- Modify: `src/tasks/taskEngine.ts`

- [ ] **Step 1: Write failing progress and review tests**

Assert goal progress clamps to 0–100 and appends history without overwriting older entries. Assert two same-week settlements behave as follows:

```ts
const first = settleWeeklyReview(stateAfterFirstCompletion, weekKey, firstTime, ids);
expect(first.weeklyReviews[0].awardedDice).toBe(firstPreview.bonusDice);

const second = settleWeeklyReview(stateAfterAdditionalCompletion, weekKey, secondTime, ids);
expect(second.weeklyReviews).toHaveLength(1);
expect(second.weeklyReviews[0].settlementCount).toBe(2);
expect(second.weeklyReviews[0].awardedDice).toBe(secondPreview.bonusDice);
expect(getDiceBalance(second) - getDiceBalance(first)).toBe(
  Math.max(0, secondPreview.bonusDice - firstPreview.bonusDice)
);
```

- [ ] **Step 2: Verify RED**

Run the engine suite. Expected: the second settlement currently throws “本周奖励已经结算”.

- [ ] **Step 3: Implement progress and aggregate settlement**

Add `recordGoalProgress(state, input, idFactory)`. Change `buildWeeklyReviewPreview()` to include:

```ts
{
  ...metrics,
  awardedDice: existingReview?.awardedDice ?? 0,
  claimableDice: Math.max(0, bonusDice - (existingReview?.awardedDice ?? 0)),
  newCompletionIds: weekCompletions
    .map((item) => item.id)
    .filter((id) => !existingReview?.reviewedCompletionIds.includes(id))
}
```

Change `settleWeeklyReview()` to update the one weekly aggregate, append only a positive difference transaction, and mark all current weekly completion IDs reviewed. Never throw merely because the week already has a review.

- [ ] **Step 4: Use chest rewards for goal completion**

Replace difficulty lookup in `completeLongTermGoal()` with `getGoalChest(goal).dice`. Keep final reflection, evidence, 100% progress and adventure unlock behavior.

- [ ] **Step 5: Verify GREEN**

Run `npx vitest run src/tasks/taskEngine.test.ts`. Expected: repeat weekly processing creates no duplicate review and no duplicate reward.

### Task 4: Migrate Version 1 Storage

**Files:**

- Modify: `src/tasks/taskStorage.test.ts`
- Modify: `src/tasks/taskStorage.ts`

- [ ] **Step 1: Write a failing version 1 migration test**

Store a valid version 1 fixture containing one goal, one task, one completion, one weekly review and one dice transaction. Assert:

```ts
expect(migrated.schemaVersion).toBe(2);
expect(migrated.goals[0].title).toBe(legacy.goals[0].title);
expect(migrated.tasks[0].estimatedMinutesPerOccurrence).toBe(20);
expect(migrated.goalProgressEntries).toEqual([]);
expect(migrated.weeklyReviews[0].awardedDice).toBe(legacy.weeklyReviews[0].bonusDice);
expect(migrated.diceTransactions).toEqual(legacy.diceTransactions);
```

- [ ] **Step 2: Verify RED**

Run `npx vitest run src/tasks/taskStorage.test.ts`. Expected: version 1 is rejected and reset.

- [ ] **Step 3: Implement `migrateV1()`**

Map legacy goals/tasks into version 2, discard only obsolete difficulty and numeric-input fields, preserve IDs/status/timestamps/completions/ledger/adventure, initialize `completedAt` for tasks, and convert each legacy weekly review to the new aggregate shape.

- [ ] **Step 4: Verify GREEN**

Run `npx vitest run src/tasks/taskStorage.test.ts`. Expected: empty, round-trip, corruption and migration tests all pass.

### Task 5: Update the Atomic Hook

**Files:**

- Modify: `src/tasks/useTaskSystem.test.tsx`
- Modify: `src/tasks/useTaskSystem.ts`

- [ ] **Step 1: Write failing hook workflows**

Test create/edit/archive, `recordGoalProgress`, ordinary completion, repeated daily maintenance, goal completion, and two same-week `settleWeek` calls. Assert every mutation persists version 2 state.

- [ ] **Step 2: Verify RED**

Run `npx vitest run src/tasks/useTaskSystem.test.tsx`. Expected: removed draft fields and missing progress method fail.

- [ ] **Step 3: Implement hook API changes**

Expose:

```ts
recordGoalProgress(goalId: string, progressPercent: number, note: string, outcome: string): void;
recordProgress(draft: CompletionDraft): void;
settleWeek(weekKey: string): void;
completeGoal(goalId: string, reflection: string, evidenceLink: string): void;
```

Create tasks with `completedAt: null`, force maintenance cadence to daily, and persist after every functional update.

- [ ] **Step 4: Verify GREEN**

Run the hook suite. Expected: all workflows persist and pass.

### Task 6: Rebuild Task Board Relationships and Dialogs

**Files:**

- Modify: `src/tasks/TaskBoard.test.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/TaskBoard.css`

- [ ] **Step 1: Write failing UI tests**

Cover:

- Goal form has no difficulty/start/current/target numeric fields.
- Task form offers 每月 and N/A but no challenge/difficulty/reason.
- Clicking a goal filters the right panel.
- Completed ordinary task moves from 待执行 to 已执行.
- Daily maintenance remains in 待执行 on the next mocked day and adds another history row.
- Archive click opens confirmation and cancel preserves the record.
- Evidence link remains optional.

- [ ] **Step 2: Verify RED**

Run `npx vitest run src/tasks/TaskBoard.test.tsx`. Expected: old form fields and immediate archive behavior fail the assertions.

- [ ] **Step 3: Simplify forms and add goal progress dialog**

Goal form submits only dimension/title/meaning/start/target dates. Task form submits monthly cadence and `estimatedMinutesPerOccurrence: null` when N/A is checked. Add a progress dialog with required note and optional outcome.

- [ ] **Step 4: Implement master-detail filtering and history tabs**

Add `selectedGoalId: 'all' | 'maintenance' | string` and `actionTab: 'pending' | 'history'`. Make goal cards selectable. Derive pending tasks from active status and history rows from completion records joined to their task and goal.

- [ ] **Step 5: Add archive confirmation**

Use the existing modal shell with `Dialog` variants for goal/task archive. Only invoke hook archive actions from the confirmation button.

- [ ] **Step 6: Verify GREEN**

Run the TaskBoard suite. Expected: creation, filtering, history, N/A, monthly, optional evidence and archive confirmation pass.

### Task 7: Add Weekly Review Dialog and Reward Chest

**Files:**

- Create: `src/tasks/RewardChest.tsx`
- Modify: `src/tasks/TaskBoard.test.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/TaskBoard.css`

- [ ] **Step 1: Write failing weekly review tests**

Assert “查看本周进展” is always enabled, the new-record dot appears, a first claim opens a chest, later completions re-enable processing, and a second claim only adds the delta. Assert zero-delta new records can be acknowledged without a dice transaction.

- [ ] **Step 2: Verify RED**

Run the TaskBoard suite. Expected: current once-only settlement button fails.

- [ ] **Step 3: Implement `RewardChest`**

The component accepts:

```ts
type RewardChestProps = {
  open: boolean;
  title: string;
  subtitle: string;
  dice: number;
  tier?: ChestTier;
  onClose: () => void;
};
```

Render an accessible dialog, pixel chest, deterministic dice result, “跳过动画” and “收入背包”. Use CSS animations disabled under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Implement the review dialog**

The panel entry always opens. Show metrics, newly completed actions, awarded total and claimable difference. On processing, call `settleWeek`; open the chest only when claimable dice is positive; otherwise close with a clear “已纳入本周复盘” notice.

- [ ] **Step 5: Connect goal completion to chest feedback**

Compute the goal chest before completion, call `completeGoal`, and show its tier and deterministic dice in the same overlay.

- [ ] **Step 6: Verify GREEN**

Run TaskBoard tests. Expected: review and both chest paths pass.

### Task 8: Full Regression and Preview

**Files:**

- Verify: all project files

- [ ] **Step 1: Run task module tests**

Run `npx vitest run src/tasks`. Expected: all task engine, storage, hook, board and integration tests pass.

- [ ] **Step 2: Run the complete suite**

Run `npm test`. Expected: zero failed tests, including finance and App regressions.

- [ ] **Step 3: Run production build**

Run `npm run build`. Expected: TypeScript and Vite complete with exit code 0.

- [ ] **Step 4: Check patch hygiene**

Run `git diff --check` and inspect `git status --short`. Expected: no whitespace errors and no unrelated user-owned files staged.

- [ ] **Step 5: Restore local preview**

Start `npm run dev -- --port 4173` if the port is not already listening, then verify `http://127.0.0.1:4173/` returns HTTP 200.
