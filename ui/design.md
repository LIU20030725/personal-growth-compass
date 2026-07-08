# Personal Growth Compass UI Design

## Purpose

This document records UI direction, visual rules, component behavior, and design decisions for the Personal Growth Compass project.

## Product Feel

- Character status panel, growth dashboard, and life-management cockpit.
- Practical and life-oriented, not fantasy-heavy.
- Game-like structure should support motivation, clarity, and long-term tracking.

## Core Layout

- Current GoldQuest dashboard keeps the finance command hall as the main work surface while exposing the broader personal-growth system in the sidebar.
- Sidebar system navigation uses five growth entries:
  - 财富状况 / Wealth
  - 能力属性 / Ability
  - 健康状况 / Body Health
  - 情绪状态 / Emotion
  - 成就收集 / Achievements
- Finance remains the first fully implemented module; the other entries are navigation anchors and visual placeholders for the broader product architecture.
- Each system should eventually drill down into clear submodules.
- Mobile layout must be considered from the start.

## UI Principles

- Prioritize readable status, trends, and gaps.
- Use visual hierarchy before decorative effects.
- Keep interactions form-driven where users need to record data.
- Use charts and status indicators to make progress visible.
- Avoid abstract or unrealistic metrics.

## Component Notes

### Dashboard

- The current dashboard should read as a bright RPG finance command hall: fixed header, left character/status sidebar, net-worth hero, metric cards, account cards, monthly cashflow, and savings calendar.
- The sidebar is the bridge back to the full personal-growth compass, so icon language must cover wealth, ability, health, emotion, and achievement collection.
- System cards and panels should expose key numbers and next action.

### Economy

- Account-driven layout.
- Monthly bill, asset overview, investment profit/loss, and savings calendar should stay easy to scan.

### Ability

- Career and side-project paths should be presented as skill-tree structures.
- Users should be able to grow skills by breadth and depth.

### Body

- BMI, exercise frequency, sleep, and body data should be direct and practical.

### Emotion

- Stress and release records should feel lightweight and low-friction.

### Achievements

- Achievement collection should use trophy, medal, badge, and milestone language.
- Achievement icons should feel collectible but still match the hard-outline GoldQuest visual system.

## Open Decisions

- Compass sector visual style
- Skill tree interaction pattern
- Mobile bottom navigation behavior
- Achievement badge visual language

## Version Archive

- [V0 UI archive](./V0/README.md): original light GoldQuest Finance dashboard.
- [V0 UI evaluation](./V0/ui-evaluation.md): first audit and redesign direction notes.
