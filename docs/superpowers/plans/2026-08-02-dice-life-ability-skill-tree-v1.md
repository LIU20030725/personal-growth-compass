# Dice Life Ability Skill Tree V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Dice Life 应用中交付一个手动优先、可持久化、可无限创建技能树的能力模块，并为未来 AI 规划器保留稳定草案契约。

**Architecture:** 新建独立的 `src/ability/` 功能包，纯函数负责图校验、派生状态、确定性布局、草案应用和领域变更，React hook 只负责原子持久化，UI 只消费这些能力。能力模块复用任务系统的已存在任务，只保存任务 ID 关系；路由使用浏览器 History API 接入现有单页应用，不增加路由或 AI 厂商依赖。

**Tech Stack:** React 18、TypeScript 5.7、Vite 6、Vitest 2、Testing Library、lucide-react、CSS、localStorage。

---

## 实施约束

- 设计依据：`docs/superpowers/specs/2026-08-02-dice-life-ability-skill-tree-design.md`。
- V1 不显示 AI 入口，不安装模型 SDK，不处理 API Key。
- 技能节点不使用 XP 或 Lv.1—Lv.10；只使用锁定、可开始、成长中、已掌握四种展示状态。
- `locked` 是依赖关系的派生结果，不作为持久化进度写入。
- 成果保持轻量，只记录名称、日期、说明、关联节点和是否展示在树上。
- 不引入自由画布库；桌面端使用固定阶段网格与 SVG 连线，移动端使用普通文档流阶段卡片。
- 现有任务引擎不复制到能力模块；任务关联只保存 `taskId`。

## 文件结构

- Create `src/lib/storage.ts`: 任务与能力模块共享的最小存储适配器接口。
- Modify `src/tasks/taskStorage.ts`: 改为从共享文件导入 `StorageLike`，行为保持不变。
- Create `src/ability/types.ts`: 正式状态、草案、AI 规划器和 UI 派生类型。
- Create `src/ability/abilityConfig.ts`: 存储键、角色标签、状态标签和布局常量。
- Create `src/ability/abilityGraph.ts`: 引用校验、循环检测、解锁状态、进度统计。
- Create `src/ability/abilityGraph.test.ts`: 图规则和掌握撤销回归测试。
- Create `src/ability/abilityLayout.ts`: 确定性阶段/分支布局与成果节点位置。
- Create `src/ability/abilityLayout.test.ts`: 空树、深链、宽分支和折叠阶段测试。
- Create `src/ability/abilityDrafts.ts`: 统一草案校验、正式 ID 映射和原子应用。
- Create `src/ability/abilityDrafts.test.ts`: 手动草案、非法引用和全有或全无测试。
- Create `src/ability/abilityStorage.ts`: v1 加载、保存、损坏备份和旧结构转换。
- Create `src/ability/abilityStorage.test.ts`: 往返、写入失败、损坏快照和旧结构迁移测试。
- Create `src/ability/abilityEngine.ts`: 树、阶段、节点、依赖、标准、任务链接和成果的纯状态变更。
- Create `src/ability/abilityEngine.test.ts`: 领域动作和删除/归档规则测试。
- Create `src/ability/useAbilitySystem.ts`: 持久化 hook 和可恢复错误状态。
- Create `src/ability/useAbilitySystem.test.tsx`: 原子更新、失败回滚和刷新恢复测试。
- Create `src/ability/abilityRoute.ts`: `/ability` 与 `/ability/trees/:id` 解析和 History API 导航。
- Create `src/ability/abilityRoute.test.ts`: 默认树选择、非法树回退和路径解析测试。
- Create `src/ability/components/SkillLibrary.tsx`: 搜索、角色/归档筛选、排序、置顶与切树。
- Create `src/ability/components/AbilityTreeStage.tsx`: 固定冒险路线树、状态节点、连线和成果节点。
- Create `src/ability/components/AbilityNodePanel.tsx`: 节点详情、标准、任务和成果操作。
- Create `src/ability/components/AbilityForms.tsx`: 树、阶段、节点、并行组和成果的手动表单。
- Create `src/ability/AbilityModule.tsx`: 页面状态编排、路由同步、空状态和错误恢复。
- Create `src/ability/AbilityModule.css`: 硬边 RPG 风格、桌面树与移动阶段路线。
- Create `src/ability/AbilityModule.test.tsx`: 用户可见的创建、切树、掌握、关联和成果流程。
- Create `src/ability/AppAbilityIntegration.test.tsx`: 从全局侧栏进入能力模块及 URL 回归。
- Modify `src/App.tsx`: 用真实 `AbilityModule` 替换能力占位页。
- Modify `src/App.test.tsx`: 更新能力页断言，保留财富、人物与任务导航回归。

### Task 1: 建立共享存储接口与能力领域类型

**Files:**

- Create: `src/lib/storage.ts`
- Modify: `src/tasks/taskStorage.ts`
- Create: `src/ability/types.ts`
- Create: `src/ability/abilityConfig.ts`
- Test: `src/tasks/taskStorage.test.ts`

- [ ] **Step 1: 提取共享存储接口**

在 `src/lib/storage.ts` 写入：

```ts
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
```

将 `src/tasks/taskStorage.ts` 中的本地 `StorageLike` 删除并改为：

```ts
import type { StorageLike } from '../lib/storage';
export type { StorageLike } from '../lib/storage';
```

- [ ] **Step 2: 验证任务存储没有回归**

Run: `npx vitest run src/tasks/taskStorage.test.ts`

Expected: 4 tests passed，现有任务状态仍能加载、迁移和备份损坏数据。

- [ ] **Step 3: 定义能力正式状态**

在 `src/ability/types.ts` 定义并导出以下核心类型：

```ts
export type SkillRole = 'main' | 'side' | 'exploring';
export type SkillTreeStatus = 'active' | 'archived';
export type NodeProgress = 'available' | 'in_progress' | 'mastered';
export type NodeDisplayState = 'locked' | NodeProgress;
export type TreeNodeFilter = 'all' | 'current_phase' | NodeDisplayState;
export type CriterionSource = 'manual' | 'ai';

export type SkillTree = {
  id: string;
  name: string;
  description: string;
  role: SkillRole;
  status: SkillTreeStatus;
  focusedRank: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LearningPhase = {
  id: string;
  skillTreeId: string;
  name: string;
  description: string;
  order: number;
};

export type SkillNode = {
  id: string;
  skillTreeId: string;
  phaseId: string;
  name: string;
  description: string;
  progress: NodeProgress;
  masteryNote: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DependencyEdge = {
  id: string;
  skillTreeId: string;
  prerequisiteNodeId: string;
  dependentNodeId: string;
};

export type ParallelGroup = {
  id: string;
  skillTreeId: string;
  phaseId: string;
  name: string;
  nodeIds: string[];
};

export type MasteryCriterion = {
  id: string;
  skillNodeId: string;
  description: string;
  satisfied: boolean;
  source: CriterionSource;
};

export type SkillTaskLink = { id: string; skillNodeId: string; taskId: string };

export type SkillOutcome = {
  id: string;
  skillTreeId: string;
  skillNodeId: string | null;
  title: string;
  description: string;
  occurredOn: string;
  showOnTree: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AbilityState = {
  schemaVersion: 1;
  trees: SkillTree[];
  phases: LearningPhase[];
  nodes: SkillNode[];
  dependencies: DependencyEdge[];
  parallelGroups: ParallelGroup[];
  masteryCriteria: MasteryCriterion[];
  taskLinks: SkillTaskLink[];
  outcomes: SkillOutcome[];
  lastVisitedTreeId: string | null;
};
```

- [ ] **Step 4: 定义统一草案和规划器边界**

在同一文件继续定义 `DraftPhase`、`DraftNode`、`DraftDependency`、`DraftParallelGroup`、`DraftMasteryCriterion`、`DraftSuggestedTask`，草案引用使用 `draftId`。导出：

```ts
export type SkillTreeDraft = {
  tree: Pick<SkillTree, 'name' | 'description' | 'role' | 'status' | 'focusedRank'>;
  phases: DraftPhase[];
  nodes: DraftNode[];
  dependencies: DraftDependency[];
  parallelGroups: DraftParallelGroup[];
  masteryCriteria: DraftMasteryCriterion[];
  suggestedTasks?: DraftSuggestedTask[];
};

export type SkillTreeDraftPatch = {
  skillTreeId: string;
  phases: DraftPhase[];
  nodes: DraftNode[];
  dependencies: DraftDependency[];
  parallelGroups: DraftParallelGroup[];
  masteryCriteria: DraftMasteryCriterion[];
};

export type AbilityPlanInput = { skillName: string; context: string; constraints: string[] };
export type AbilityExpandInput = { skillTreeId: string; goal: string; existingState: AbilityState };

export interface AbilityPlanner {
  plan(input: AbilityPlanInput): Promise<SkillTreeDraft>;
  expand(input: AbilityExpandInput): Promise<SkillTreeDraftPatch>;
}
```

V1 只能在类型和草案测试中引用 `AbilityPlanner`，不得创建实现或 UI 入口。

- [ ] **Step 5: 添加配置常量**

在 `abilityConfig.ts` 导出：

```ts
export const ABILITY_STORAGE_KEY = 'dice-life.ability.v1';
export const LEGACY_ABILITY_STORAGE_KEYS = ['abilityStore', 'dice-life.ability-store'] as const;
export const SKILL_ROLE_LABELS = { main: '主技能', side: '副技能', exploring: '探索技能' } as const;
export const NODE_STATE_LABELS = {
  locked: '锁定', available: '可开始', in_progress: '成长中', mastered: '已掌握'
} as const;
export const TREE_LAYOUT = { columns: 5, rowHeight: 220, columnWidth: 190 } as const;
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/tasks/taskStorage.ts src/ability/types.ts src/ability/abilityConfig.ts
git commit -m "feat(ability): define skill tree domain contracts"
```

### Task 2: 实现图校验、派生状态与进度统计

**Files:**

- Create: `src/ability/abilityGraph.test.ts`
- Create: `src/ability/abilityGraph.ts`

- [ ] **Step 1: 写失败的图规则测试**

测试至少包含以下断言：

```ts
expect(getNodeDisplayState(root, state)).toBe('available');
expect(getNodeDisplayState(dependent, state)).toBe('locked');
expect(getNodeDisplayState(dependent, stateWithMasteredRoot)).toBe('available');
expect(getNodeDisplayState(startedDependent, stateAfterRootDemotion)).toBe('in_progress');
expect(hasPrerequisiteWarning(startedDependent, stateAfterRootDemotion)).toBe(true);
expect(() => validateAbilityState(stateWithSelfEdge)).toThrow('技能节点不能依赖自身');
expect(() => validateAbilityState(stateWithCycle)).toThrow('技能树不能包含循环依赖');
expect(() => validateAbilityState(stateWithCrossTreeEdge)).toThrow('依赖关系不能跨技能树');
```

再覆盖重复边、缺失引用、跨阶段并行组、成果关联错误和归档节点成为新依赖目标。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npx vitest run src/ability/abilityGraph.test.ts`

Expected: FAIL，因为 `abilityGraph.ts` 尚不存在。

- [ ] **Step 3: 实现引用与循环校验**

在 `abilityGraph.ts` 导出：

```ts
export function validateAbilityState(state: AbilityState): void;
export function assertDependencyAllowed(
  state: AbilityState,
  edge: Omit<DependencyEdge, 'id'>
): void;
export function getTransitiveDependents(state: AbilityState, nodeId: string): string[];
```

`validateAbilityState` 必须先检查唯一 ID 和引用存在，再用三色深度优先搜索检测循环；错误信息使用测试中的中文文案。

- [ ] **Step 4: 实现四种展示状态**

实现规则：

```ts
export function getNodeDisplayState(node: SkillNode, state: AbilityState): NodeDisplayState {
  if (node.progress === 'mastered' || node.progress === 'in_progress') return node.progress;
  const prerequisites = getPrerequisiteNodes(state, node.id);
  return prerequisites.every((item) => item.progress === 'mastered') ? 'available' : 'locked';
}

export function hasPrerequisiteWarning(node: SkillNode, state: AbilityState): boolean {
  return node.progress !== 'available' &&
    getPrerequisiteNodes(state, node.id).some((item) => item.progress !== 'mastered');
}
```

这保证撤销前置掌握后，已经推进过的后续节点不被强制回锁，但会显示提醒。

- [ ] **Step 5: 实现树进度与默认树选择**

导出：

```ts
export function getTreeProgress(state: AbilityState, treeId: string): {
  total: number; mastered: number; inProgress: number; percent: number;
};

export function selectDefaultTree(state: AbilityState): SkillTree | null;
```

默认树优先级为：最近访问且仍是重点树、`focusedRank` 最小的重点树、`updatedAt` 最新的活动树。归档树不进入默认选择。

- [ ] **Step 6: 运行测试确认 GREEN**

Run: `npx vitest run src/ability/abilityGraph.test.ts`

Expected: all graph tests passed。

- [ ] **Step 7: Commit**

```bash
git add src/ability/abilityGraph.ts src/ability/abilityGraph.test.ts
git commit -m "feat(ability): validate dependencies and derive node states"
```

### Task 3: 实现固定冒险路线布局

**Files:**

- Create: `src/ability/abilityLayout.test.ts`
- Create: `src/ability/abilityLayout.ts`

- [ ] **Step 1: 写失败的确定性布局测试**

构造空树、单节点、四阶段深链、同阶段五节点宽分支和带树上成果的状态，断言：

```ts
expect(layoutSkillTree(state, treeId)).toEqual(layoutSkillTree(state, treeId));
expect(result.phases.map((phase) => phase.order)).toEqual([0, 1, 2, 3]);
expect(new Set(samePhaseNodes.map((node) => node.row))).toEqual(new Set([1]));
expect(outcomeNode.kind).toBe('outcome');
expect(result.unlockEdges.every((edge) => edge.toId !== outcomeNode.id)).toBe(true);
expect(layoutSkillTree(emptyState, treeId).nodes).toEqual([]);
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npx vitest run src/ability/abilityLayout.test.ts`

Expected: FAIL，因为布局函数尚不存在。

- [ ] **Step 3: 实现稳定排序与中央主干**

在 `abilityLayout.ts` 定义：

```ts
export type LayoutNode = {
  id: string;
  kind: 'skill' | 'outcome';
  row: number;
  column: number;
  x: number;
  y: number;
};

export type TreeLayout = {
  width: number;
  height: number;
  phases: Array<{ id: string; name: string; order: number; row: number }>;
  nodes: LayoutNode[];
  unlockEdges: Array<{ id: string; fromId: string; toId: string }>;
};

export function layoutSkillTree(
  state: AbilityState,
  treeId: string,
  collapsedPhaseIds: ReadonlySet<string> = new Set()
): TreeLayout;
```

每阶段先按显式并行组、节点名称、节点 ID 稳定排序；列分配顺序固定为 `[2, 1, 3, 0, 4]`，超过五个节点时增加内部子行，不能依赖对象遍历偶然顺序。

- [ ] **Step 4: 把成果作为非解锁节点布局**

`showOnTree` 的成果放在关联节点右下方；未关联节点的成果放在对应树最后一个阶段的成果带。成果只进入 `nodes`，不得进入拓扑排序或 `unlockEdges`。

- [ ] **Step 5: 支持阶段折叠**

折叠阶段仍返回阶段标题，但省略其普通节点和成果；后续阶段重新连续排布。筛选由 UI 决定传入哪些节点，布局函数不得修改领域状态。

- [ ] **Step 6: 运行测试确认 GREEN**

Run: `npx vitest run src/ability/abilityLayout.test.ts`

Expected: all layout tests passed。

- [ ] **Step 7: Commit**

```bash
git add src/ability/abilityLayout.ts src/ability/abilityLayout.test.ts
git commit -m "feat(ability): add deterministic adventure tree layout"
```

### Task 4: 实现统一草案校验与原子应用

**Files:**

- Create: `src/ability/abilityDrafts.test.ts`
- Create: `src/ability/abilityDrafts.ts`

- [ ] **Step 1: 写失败的草案契约测试**

测试一个含两阶段、三节点、一条依赖和两个掌握标准的手动草案：

```ts
const result = applyDraft(emptyState, draft, deterministicIds, '2026-08-02T00:00:00.000Z');
expect(result.trees).toHaveLength(1);
expect(result.phases).toHaveLength(2);
expect(result.nodes).toHaveLength(3);
expect(result.masteryCriteria.every((item) => item.source === 'manual')).toBe(true);
expect(result.dependencies[0].prerequisiteNodeId).toBe(result.nodes[0].id);
```

再断言局部 ID 重复、缺失 phase、缺失 node、循环依赖时抛错，并且原始 `emptyState` 保持深度相等。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npx vitest run src/ability/abilityDrafts.test.ts`

Expected: FAIL，因为草案模块尚不存在。

- [ ] **Step 3: 实现草案校验**

导出：

```ts
export type IdFactory = (kind: string) => string;
export function validateSkillTreeDraft(draft: SkillTreeDraft): void;
export function applyDraft(
  state: AbilityState,
  draft: SkillTreeDraft,
  idFactory: IdFactory,
  now: string
): AbilityState;
```

先完整验证名称、局部 ID、阶段/节点引用、同阶段并行组和草案图无环，再开始生成正式 ID。

- [ ] **Step 4: 实现全有或全无的 ID 映射**

为 tree、phase、node、edge、group、criterion 分别建立 `Map<draftId, formalId>`。先构造完整 `nextState`，最后调用 `validateAbilityState(nextState)`；只有验证成功才返回，任何错误都不能修改输入状态。

- [ ] **Step 5: 保留未来 AI 可复用性**

草案校验不得检查提供者、模型或 API Key。`suggestedTasks` 在 V1 只通过结构校验，不自动写入任务系统；这样未来规划器可以输出同一结构，但 V1 UI 不展示 AI。

- [ ] **Step 6: 运行测试确认 GREEN**

Run: `npx vitest run src/ability/abilityDrafts.test.ts`

Expected: all draft tests passed。

- [ ] **Step 7: Commit**

```bash
git add src/ability/abilityDrafts.ts src/ability/abilityDrafts.test.ts
git commit -m "feat(ability): add atomic skill tree draft pipeline"
```

### Task 5: 实现持久化、损坏恢复与旧结构转换

**Files:**

- Create: `src/ability/abilityStorage.test.ts`
- Create: `src/ability/abilityStorage.ts`

- [ ] **Step 1: 写失败的 v1 往返与损坏快照测试**

断言：

```ts
expect(loadAbilityState(localStorage)).toEqual(createInitialAbilityState());
saveAbilityState(localStorage, populatedState);
expect(loadAbilityState(localStorage)).toEqual(populatedState);
localStorage.setItem(ABILITY_STORAGE_KEY, '{damaged');
expect(loadAbilityState(localStorage)).toEqual(createInitialAbilityState());
expect(Object.keys(localStorage).some((key) => key.startsWith(`${ABILITY_STORAGE_KEY}.corrupt.`))).toBe(true);
```

- [ ] **Step 2: 写失败的旧能力结构转换测试**

使用旧规格中的输入：

```ts
const legacy = {
  career: {
    skills: [
      { id: 'react', name: 'React', level: 5, maxLevel: 10, parent: null, children: ['fullstack'], unlocked: true },
      { id: 'fullstack', name: '全栈开发', level: 0, maxLevel: 10, parent: 'react', children: [], unlocked: false }
    ]
  },
  side: {
    learning: [{ id: 'ml', title: '机器学习课程', progress: 0.6, link: 'https://example.test/ml' }],
    achievements: [{ id: 'bili', platform: 'B站', metric: '粉丝数', history: [{ date: '2026-08-01', value: 1000 }] }]
  }
};
```

期望生成“职业技能”主技能树和“副业学习”副技能树；React 为 `in_progress`，全栈开发依赖 React，机器学习课程为 `in_progress`，B站记录转换为成果且不自动展示在树上。

- [ ] **Step 3: 运行测试确认 RED**

Run: `npx vitest run src/ability/abilityStorage.test.ts`

Expected: FAIL，因为能力仓储尚不存在。

- [ ] **Step 4: 实现 v1 读写与快照校验**

导出：

```ts
export function createInitialAbilityState(): AbilityState;
export function loadAbilityState(storage: StorageLike): AbilityState;
export function saveAbilityState(storage: StorageLike, state: AbilityState): void;
export function migrateLegacyAbilityStore(value: unknown, now: string): AbilityState;
```

`saveAbilityState` 写入前调用 `validateAbilityState`。`loadAbilityState` 对非法 JSON 或非法图先复制到 `${ABILITY_STORAGE_KEY}.corrupt.${Date.now()}`，再删除正式键并返回空状态。

- [ ] **Step 5: 实现旧字段映射**

映射规则固定为：

- `career.skills` → “职业技能”主技能树；`level >= maxLevel` 为 `mastered`，`level > 0` 为 `in_progress`，其余为 `available`。
- `parent` 与 `children` 去重后转换为依赖边；冲突时以可验证、无环的关系为准，非法关系写入损坏备份而不是部分导入。
- `side.learning` → “副业学习”副技能树；`progress >= 1` 为 `mastered`，`progress > 0` 为 `in_progress`。
- `side.achievements` → “副业学习”树成果；成果标题为 `${platform} · ${metric} ${latestValue}`，日期使用最新历史项。
- `career.habits`、`career.competencies` 不属于本能力树 V1，保留原始旧键，不删除旧数据。

如果正式 v1 键不存在，依次检查 `LEGACY_ABILITY_STORAGE_KEYS`；转换成功后写入 v1，但保留旧键作为可恢复来源。

- [ ] **Step 6: 模拟配额错误**

使用一个 `setItem` 抛出 `QuotaExceededError` 的 `StorageLike`，断言 `saveAbilityState` 抛出“能力数据保存失败，原数据仍然保留”，且先前正式键内容不变。实现时先读取旧字符串，写入失败后不得删除或覆盖旧值。

- [ ] **Step 7: 运行测试确认 GREEN**

Run: `npx vitest run src/ability/abilityStorage.test.ts`

Expected: all storage and migration tests passed。

- [ ] **Step 8: Commit**

```bash
git add src/ability/abilityStorage.ts src/ability/abilityStorage.test.ts
git commit -m "feat(ability): persist and migrate skill tree data"
```

### Task 6: 实现领域动作与持久化 Hook

**Files:**

- Create: `src/ability/abilityEngine.test.ts`
- Create: `src/ability/abilityEngine.ts`
- Create: `src/ability/useAbilitySystem.test.tsx`
- Create: `src/ability/useAbilitySystem.ts`

- [ ] **Step 1: 写失败的领域动作测试**

覆盖以下结果：

```ts
expect(startNode(state, availableNode.id, now).nodes[0].progress).toBe('in_progress');
expect(() => masterNode(state, nodeWithUncheckedCriteria.id, '', now)).toThrow('请填写提前掌握说明');
expect(masterNode(state, nodeWithUncheckedCriteria.id, '已有项目证明', now).nodes[0].progress).toBe('mastered');
expect(demoteNode(state, masteredRoot.id, now).nodes.find((n) => n.id === child.id)?.progress).toBe('in_progress');
expect(unlinkTask(state, link.id).taskLinks).toEqual([]);
expect(removeOutcome(state, outcome.id).nodes).toEqual(state.nodes);
```

再测试树置顶/排序/归档/恢复、阶段排序、节点归档、依赖替换、并行组、标准增删勾选、成果树上展示。

- [ ] **Step 2: 运行领域测试确认 RED**

Run: `npx vitest run src/ability/abilityEngine.test.ts`

Expected: FAIL，因为领域动作尚不存在。

- [ ] **Step 3: 实现原子领域动作**

在 `abilityEngine.ts` 导出：

```ts
export function updateTree(state: AbilityState, treeId: string, patch: Partial<Pick<SkillTree, 'name' | 'description' | 'role'>>, now: string): AbilityState;
export function archiveTree(state: AbilityState, treeId: string, now: string): AbilityState;
export function restoreTree(state: AbilityState, treeId: string, now: string): AbilityState;
export function reorderFocusedTrees(state: AbilityState, orderedTreeIds: string[], now: string): AbilityState;
export function addPhase(state: AbilityState, input: Pick<LearningPhase, 'skillTreeId' | 'name' | 'description'>, id: string): AbilityState;
export function updatePhase(state: AbilityState, phaseId: string, patch: Pick<LearningPhase, 'name' | 'description'>, now: string): AbilityState;
export function reorderPhases(state: AbilityState, treeId: string, orderedPhaseIds: string[], now: string): AbilityState;
export function addNode(state: AbilityState, input: Omit<SkillNode, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>, id: string, now: string): AbilityState;
export function updateNode(state: AbilityState, nodeId: string, patch: Pick<SkillNode, 'name' | 'description' | 'phaseId'>, now: string): AbilityState;
export function archiveNode(state: AbilityState, nodeId: string, now: string): AbilityState;
export function restoreNode(state: AbilityState, nodeId: string, now: string): AbilityState;
export function removeEmptyNode(state: AbilityState, nodeId: string): AbilityState;
export function replaceNodeDependencies(state: AbilityState, nodeId: string, prerequisiteNodeIds: string[], ids: string[]): AbilityState;
export function upsertParallelGroup(state: AbilityState, group: ParallelGroup): AbilityState;
export function removeParallelGroup(state: AbilityState, groupId: string): AbilityState;
export function addCriterion(state: AbilityState, nodeId: string, description: string, id: string): AbilityState;
export function updateCriterion(state: AbilityState, criterionId: string, description: string): AbilityState;
export function toggleCriterion(state: AbilityState, criterionId: string): AbilityState;
export function removeCriterion(state: AbilityState, criterionId: string): AbilityState;
export function startNode(state: AbilityState, nodeId: string, now: string): AbilityState;
export function masterNode(state: AbilityState, nodeId: string, masteryNote: string, now: string): AbilityState;
export function demoteNode(state: AbilityState, nodeId: string, now: string): AbilityState;
export function linkTask(state: AbilityState, nodeId: string, taskId: string, id: string): AbilityState;
export function unlinkTask(state: AbilityState, linkId: string): AbilityState;
export function addOutcome(state: AbilityState, input: Omit<SkillOutcome, 'id' | 'createdAt' | 'updatedAt'>, id: string, now: string): AbilityState;
export function updateOutcome(state: AbilityState, outcomeId: string, patch: Pick<SkillOutcome, 'title' | 'description' | 'occurredOn' | 'skillNodeId'>, now: string): AbilityState;
export function setOutcomeTreeVisibility(state: AbilityState, outcomeId: string, showOnTree: boolean, now: string): AbilityState;
export function removeOutcome(state: AbilityState, outcomeId: string): AbilityState;
```

每个函数构造新对象，调用 `validateAbilityState` 后返回；不得就地修改数组。

- [ ] **Step 4: 实现删除与归档保护**

导出 `getNodeRemovalMode(state, nodeId): 'delete' | 'archive'`。只有没有子节点、任务链接、掌握标准和成果的空节点可以直接删除；其他节点使用归档。树的日常删除操作始终转为归档。

- [ ] **Step 5: 运行领域测试确认 GREEN**

Run: `npx vitest run src/ability/abilityEngine.test.ts`

Expected: all engine tests passed。

- [ ] **Step 6: 写失败的 Hook 测试**

使用 `renderHook` 测试：应用手动草案、添加阶段/节点、开始节点、确认掌握、关联任务、添加成果、置顶、归档与恢复。每个动作后断言 `ABILITY_STORAGE_KEY` 中的数据同步更新。

再使用抛出配额错误的存储适配器断言：

```ts
expect(result.current.state).toEqual(before);
expect(result.current.persistenceError).toBe('能力数据保存失败，原数据仍然保留');
```

- [ ] **Step 7: 实现 `useAbilitySystem`**

公开接口：

```ts
export function useAbilitySystem(options: { storage?: StorageLike; now?: () => string; idFactory?: IdFactory } = {}) {
  return {
    state,
    persistenceError,
    clearPersistenceError,
    applyTreeDraft,
    updateTree,
    archiveTree,
    restoreTree,
    reorderFocusedTrees,
    addPhase,
    updatePhase,
    reorderPhases,
    addNode,
    updateNode,
    archiveNode,
    restoreNode,
    removeEmptyNode,
    replaceNodeDependencies,
    upsertParallelGroup,
    removeParallelGroup,
    addCriterion,
    updateCriterion,
    toggleCriterion,
    removeCriterion,
    startNode,
    masterNode,
    demoteNode,
    linkTask,
    unlinkTask,
    addOutcome,
    updateOutcome,
    setOutcomeTreeVisibility,
    removeOutcome,
    visitTree
  };
}
```

所有动作通过单一 `commit(transform)` 执行：先计算并验证 `next`，保存成功后才 `setState(next)`；保存失败保留旧内存状态并设置错误。

- [ ] **Step 8: 运行 Hook 测试确认 GREEN**

Run: `npx vitest run src/ability/useAbilitySystem.test.tsx`

Expected: all hook tests passed。

- [ ] **Step 9: Commit**

```bash
git add src/ability/abilityEngine.ts src/ability/abilityEngine.test.ts src/ability/useAbilitySystem.ts src/ability/useAbilitySystem.test.tsx
git commit -m "feat(ability): add atomic skill tree actions"
```

### Task 7: 构建技能树舞台与节点详情

**Files:**

- Create: `src/ability/components/AbilityTreeStage.tsx`
- Create: `src/ability/components/AbilityNodePanel.tsx`
- Create: `src/ability/AbilityModule.css`
- Create: `src/ability/AbilityModule.test.tsx`

- [ ] **Step 1: 写失败的树舞台测试**

渲染一棵含已掌握、成长中、可开始、锁定节点和树上成果的技能树，断言：

```ts
expect(screen.getByRole('tree', { name: 'React 全栈技能树' })).toBeInTheDocument();
expect(screen.getByRole('treeitem', { name: /HTML 基础 已掌握/ })).toBeInTheDocument();
expect(screen.getByRole('treeitem', { name: /React 状态管理 成长中/ })).toBeInTheDocument();
expect(screen.getByRole('treeitem', { name: /部署网站 锁定/ })).toHaveAttribute('aria-disabled', 'true');
expect(screen.getByRole('button', { name: /个人网站 成果/ })).toBeInTheDocument();
```

点击节点后，详情面板必须显示节点名称、说明、状态、掌握标准、任务和成果。

- [ ] **Step 2: 运行组件测试确认 RED**

Run: `npx vitest run src/ability/AbilityModule.test.tsx`

Expected: FAIL，因为组件尚不存在。

- [ ] **Step 3: 实现 `AbilityTreeStage`**

组件属性：

```ts
type AbilityTreeStageProps = {
  state: AbilityState;
  tree: SkillTree;
  selectedNodeId: string | null;
  collapsedPhaseIds: ReadonlySet<string>;
  stateFilter: TreeNodeFilter;
  onSelectNode: (nodeId: string) => void;
  onSelectOutcome: (outcomeId: string) => void;
  onTogglePhase: (phaseId: string) => void;
};
```

桌面端根据 `layoutSkillTree` 的行列渲染固定阶段网格，并用只读 SVG 画依赖线；节点本身必须是可聚焦按钮。锁定节点可查看详情但不能开始。筛选只影响展示，不改数据。

- [ ] **Step 4: 实现 `AbilityNodePanel`**

组件接收节点、派生状态、前置警告、标准、已关联任务和成果，并暴露 `onStart`、`onToggleCriterion`、`onConfirmMastery`、`onDemote`、`onLinkTask`、`onUnlinkTask`、`onAddOutcome`、`onToggleOutcomeVisibility`。

提前掌握时显示必填说明输入框；标准全部勾选时仍必须点击“确认已掌握”，不得自动改变节点状态。

- [ ] **Step 5: 添加状态视觉与移动端文档流**

在 `AbilityModule.css` 使用项目变量和硬边风格：2px 黑边、4px 实体阴影、金色主操作、绿色已掌握、蓝色成长中、灰色锁定。不得使用玻璃拟态或大面积渐变。

在 `@media (max-width: 680px)` 下隐藏依赖 SVG，把阶段改为纵向卡片流，把详情面板改为固定底部抽屉；DOM 顺序必须保持阶段标题 → 节点 → 详情，键盘可完整访问。

- [ ] **Step 6: 验证组件行为**

Run: `npx vitest run src/ability/AbilityModule.test.tsx`

Expected: 状态节点、详情选择、折叠阶段、提前掌握说明和成果节点测试通过。

- [ ] **Step 7: Commit**

```bash
git add src/ability/components/AbilityTreeStage.tsx src/ability/components/AbilityNodePanel.tsx src/ability/AbilityModule.css src/ability/AbilityModule.test.tsx
git commit -m "feat(ability): render skill tree stage and node details"
```

### Task 8: 构建技能库与完整手动编辑流程

**Files:**

- Create: `src/ability/components/SkillLibrary.tsx`
- Create: `src/ability/components/AbilityForms.tsx`
- Modify: `src/ability/AbilityModule.test.tsx`
- Create: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/AbilityModule.css`

- [ ] **Step 1: 写失败的首页与手动编辑测试**

覆盖以下用户流程：

1. 空状态点击“创建第一棵技能树”，填写名称、说明和主技能角色。
2. 添加“基础认知”阶段，再添加“HTML 基础”根节点。
3. 添加“React 基础”节点，并选择 HTML 为前置节点。
4. 新建同阶段并行组，选择两个节点。
5. 搜索 React、按副技能筛选、切换最近更新/用户排序/名称排序。
6. 置顶两棵树并调整顺序，归档后在已归档筛选中恢复。
7. 从现有任务列表关联任务，解除关系后任务系统中的任务仍存在。
8. 新增“搭建个人网站”成果并开启“展示在技能树上”。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npx vitest run src/ability/AbilityModule.test.tsx`

Expected: FAIL，因为首页编排和表单尚未实现。

- [ ] **Step 3: 实现 `SkillLibrary`**

组件属性：

```ts
type SkillLibraryProps = {
  state: AbilityState;
  currentTreeId: string | null;
  onOpenTree: (treeId: string) => void;
  onCreateTree: () => void;
  onArchiveTree: (treeId: string) => void;
  onRestoreTree: (treeId: string) => void;
  onChangeFocus: (treeId: string, focused: boolean) => void;
  onReorderFocused: (orderedIds: string[]) => void;
};
```

组件内部维护 `query`、`roleFilter` 和 `sort`。搜索同时匹配树名与节点名；归档只有选择“已归档”时出现。卡片显示角色、已掌握/总节点、当前阶段和最新成果。

- [ ] **Step 4: 实现手动表单**

`AbilityForms.tsx` 导出以下受控对话框：

```ts
export function TreeFormDialog(props: TreeFormDialogProps): JSX.Element | null;
export function PhaseFormDialog(props: PhaseFormDialogProps): JSX.Element | null;
export function NodeFormDialog(props: NodeFormDialogProps): JSX.Element | null;
export function ParallelGroupDialog(props: ParallelGroupDialogProps): JSX.Element | null;
export function OutcomeFormDialog(props: OutcomeFormDialogProps): JSX.Element | null;
```

树表单通过 `SkillTreeDraft` 创建；节点表单必须选择阶段，可选择多个同树前置节点；并行组只能显示同阶段节点；成果名称和日期必填。保存错误显示在对话框内，不关闭用户已填写内容。

- [ ] **Step 5: 实现 `AbilityModule` 首页编排**

`AbilityModule` 调用 `useAbilitySystem()` 和 `useTaskSystem()`。只向节点详情传递未归档任务：

```ts
const availableTasks = taskSystem.state.tasks.filter((task) => task.status !== 'archived');
```

页面顺序固定为：标题/操作栏 → 重点树快速切换 → 当前树舞台与右侧详情 → 完整技能库。不存在树时只显示手动创建空状态；不得显示 AI 按钮。

- [ ] **Step 6: 实现大型树控制**

在模块内维护 `collapsedPhaseIds` 和 `stateFilter`，提供“全部、当前阶段、成长中、未解锁”筛选。“当前阶段”定义为按 `order` 排序后第一个仍含非掌握节点的阶段；全部掌握时使用最后阶段。搜索命中节点时切换到所属树、清除对应阶段折叠并选中该节点。

- [ ] **Step 7: 验证首页与编辑流程**

Run: `npx vitest run src/ability/AbilityModule.test.tsx`

Expected: 创建、阶段、节点、依赖、并行组、搜索、筛选、置顶、归档、任务关系和成果测试全部通过。

- [ ] **Step 8: Commit**

```bash
git add src/ability/components/SkillLibrary.tsx src/ability/components/AbilityForms.tsx src/ability/AbilityModule.tsx src/ability/AbilityModule.css src/ability/AbilityModule.test.tsx
git commit -m "feat(ability): add manual skill tree management"
```

### Task 9: 接入 URL 与 Dice Life 全局导航

**Files:**

- Create: `src/ability/abilityRoute.test.ts`
- Create: `src/ability/abilityRoute.ts`
- Create: `src/ability/AppAbilityIntegration.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/ability/AbilityModule.tsx`

- [ ] **Step 1: 写失败的路由单元测试**

断言：

```ts
expect(parseAbilityPath('/ability')).toEqual({ kind: 'index' });
expect(parseAbilityPath('/ability/trees/react')).toEqual({ kind: 'tree', treeId: 'react' });
expect(parseAbilityPath('/ability/trees/react/extra')).toEqual({ kind: 'invalid' });
expect(resolveAbilityTreeId(state, { kind: 'tree', treeId: 'missing' })).toEqual({ treeId: defaultTree.id, notice: '技能树不存在，已返回能力首页' });
```

- [ ] **Step 2: 实现轻量 History API 适配器**

在 `abilityRoute.ts` 导出：

```ts
export type AbilityRoute = { kind: 'index' } | { kind: 'tree'; treeId: string } | { kind: 'invalid' };
export function parseAbilityPath(pathname: string): AbilityRoute;
export function abilityTreePath(treeId: string): string;
export function resolveAbilityTreeId(state: AbilityState, route: AbilityRoute): { treeId: string | null; notice: string };
export function pushAbilityTree(treeId: string): void;
export function replaceAbilityIndex(): void;
```

树 ID 使用 `encodeURIComponent`/`decodeURIComponent`。不得添加 `react-router-dom`。

- [ ] **Step 3: 写失败的 App 集成测试**

测试：

- 点击侧栏“能力属性”后出现 `能力技能树` 标题，而不是“模块正在构建中”。
- 创建两棵树并点击第二棵后，`window.location.pathname` 为 `/ability/trees/<id>`。
- 直接以 `/ability/trees/<id>` 渲染时打开对应树。
- 非法 ID 返回默认树并显示一次提示。
- 点击财富和任务仍分别显示“净资产”和“任务中心”。

- [ ] **Step 4: 用真实模块替换能力占位页**

在 `App.tsx` 导入：

```ts
import { AbilityModule } from './ability/AbilityModule';
```

把主内容分支改为：

```tsx
{activeView === 'finance' ? (
  <FinanceContent />
) : activeView === 'character' ? (
  <CharacterStatusView />
) : activeView === 'quests' ? (
  <TaskBoard />
) : activeView === 'ability' ? (
  <AbilityModule />
) : (
  <ModuleView view={activeView} />
)}
```

实际修改时保留当前内联财富 JSX，不需要为满足示例额外抽取 `FinanceContent`。

- [ ] **Step 5: 同步全局导航与浏览器回退**

侧栏进入能力模块时执行 `history.pushState({}, '', '/ability')`。`App` 监听 `popstate`：路径以 `/ability` 开头时切到 ability；离开能力路径时保持用户显式选择的其他模块。卸载监听器，避免重复注册。

`activeView` 的初始值必须读取当前路径：

```ts
const [activeView, setActiveView] = useState<MainView>(() =>
  window.location.pathname.startsWith('/ability') ? 'ability' : 'finance'
);
```

`AbilityModule` 在当前树变化时调用 `pushAbilityTree`，首次默认树使用 `replaceState`，避免把同一入口重复压入历史。

- [ ] **Step 6: 更新现有 App 断言并运行集成测试**

Run: `npx vitest run src/ability/abilityRoute.test.ts src/ability/AppAbilityIntegration.test.tsx src/App.test.tsx`

Expected: 路由与能力集成通过，同时现有 9 个 App 测试无回归。

- [ ] **Step 7: Commit**

```bash
git add src/ability/abilityRoute.ts src/ability/abilityRoute.test.ts src/ability/AppAbilityIntegration.test.tsx src/ability/AbilityModule.tsx src/App.tsx src/App.test.tsx
git commit -m "feat(ability): connect skill trees to app navigation"
```

### Task 10: 完整回归、无障碍和交付检查

**Files:**

- Verify: `src/ability/**`
- Verify: `src/tasks/**`
- Verify: `src/App.tsx`
- Verify: `src/styles.css`

- [ ] **Step 1: 运行能力模块测试**

Run: `npx vitest run src/ability`

Expected: 图、布局、草案、存储、引擎、hook、路由、组件与 App 能力集成全部通过。

- [ ] **Step 2: 运行任务系统回归**

Run: `npx vitest run src/tasks`

Expected: 任务领域、存储、hook、任务面板与 App 任务集成全部通过；能力任务链接没有修改或删除任务。

- [ ] **Step 3: 运行完整测试**

Run: `npm test`

Expected: zero failed tests。

- [ ] **Step 4: 运行生产构建**

Run: `npm run build`

Expected: TypeScript 检查与 Vite 构建均以 exit code 0 完成。

- [ ] **Step 5: 检查 V1 范围**

Run: `rg -n "OpenAI|Anthropic|Gemini|API Key|生成技能树|Lv\.1|Lv1" src/ability package.json`

Expected: 只允许 `AbilityPlanner` 类型注释中出现供应商无关的 AI 扩展说明；UI 与依赖清单不得出现厂商 SDK、API 设置、AI 入口或节点数字等级。

- [ ] **Step 6: 检查键盘与移动端**

启动 `npm run dev -- --port 4173`，在 1280px 和 390px 宽度验证：

- Tab 可依次到达技能库、阶段折叠、每个可见节点和详情操作。
- Enter/Space 可选择节点与提交表单。
- 390px 下没有强制横向画布，阶段按纵向卡片显示，详情底部抽屉可关闭。
- 锁定、成长中、已掌握不只依赖颜色，均有可读文字。
- `prefers-reduced-motion` 下没有必要动画。

Expected: 所有检查通过，无内容溢出视口。

- [ ] **Step 7: 检查补丁卫生**

Run: `git diff --check && git status --short`

Expected: 无空白错误，只包含能力模块及明确的共享接口/App 集成文件。

- [ ] **Step 8: 提交最终修正**

```bash
git add src/ability src/lib/storage.ts src/tasks/taskStorage.ts src/App.tsx src/App.test.tsx
git commit -m "test(ability): verify skill tree v1 delivery"
```

如果没有最终修正，不创建空提交。

## 规格覆盖检查

- 无限技能树、角色、置顶、排序、归档与恢复：Task 6、Task 8。
- 首屏重点树舞台和完整技能库：Task 7、Task 8。
- 固定自动布局、阶段、并行组与大型树折叠：Task 3、Task 8。
- 依赖校验、四种状态、自动解锁与撤销掌握提醒：Task 2、Task 6。
- 用户掌握标准与最终人工确认：Task 6、Task 7。
- 复用现有任务并只保存关系：Task 6、Task 8、Task 10。
- 轻量成果与树上展示：Task 3、Task 6、Task 7、Task 8。
- 本地持久化、错误恢复、旧数据转换：Task 1、Task 5、Task 6。
- `/ability` 与单树 URL：Task 9。
- 移动端非画布体验和无障碍：Task 7、Task 10。
- 统一草案与未来 `AbilityPlanner` 接口：Task 1、Task 4。
- V1 不含 AI、API 配置、厂商 SDK 和节点数值等级：Task 1、Task 10。
