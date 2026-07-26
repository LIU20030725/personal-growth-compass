# Personal Growth Compass

Personal Growth Compass is a React + TypeScript web app for turning personal growth into a visible, reviewable, game-like dashboard.

The long-term product vision is a personal growth compass that tracks four life systems: wealth, ability, body, and emotion. The current open-source implementation focuses on the wealth and economy module, presented as **GoldQuest Finance**, a bright RPG-style finance command hall.

## Current Status

This repository is an active frontend prototype.

- Current implemented module: economy / wealth dashboard
- Current package version: `2.0.0`
- Release date in `package.json`: `2026-07-02`
- Main development branch: `codex/economic-system/main`
- Framework: React 18 + Vite + TypeScript
- Data model: in-memory demo data with frontend calculation logic

The broader personal growth system is described in the PRD and implementation plan under `docs/superpowers/`, but not every planned module has been implemented yet.

## What You Can Try Today

The current UI includes a finance dashboard with:

- Net worth hero panel and economy score
- Monthly income, expense, and balance cards
- Cash, investment, and receivable account groups
- Expandable account details
- Quick transaction entry
- Account-level income, expense, profit, loss, and transfer records
- Monthly cashflow detail sheet
- Monthly savings calendar with source details
- RPG-inspired sidebar navigation for wealth, ability, body, emotion, and achievements
- Hard-outline report style based on the project design system

## Product Vision

The original PRD defines a personal growth PWA where users can track progress across four systems:

| System | Planned Purpose |
| --- | --- |
| Wealth / Economy | Track accounts, income, expense, assets, liabilities, goals, and financial progress |
| Ability | Track career skills, habits, competencies, learning, and side-project achievements |
| Body | Track health logs, exercise, and body metrics |
| Emotion | Track stress, emotional release, and self-reflection records |

The app uses game-like language such as levels, quests, achievements, progress bars, and milestones, but the design principle is practical first: every game element should map to real personal progress.

## Design Direction

The current visual system is documented in `STYLE.md`.

Core style keywords:

- Bright RPG dashboard
- Hard-outline ledger cards
- White and light-gray report surfaces
- 2px ink borders
- Solid offset shadows
- Gold primary actions
- Emerald positive states
- Ruby risk and expense states
- Sidebar character/status panel
- Bilingual micro-labels for a command-console feeling

Important design rule: preserve the vertical dashboard layout unless a change explicitly requires a layout redesign. Most UI work should improve component details, states, copy, spacing, forms, and overlays without rearranging the main information architecture.

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | React 18 |
| Language | TypeScript |
| Build tool | Vite |
| Testing | Vitest, Testing Library, jsdom |
| Icons | lucide-react |
| Styling | CSS in `src/styles.css` |
| Finance logic | `src/finance/financeEngine.ts` |

## Getting Started

### Prerequisites

Use a recent Node.js version. Node 18+ is recommended.

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The dev server starts on:

```text
http://127.0.0.1:5173/
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Watch Tests

```bash
npm run test:watch
```

## Project Structure

```text
.
|-- docs/
|   |-- git-branching-and-versioning-guide.md
|   `-- superpowers/
|       |-- plans/2026-06-21-plan.md
|       `-- specs/2026-06-21-spec.md
|-- src/
|   |-- App.tsx
|   |-- App.test.tsx
|   |-- main.tsx
|   |-- styles.css
|   |-- test-setup.ts
|   `-- finance/
|       |-- financeEngine.ts
|       `-- financeEngine.test.ts
|-- ui/
|   |-- design.md
|   `-- V0/
|       |-- README.md
|       `-- ui-evaluation.md
|-- PROJECT_CONTEXT.md
|-- STYLE.md
|-- package.json
|-- tsconfig.json
`-- vite.config.ts
```

## Key Files

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Main economy dashboard UI and interaction state |
| `src/styles.css` | Global visual system and component styling |
| `src/finance/financeEngine.ts` | Finance calculations such as net worth, monthly balance, savings rate, budget alerts, and economy score |
| `src/App.test.tsx` | UI workflow tests for dashboard, sheets, accounts, transactions, and calendar details |
| `src/finance/financeEngine.test.ts` | Unit tests for finance calculation logic |
| `STYLE.md` | Overall UI style guide |
| `PROJECT_CONTEXT.md` | Current product and implementation context |
| `docs/superpowers/specs/2026-06-21-spec.md` | Original PRD / design specification |
| `docs/superpowers/plans/2026-06-21-plan.md` | Original implementation plan |

## Implemented Finance Logic

`src/finance/financeEngine.ts` currently provides:

- Transaction, asset, liability, goal, and budget types
- Monthly income and expense aggregation
- Monthly balance calculation
- Asset, liability, and net worth calculation
- Savings rate calculation
- Budget usage alerts
- Goal progress calculation
- Economy score calculation

This module is a good starting point if you want to extract the business logic away from the current single-page prototype.

## Roadmap

Short-term improvements:

- Persist user-entered account and transaction data
- Support editing and deleting transaction records
- Improve account detail hierarchy
- Add more account type fields
- Refine the monthly cashflow filter experience
- Add more regression tests around account transfers and monthly summaries

Medium-term improvements:

- Split the large `App.tsx` into reusable components
- Introduce a real storage adapter
- Add route-based pages for the wider growth system
- Implement ability, body, emotion, and achievements modules
- Add PWA manifest and offline support

Long-term product direction:

- Goal contracts and reward redemption
- Skill tree and habit streak systems
- Health and emotion tracking modules
- Full growth dashboard across all life systems
- Optional mobile packaging through Capacitor

## Branches And Versions

Important branches:

| Branch | Meaning |
| --- | --- |
| `codex/economic-system/main` | Current main development branch for the economy system |
| `codex/economic-system/v2.1-20260705-ui-polish` | UI polish iteration branch |
| `codex/economy-system-v0.1-0628` | Early economy-system archive branch |
| `codex/stitch-ui-v1` | Stitch visual reference archive |
| `main` | Initial repository baseline |

Published GitHub releases:

| Release | Notes |
| --- | --- |
| `v0.1-0628` | Early React/Vite economy dashboard backup |
| `V2.0` | Account-driven finance system with account records, transfers, monthly bills, savings calendar details, and expense analysis |

## Contributing

Contributions are welcome, especially around:

- Refactoring the current dashboard into smaller components
- Improving accessibility and responsive behavior
- Adding persistent storage
- Extending test coverage
- Implementing planned growth modules from the PRD
- Improving the documentation and design system

Recommended workflow:

1. Create a feature branch from `codex/economic-system/main`.
2. Keep UI layout changes explicit and focused.
3. Run `npm test` and `npm run build`.
4. Open a pull request with screenshots or a short screen recording when the change affects UI.

## Notes For Open-Source Users

- The app is currently a frontend prototype, not a production finance product.
- It does not connect to a backend service.
- The current account and transaction data are demo-oriented.
- The project has no license file yet; reuse terms should be clarified before production or commercial use.
- `package.json` is marked `"private": true` to prevent accidental npm publishing.

## License

No license has been added yet.

If you plan to reuse or redistribute this project, add an explicit open-source license first.
