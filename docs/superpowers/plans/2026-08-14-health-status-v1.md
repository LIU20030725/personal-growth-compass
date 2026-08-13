# Health Status V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Dice Life health module covering body, light meals, daily health, structured workouts, trends, reversible deletion, and transparent non-medical review prompts.

**Architecture:** Add an isolated `src/health` feature boundary with typed records, pure calculation/validation functions, a versioned local storage adapter, one state hook, and focused views. Integrate one `HealthModule` at the existing `body` navigation branch without restructuring the global shell. Deliver vertical milestones behind the same feature boundary and write behavior tests before production code.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, browser localStorage, IndexedDB-ready media boundary, CSS.

---

## File map

- `src/health/types.ts`: health domain records and preferences.
- `src/health/healthEngine.ts`: BMI, sleep, units, summaries, trends, prompt templates and workout metrics.
- `src/health/healthStorage.ts`: validation, versioned snapshots, corruption recovery and import/export envelope.
- `src/health/useHealthSystem.ts`: UI-facing commands and immutable state transitions.
- `src/health/HealthModule.tsx`: navigation, dashboard and accessible dialogs/forms.
- `src/health/healthModule.css`: responsive low-anxiety visual system.
- `src/health/*.test.ts(x)`: domain, persistence, component, accessibility and app integration tests.
- `src/App.tsx`: replace body placeholder with `HealthModule` and health shell class.

### Task 1: Domain foundation and body records

- [ ] Write failing tests for BMI precision, missing height, historical height snapshots, unit round-trips, missing-value trends and neutral prompt templates.
- [ ] Run tests and confirm expected failures.
- [ ] Add domain types and minimal pure engine functions.
- [ ] Run targeted tests to green and refactor names.

### Task 2: Local-first storage and recovery

- [ ] Write failing tests for empty load, valid save, previous-valid snapshot recovery, corrupt preservation, soft deletion and import rejection without mutation.
- [ ] Run tests and confirm expected failures.
- [ ] Implement checksummed current/backup snapshots and validated export/import envelopes.
- [ ] Run targeted tests to green.

### Task 3: State hook and dashboard vertical slice

- [ ] Write failing tests for creating/revising/restoring body records and toggling daily metrics.
- [ ] Run tests and confirm expected failures.
- [ ] Implement `useHealthSystem`, dashboard, body form, history and trends.
- [ ] Add app navigation integration test, then replace the body placeholder.
- [ ] Run targeted tests to green.

### Task 4: Daily health and light meals

- [ ] Write failing component tests for water quick-add/undo, cross-midnight sleep, optional energy, meal text/photo rule and non-medical summaries.
- [ ] Run tests and confirm expected failures.
- [ ] Implement daily quick records, metric preferences and meal timeline.
- [ ] Add local media abstraction; keep photo UI gracefully unavailable if persistence cannot be guaranteed.
- [ ] Run targeted tests to green.

### Task 5: Structured workouts

- [ ] Write failing tests for five exercise modes, copied-but-incomplete sets, optional segments/set attributes, draft recovery and comparable-record summaries.
- [ ] Run tests and confirm expected failures.
- [ ] Implement exercise definitions, live/quick workout flow, set copying, rest timer and session history.
- [ ] Run targeted tests to green.

### Task 6: Trash, export/import and accessibility

- [ ] Write failing tests for soft delete/restore, export metadata, failed-import rollback, keyboard dialog behavior, reduced motion and axe serious/critical gate.
- [ ] Run tests and confirm expected failures.
- [ ] Implement trash, JSON export/import preview, focus handling and text trend alternatives.
- [ ] Run targeted tests to green.

### Task 7: Full verification and handoff

- [ ] Run `npm test -- --run` and record file/test counts.
- [ ] Run `npm run build` and confirm exit 0.
- [ ] Inspect `git diff --check`, branch status and changed-file scope.
- [ ] Compare implementation against every PRD acceptance story and document any intentionally deferred item.
- [ ] Stop at “等待总控测试方案”; do not merge or push.

## Existing baseline risk

`npm install` reports 7 dependency vulnerabilities (3 moderate, 3 high, 1 critical). Do not run a breaking `npm audit fix --force` inside this feature. Track dependency remediation separately so health work does not silently upgrade unrelated packages.
