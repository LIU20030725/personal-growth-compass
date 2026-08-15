# Dice Life Global Today Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real global 「今日总览」 default homepage that summarizes emotion, ability, health, and task data while preserving the existing module workflows and storage.

**Architecture:** Add a focused `src/today/` feature with pure summary selectors, a presentational overview page, and a small composition hook over the four existing systems. `App` owns navigation and one-shot module intents; emotion, health, and task modules consume optional intents and keep all writes inside their existing business logic.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, lucide-react, vanilla CSS, Playwright, axe-core, localStorage-backed module systems.

---

## File map

- Create `src/today/todayOverviewModel.ts`: pure date and summary derivation functions.
- Create `src/today/todayOverviewModel.test.ts`: domain tests for all four summaries and task period rules.
- Create `src/today/useTodayOverview.ts`: compose existing systems into one read model.
- Create `src/today/TodayOverview.tsx`: semantic page, status strip, three module cards, quick menu, and micro-actions.
- Create `src/today/todayOverview.css`: reference-layout styling and responsive states.
- Create `src/today/TodayOverview.test.tsx`: component behavior, keyboard menu, empty states, and action callbacks.
- Create `src/today/TodayOverviewAccessibility.test.tsx`: axe gate for empty and populated states.
- Create `src/today/e2e/today-overview.spec.ts`: default-route, module entry, task completion, persistence, and screenshot journey.
- Create `playwright.today.config.ts`: dedicated three-viewport browser verification.
- Modify `src/App.tsx`: add `today` view, default routing, sidebar entry, Logo behavior, and one-shot intent plumbing.
- Modify `src/App.test.tsx`: assert default overview and explicitly enter finance for finance-only cases.
- Modify `src/emotion/EmotionModule.tsx`: consume `emotion.record` intent once.
- Modify `src/emotion/AppEmotionIntegration.test.tsx`: verify intent opens the existing composer.
- Modify `src/health/HealthModule.tsx`: consume `health.quick-record` intent once.
- Modify `src/health/AppHealthIntegration.test.tsx`: verify intent opens existing quick record.
- Modify `src/tasks/TaskBoard.tsx`: consume create/complete task intents once.
- Modify `src/tasks/AppTaskIntegration.test.tsx`: verify create and completion intent routes.
- Modify `src/styles.css`: shell treatment for the today view and sidebar item only.
- Modify `README.md` and `CHANGELOG.md`: distinguish global today overview from health-local overview.

## Task 1: Pure overview read model

**Files:**
- Create: `src/today/todayOverviewModel.ts`
- Create: `src/today/todayOverviewModel.test.ts`

- [ ] **Step 1: Write the failing domain tests**

Create tests using public exported selectors:

```ts
import { describe, expect, it } from 'vitest';
import {
  deriveAbilitySummary,
  deriveEmotionSummary,
  deriveHealthSummary,
  deriveTaskSummary,
} from './todayOverviewModel';

describe('today overview model', () => {
  const now = new Date('2026-08-15T09:00:00+08:00');

  it('uses the latest local-today emotion entry', () => {
    expect(deriveEmotionSummary([
      { id: 'old', createdAt: '2026-08-14T20:00:00+08:00', moodId: 'calm' },
      { id: 'new', createdAt: '2026-08-15T08:00:00+08:00', moodId: 'happy' },
    ], now)).toMatchObject({ hasRecord: true, moodId: 'happy' });
  });

  it('selects the last visited active tree and its next node', () => {
    expect(deriveAbilitySummary({
      trees: [{ id: 'tree', name: '产品设计', status: 'active' }],
      nodes: [{ id: 'node', skillTreeId: 'tree', name: '完成信息架构', progress: 'available', archivedAt: null }],
      lastVisitedTreeId: 'tree',
    })).toMatchObject({ treeId: 'tree', treeName: '产品设计', nextNodeName: '完成信息架构' });
  });

  it('summarizes today health records without medical scoring', () => {
    expect(deriveHealthSummary({ todayWaterMl: 500, mealCount: 1, workoutCount: 0, dailyCount: 1 }))
      .toMatchObject({ hasRecord: true, primary: '饮水 500 ml', recordCount: 2 });
  });

  it('returns no more than three active today tasks and counts completion', () => {
    const summary = deriveTaskSummary({
      tasks: [
        { id: '1', title: '整理案例', status: 'active', startDate: '2026-08-01', endDate: null, cadence: 'daily', targetCount: 1, isMaintenance: true },
        { id: '2', title: '散步', status: 'active', startDate: '2026-08-01', endDate: null, cadence: 'daily', targetCount: 1, isMaintenance: true },
        { id: '3', title: '阅读', status: 'active', startDate: '2026-08-01', endDate: null, cadence: 'daily', targetCount: 1, isMaintenance: true },
        { id: '4', title: '复盘', status: 'active', startDate: '2026-08-01', endDate: null, cadence: 'daily', targetCount: 1, isMaintenance: true },
      ],
      completions: [{ taskId: '1', completedAt: '2026-08-15T08:10:00+08:00', periodKey: '2026-08-15' }],
    }, now);
    expect(summary.items).toHaveLength(3);
    expect(summary).toMatchObject({ completedCount: 1, totalCount: 4 });
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/today/todayOverviewModel.test.ts`

Expected: FAIL because `todayOverviewModel.ts` does not exist.

- [ ] **Step 3: Implement the pure selectors**

Export stable view types and pure functions. Use local date keys rather than UTC slicing:

```ts
export type EmotionOverviewSummary = { hasRecord: boolean; moodId: string | null; primary: string; secondary: string };
export type AbilityOverviewSummary = { treeId: string | null; treeName: string; nextNodeName: string | null; primary: string; secondary: string };
export type HealthOverviewSummary = { hasRecord: boolean; primary: string; secondary: string; recordCount: number };
export type TodayTaskItem = { id: string; title: string; completed: boolean; completionStandard: string };
export type TaskOverviewSummary = { totalCount: number; completedCount: number; items: TodayTaskItem[]; primary: string; secondary: string };

export function localDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
```

Implement the four selectors with no storage access and no writes. Filter archived records, honor task start/end dates, and cap `items` with `.slice(0, 3)`.

- [ ] **Step 4: Run the domain tests and verify GREEN**

Run: `npm test -- src/today/todayOverviewModel.test.ts`

Expected: 1 file passed, 4 tests passed.

- [ ] **Step 5: Commit the slice**

```bash
git add src/today/todayOverviewModel.ts src/today/todayOverviewModel.test.ts
git commit -m "feat(today): derive cross-module overview summaries"
```

## Task 2: Presentational overview page and reference layout

**Files:**
- Create: `src/today/TodayOverview.tsx`
- Create: `src/today/todayOverview.css`
- Create: `src/today/TodayOverview.test.tsx`

- [ ] **Step 1: Write the failing empty-state component test**

```tsx
render(<TodayOverview
  model={emptyTodayOverviewModel}
  onOpenModule={vi.fn()}
  onQuickAction={vi.fn()}
  onCompleteTask={vi.fn()}
/>);

expect(screen.getByRole('heading', { name: '今日总览' })).toBeInTheDocument();
expect(screen.getByRole('region', { name: '今日状态' })).toBeInTheDocument();
expect(screen.getAllByRole('article')).toHaveLength(3);
expect(screen.getByText('今天还没有微行动')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '记录此刻' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- src/today/TodayOverview.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the semantic page skeleton**

Define this public contract:

```ts
export type TodayQuickAction = 'emotion.record' | 'health.quick-record' | 'tasks.create';
export type TodayModule = 'emotion' | 'ability' | 'body' | 'quests';

export type TodayOverviewProps = {
  model: TodayOverviewModel;
  onOpenModule(module: TodayModule, detail?: string): void;
  onQuickAction(action: TodayQuickAction): void;
  onCompleteTask(taskId: string): void;
};
```

Render, in order: page header, `aria-label="今日状态"` status strip, three `article` module cards, and `aria-label="今天的微行动"` task region. Use Lucide icons already installed and CSS-only illustrations composed from semantic decorative spans with `aria-hidden="true"`.

- [ ] **Step 4: Implement the reference-responsive CSS**

Use `.today-overview` as the root namespace. Desktop uses four status columns and three module columns; 1100px compresses spacing without overflow; 680px uses 2×2 status and one module card per row. Add `min-height: 44px` to buttons and `:focus-visible` outlines.

- [ ] **Step 5: Run the component test and verify GREEN**

Run: `npm test -- src/today/TodayOverview.test.tsx`

Expected: empty-state test passes.

- [ ] **Step 6: Commit the slice**

```bash
git add src/today/TodayOverview.tsx src/today/todayOverview.css src/today/TodayOverview.test.tsx
git commit -m "feat(today): add reference overview layout"
```

## Task 3: Compose real module data

**Files:**
- Create: `src/today/useTodayOverview.ts`
- Modify: `src/today/TodayOverview.tsx`
- Modify: `src/today/TodayOverview.test.tsx`

- [ ] **Step 1: Add a failing populated-state test**

Render a model with one emotion, an active ability tree, health records, and four tasks. Assert visible text includes `平静`, `产品设计`, `饮水 500 ml`, `1/4 已完成`, and only the first three task titles.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/today/TodayOverview.test.tsx`

Expected: FAIL because populated summary content is not rendered.

- [ ] **Step 3: Implement `useTodayOverview`**

Compose existing public hooks:

```ts
export function useTodayOverview(): TodayOverviewModel {
  const emotion = useEmotionSystem();
  const ability = useAbilitySystem();
  const health = useHealthSystem();
  const tasks = useTaskSystem();

  return useMemo(() => ({
    emotion: deriveEmotionSummary(emotion.entries, new Date()),
    ability: deriveAbilitySummary(ability.state),
    health: deriveHealthSummary(countTodayHealth(health, new Date())),
    tasks: deriveTaskSummary(tasks.state, new Date()),
  }), [emotion.entries, ability.state, health.state, tasks.state]);
}
```

Keep `countTodayHealth` pure and exclude deleted/draft records.

- [ ] **Step 4: Render populated values in every section**

Use the summary strings as text. Do not calculate medical scores or invent percentages. Use `moodId` only to select the existing emotion label/icon mapping.

- [ ] **Step 5: Run model and component tests**

Run: `npm test -- src/today/todayOverviewModel.test.ts src/today/TodayOverview.test.tsx`

Expected: 2 files passed, all tests passed.

- [ ] **Step 6: Commit the slice**

```bash
git add src/today/useTodayOverview.ts src/today/TodayOverview.tsx src/today/TodayOverview.test.tsx
git commit -m "feat(today): connect real module summaries"
```

## Task 4: Make today the global default view

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing App navigation tests**

Add assertions that `/` renders `今日总览`, the sidebar `今日总览` button has `aria-current="page"`, clicking `财富状况` opens net worth, and clicking `Dice Life 首页` returns to today. Keep a separate test proving `/ability/tree/:id` still opens ability.

- [ ] **Step 2: Run App tests and verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `/` still selects finance.

- [ ] **Step 3: Add the `today` view and navigation**

Change the union and initial path logic:

```ts
type MainView = 'today' | 'finance' | 'character' | 'ability' | 'body' | 'emotion' | 'quests' | 'achievements' | 'journal';

const [activeView, setActiveView] = useState<MainView>(() =>
  window.location.pathname.startsWith('/ability') ? 'ability' : 'today'
);
```

Render `<TodayOverviewContainer />` for `activeView === 'today'`, make the Logo call `openView('today')`, add the sidebar Home entry, and update `popstate` fallback to `today`.

- [ ] **Step 4: Update finance-only tests to enter finance explicitly**

At the beginning of finance-specific tests, click the sidebar `财富状况` button. Do not change their finance assertions.

- [ ] **Step 5: Run App tests and verify GREEN**

Run: `npm test -- src/App.test.tsx src/AppAbilityLazyLoading.test.tsx`

Expected: both files pass and ability remains lazy-loaded.

- [ ] **Step 6: Commit the slice**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat(today): make overview the global home"
```

## Task 5: Quick menu and one-shot module intents

**Files:**
- Modify: `src/today/TodayOverview.tsx`
- Modify: `src/today/TodayOverview.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/emotion/EmotionModule.tsx`
- Modify: `src/emotion/AppEmotionIntegration.test.tsx`
- Modify: `src/health/HealthModule.tsx`
- Modify: `src/health/AppHealthIntegration.test.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/AppTaskIntegration.test.tsx`

- [ ] **Step 1: Write the failing quick-menu keyboard test**

Assert `记录此刻` opens `role="menu"`, the first item receives focus, Tab remains inside, Escape closes, and focus returns to the trigger.

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- src/today/TodayOverview.test.tsx`

Expected: FAIL because the quick menu is not implemented.

- [ ] **Step 3: Implement `TodayQuickRecordMenu`**

Render three `menuitem` buttons: `记录情绪`, `记录健康`, `添加今日任务`. Reuse the focus-trap pattern from `EmotionCreateMenu`; close before calling `onQuickAction`.

- [ ] **Step 4: Add one-shot intent state to App**

Use a discriminated union:

```ts
type ModuleIntent =
  | { id: number; type: 'emotion.record' }
  | { id: number; type: 'health.quick-record' }
  | { id: number; type: 'tasks.create' }
  | { id: number; type: 'tasks.complete'; taskId: string };
```

Increment `id` for each action. Route to the target view and pass `intent` plus `onIntentConsumed={() => setModuleIntent(null)}`.

- [ ] **Step 5: Write failing integration tests for module intent consumption**

Assert emotion opens `记录此刻感受`, health opens `一键记录`, and tasks opens `新建短期任务`. Rerendering after `onIntentConsumed` must not reopen the dialog.

- [ ] **Step 6: Implement optional intent props in each module**

Use a guarded effect keyed by `intent.id`:

```ts
useEffect(() => {
  if (intent?.type !== 'emotion.record') return;
  openComposer({ mode: 'create' });
  onIntentConsumed?.();
}, [intent?.id]);
```

Implement equivalent health and task behavior using their existing `setQuickOpen` and `setDialog` state. Do not duplicate form components.

- [ ] **Step 7: Run focused integration tests**

Run: `npm test -- src/today/TodayOverview.test.tsx src/emotion/AppEmotionIntegration.test.tsx src/health/AppHealthIntegration.test.tsx src/tasks/AppTaskIntegration.test.tsx`

Expected: 4 files passed, all tests passed.

- [ ] **Step 8: Commit the slice**

```bash
git add src/today/TodayOverview.tsx src/today/TodayOverview.test.tsx src/App.tsx src/emotion/EmotionModule.tsx src/emotion/AppEmotionIntegration.test.tsx src/health/HealthModule.tsx src/health/AppHealthIntegration.test.tsx src/tasks/TaskBoard.tsx src/tasks/AppTaskIntegration.test.tsx
git commit -m "feat(today): connect quick record module intents"
```

## Task 6: Real micro-action completion flow

**Files:**
- Modify: `src/today/TodayOverview.tsx`
- Modify: `src/today/TodayOverview.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/tasks/TaskBoard.tsx`
- Modify: `src/tasks/AppTaskIntegration.test.tsx`

- [ ] **Step 1: Write a failing micro-action interaction test**

Render three task items; click `记录完成：整理案例`; assert `onCompleteTask('task-1')`. Assert completed items show `今日已记录` and do not render another completion button.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/today/TodayOverview.test.tsx`

Expected: FAIL because task actions are not wired.

- [ ] **Step 3: Wire completion and task-center actions**

`onCompleteTask` dispatches `{ type: 'tasks.complete', taskId }`. `TaskBoard` resolves only an active task and opens its existing completion dialog. Unknown, archived, or already completed IDs show no dialog.

- [ ] **Step 4: Add the task integration regression**

Seed task storage, dispatch the intent through App, submit the existing completion form, return to today, and assert the status changes to `今日已记录`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/today/TodayOverview.test.tsx src/tasks/AppTaskIntegration.test.tsx src/tasks/taskEngine.test.ts src/tasks/taskStorage.test.ts`

Expected: 4 files passed, all tests passed.

- [ ] **Step 6: Commit the slice**

```bash
git add src/today/TodayOverview.tsx src/today/TodayOverview.test.tsx src/App.tsx src/tasks/TaskBoard.tsx src/tasks/AppTaskIntegration.test.tsx
git commit -m "feat(today): run real micro actions from home"
```

## Task 7: Accessibility, responsive evidence, docs, and full verification

**Files:**
- Create: `src/today/TodayOverviewAccessibility.test.tsx`
- Create: `src/today/e2e/today-overview.spec.ts`
- Create: `playwright.today.config.ts`
- Modify: `src/today/todayOverview.css`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the axe gate**

Render empty and populated overview states and assert no serious or critical violations using the same `vitest-axe` configuration as the emotion and health modules.

- [ ] **Step 2: Run the axe test and fix only real violations**

Run: `npm test -- src/today/TodayOverviewAccessibility.test.tsx`

Expected: 1 file passed; zero serious or critical violations.

- [ ] **Step 3: Add the three-viewport Playwright journey**

For 1440×900, 1024×768, and 390×844: seed the same local data, open `/`, assert `今日总览`, verify `document.documentElement.scrollWidth <= window.innerWidth`, exercise quick menu and task route, reload, and save screenshots under `artifacts/today-overview/`.

- [ ] **Step 4: Run the dedicated browser suite**

Run: `npx playwright test -c playwright.today.config.ts`

Expected: all three viewport projects pass, no console errors, screenshots saved.

- [ ] **Step 5: Update product documentation**

README must list the global overview as an application-level module. CHANGELOG must add an Unreleased entry describing the new default home and explicitly distinguish it from the health-local overview.

- [ ] **Step 6: Run the full verification gate**

Run: `npm test && npm run build`

Expected: all test files pass, zero failed tests, TypeScript passes, Vite production build exits 0.

- [ ] **Step 7: Review the final diff and working tree**

Run: `git diff --check && git status --short && git diff --stat main...HEAD`

Expected: no whitespace errors; only planned files changed; visual artifacts excluded from the commit unless the repository convention tracks acceptance evidence.

- [ ] **Step 8: Commit the final gate**

```bash
git add src/today/TodayOverviewAccessibility.test.tsx src/today/e2e/today-overview.spec.ts playwright.today.config.ts src/today/todayOverview.css README.md CHANGELOG.md
git commit -m "test(today): verify accessible responsive overview"
```

## Completion criteria

- `/` and the Dice Life Logo open global 今日总览.
- The screenshot's four status items, three main cards, and micro-action zone are visibly implemented.
- Emotion, ability, health, and task summaries come from existing persisted data.
- Quick actions reuse existing module workflows.
- Task completion is persisted through the existing task system.
- Existing module behavior and direct ability routes remain intact.
- Unit/component/integration/axe/full regression/build gates pass.
- Three viewport screenshots show no horizontal overflow and meaningful visual change from the former finance-first home.
