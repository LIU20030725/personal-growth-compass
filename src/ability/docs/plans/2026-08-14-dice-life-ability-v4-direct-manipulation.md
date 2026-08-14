# Dice Life Ability V4 Direct Manipulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把能力画布改为无需模式切换的直接操作技能树，并补齐阶段顺序、下一步行动、详情开关和安全快捷键。

**Architecture:** 领域状态仍由 `abilityEngine` 与 `useAbilitySystem` 管理；可行动节点由纯函数选择器提供；阶段位置继续存入画布偏好而不升级 Ability Schema。`AbilityTreeStage` 负责画布交互与视口定位，`AbilityModule` 只编排页面级动作和表单。

**Tech Stack:** React 19、TypeScript、@xyflow/react、Vitest/Testing Library、Playwright、axe-core。

---

### Task 1: 历史与可行动节点选择器

**Files:**
- Modify: `src/ability/useAbilitySystem.ts`
- Modify: `src/ability/abilityGraph.ts`
- Test: `src/ability/useAbilitySystem.test.tsx`
- Test: `src/ability/abilityGraph.test.ts`

- [ ] 写失败测试：删除分支后 undo 恢复、redo 再次删除，新修改清空 redo。
- [ ] 最小实现双栈历史，公开 `canRedo` 与 `redo`。
- [ ] 写失败测试：学习中优先、同阶段并行候选稳定排序、前置未完成不入选、空树/全部掌握/阻塞原因明确。
- [ ] 实现 `getNextActionCandidates` 与 `getNextActionEmptyReason` 纯函数。
- [ ] 运行对应两份测试并提交 `feat(ability): add redo and next action selection`。

### Task 2: 阶段画布位置与顺序线

**Files:**
- Modify: `src/ability/abilityCanvasStorage.ts`
- Modify: `src/ability/abilityCanvasLayout.ts`
- Test: `src/ability/abilityCanvasStorage.test.ts`
- Test: `src/ability/abilityCanvasLayout.test.ts`

- [ ] 写失败测试：旧偏好无阶段坐标时安全读取，阶段坐标有限且吸附 16px。
- [ ] 扩展偏好为 `phasePositions`，保持 V1 key 和向后兼容。
- [ ] 写失败测试：阶段顺序线按 order 派生；阶段手动位移带动成员节点；清空偏好恢复对齐。
- [ ] 扩展 layout 输入与输出，新增 `phaseEdges`，统一应用阶段偏移。
- [ ] 运行对应两份测试并提交 `feat(ability): make stages movable and connected`。

### Task 3: 取消编辑模式并收敛页面动作

**Files:**
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/components/AbilityTreeStage.tsx`
- Modify: `src/ability/components/AbilityNodePanel.tsx`
- Modify: `src/ability/components/AbilityForms.tsx`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] 写失败测试：不存在“编辑技能树/记录成果”页面按钮；存在“修改技能树资料/添加阶段”；节点与空阶段加号常驻。
- [ ] 移除 `editMode` 状态与 props，结构操作常驻；危险操作保留选择后菜单和撤销。
- [ ] 写失败测试：成果从节点详情打开时表单无节点下拉并固定当前节点。
- [ ] 调整成果表单接口与顶部操作。
- [ ] 运行组件测试并提交 `feat(ability): switch canvas to direct manipulation`。

### Task 4: 详情开关与下一步行动

**Files:**
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/components/AbilityTreeStage.tsx`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] 写失败测试：节点单击立即打开详情，画布空白关闭详情。
- [ ] 统一 `onSelectNode` 语义，单选同步 `detailOpen=true`，清空同步关闭。
- [ ] 写失败测试：下一步按钮显示候选数，连续点击轮换并行候选，无候选显示原因。
- [ ] 让舞台接收 `focusRequest`，执行选中与 fitView。
- [ ] 运行组件测试并提交 `feat(ability): turn next into a focused action`。

### Task 5: 安全快捷键与快捷键说明

**Files:**
- Create: `src/ability/abilityKeyboard.ts`
- Create: `src/ability/abilityKeyboard.test.ts`
- Modify: `src/ability/components/AbilityTreeStage.tsx`
- Modify: `src/ability/components/AbilityForms.tsx`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] 写失败测试：键位映射、父子同级导航、输入/按钮/弹窗排除、Tab 永不映射。
- [ ] 实现纯函数 `resolveAbilityCanvasCommand` 和稳定邻接导航。
- [ ] 在画布局部 keydown 中接入 Enter/F2、添加、删除、undo/redo、复制粘贴、方向键、Home/End、Esc、?。
- [ ] 添加有焦点约束的快捷键说明弹窗，并测试 Esc/焦点恢复。
- [ ] 运行快捷键与组件测试并提交 `feat(ability): add scoped canvas shortcuts`。

### Task 6: 视觉对齐、E2E 与归档

**Files:**
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/e2e/ability-canvas.spec.ts`
- Modify: `src/ability/e2e/ability-v3-acceptance.spec.ts`
- Create: `src/ability/docs/releases/2026-08-14-ability-v4.0-implementation.md`

- [ ] 更新阶段线、常驻加号、顶部动作、下一步按钮、快捷键弹窗与详情布局样式。
- [ ] 更新 E2E：阶段拖动/重载/重置、三次添加并行子节点、下一步轮换、详情开关、成果归属、undo/redo 与作用域键盘。
- [ ] 运行能力模块测试、全量测试、build、专项 E2E 与 a11y；保存精确结果。
- [ ] 1440×900、1024×768、390×844 人工检查并保存证据。
- [ ] 写版本归档，记录提交、迁移兼容、测试证据和限制；提交 `docs(ability): archive v4 implementation`。

## 自检

- 规格的阶段关系、取消编辑模式、成果归属、下一步、详情、快捷键和对齐均有对应任务。
- Ability Schema 保持 V2；新增字段仅在 CanvasPreferences，迁移风险可控。
- 没有将飞书无关的通用画板能力扩入范围。
