# Dice Life 能力模块 V3 精细化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把能力模块收敛为“按阶段推进的技能成长系统”，并在不丢失旧数据的前提下增加节点内嵌学习资源库、浏览/编辑模式和真实阶段列。

**Architecture:** 先将持久化状态从 schema v1 无损迁移到 v2，再用独立的阶段选择器、可见性选择器和资源领域函数承载业务规则。UI 保留 React Flow 专业编辑器骨架，但把结构操作限定在编辑模式，画布、线性视图和详情面板共用同一份派生数据，防止筛选残留。

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, React Flow (`@xyflow/react`), Playwright, axe-core, localStorage schema migration.

---

## 范围、文件责任与依赖检查

### 修改/新增文件

- `src/ability/types.ts`：定义 schema v2、阶段元数据、必修标记、学习资源与多对多关联。
- `src/ability/abilityStorage.ts`：兼容读取 v1/v2，将 v1 原地迁移为 v2，保留 `masteryNote` 和 `taskLinks` 旧数据。
- `src/ability/abilityGraph.ts`：验证新引用，计算阶段完成度、当前阶段和下一步。
- `src/ability/abilityView.ts`（新增）：统一计算可见节点、边、并行组、成果和选中状态。
- `src/ability/abilityResources.ts`（新增）：URL 规范化、域名/类型推断与去重规则。
- `src/ability/abilityEngine.ts`：扩展阶段/节点 CRUD，加入资源库与关联 CRUD，收紧掌握规则。
- `src/ability/useAbilitySystem.ts`：向 UI 暴露新的阶段、资源和关联操作。
- `src/ability/abilityCanvasLayout.ts`：输出真实阶段列、空阶段和按 16px 网格对齐的节点坐标。
- `src/ability/abilityCanvasGeometry.ts`：同高度串行边输出完全水平直线。
- `src/ability/components/AbilityTreeStage.tsx`：阶段列、空阶段 CTA、画布内加阶段、浏览/编辑权限。
- `src/ability/components/AbilityNodePanel.tsx`：删除判断依据/任务，重排详情，接入节点资源库。
- `src/ability/components/AbilityResourceSection.tsx`（新增）：节点内资源列表、内联收藏、复用、编辑、解除关联与删除。
- `src/ability/components/SkillLibrary.tsx`：改为画布上方的紧凑横向技能库。
- `src/ability/components/AbilityForms.tsx`：阶段编辑字段和资源小型内联表单。
- `src/ability/AbilityModule.tsx`：新信息架构、三筛选、浏览/编辑模式、紧凑线性路线。
- `src/ability/AbilityModule.css`：阶段列、紧凑技能库、资源区、线性视图和 390px 底部面板样式。
- 对应 `*.test.ts(x)` 与 `src/ability/e2e/ability-canvas.spec.ts`：先写回归测试再实现。

### 风险和处理决策

1. **旧快照被判定损坏：** 不更换 `dice-life.ability.v1` storage key；解析器同时接受 v1/v2，v1 只做补字段迁移，不丢弃任务关联和旧掌握说明。
2. **阶段列与树深度冲突：** 阶段是外层水平区域，阶段内依赖深度使用子列；不强制把每个深度映射成新阶段。
3. **删除任务 UI 导致数据丢失：** 仅停止显示和创建，暂不删除类型、持久化数组和旧引擎方法。
4. **资源重复与误删：** 资源对规范化 URL 全局唯一；“从节点移除”仅删关联；仍被其他节点引用时禁止删原件。
5. **筛选后 React Flow 残留：** 节点、边、成果、并行组和选中详情必须从同一个 `AbilityVisibleGraph` 派生，不允许组件各自过滤。
6. **移动端复杂编辑：** 390px 默认线性视图，支持成长/资源/成果操作；结构编辑只提示使用桌面端。
7. **全局 API 兼容：** `AbilityModule` 暂保留现有可选 `taskStorage` prop 但不再消费，避免 App 共享接口立即破坏。

---

### Task 1: schema v2 无损迁移

**Files:**
- Modify: `src/ability/types.ts`
- Modify: `src/ability/abilityStorage.ts`
- Modify: `src/ability/abilityGraph.ts`
- Test: `src/ability/abilityStorage.test.ts`
- Test: `src/ability/abilityGraph.test.ts`

- [ ] **Step 1: 先写 v1 迁移和 v2 引用验证的失败测试**

```ts
it('migrates schema v1 without dropping legacy mastery notes or task links', () => {
  const migrated = parseAbilityState(JSON.stringify(v1Snapshot))
  expect(migrated.schemaVersion).toBe(2)
  expect(migrated.phases[0]).toMatchObject({ requiredNodePolicy: 'all_required' })
  expect(migrated.nodes[0].requiredForPhase).toBe(true)
  expect(migrated.taskLinks).toEqual(v1Snapshot.taskLinks)
  expect(migrated.resources).toEqual([])
  expect(migrated.resourceLinks).toEqual([])
})

it('rejects a resource link that references a missing resource', () => {
  expect(() => validateAbilityState(invalidResourceState)).toThrow(/resource/i)
})
```

- [ ] **Step 2: 运行定向测试，确认因 schema v2 尚未存在而失败**

Run: `npm test -- --run src/ability/abilityStorage.test.ts src/ability/abilityGraph.test.ts`
Expected: FAIL，错误包含 `resources`/`schemaVersion` 字段缺失。

- [ ] **Step 3: 定义 v2 数据边界**

```ts
export type ResourceType = 'video' | 'article' | 'document' | 'course' | 'tool' | 'other'
export type ResourceSource = 'manual' | 'ai'

export interface LearningPhase {
  id: string
  abilityTreeId: string
  name: string
  description: string
  estimatedDuration: string
  plannedStartOn?: string
  plannedEndOn?: string
  requiredNodePolicy: 'all_required'
  order: number
}

export interface SkillResource {
  id: string
  url: string
  normalizedUrl: string
  title: string
  type: ResourceType
  sourceDomain: string
  note: string
  source: ResourceSource
  aiReason?: string
  aiApplicableNode?: string
  aiDifficulty?: string
  aiConfidence?: number
  createdAt: string
  updatedAt: string
}

export interface SkillResourceLink {
  id: string
  nodeId: string
  resourceId: string
  createdAt: string
}
```

- [ ] **Step 4: 实现 `migrateV1ToV2` 并使解析器接受两个版本**

```ts
function migrateV1ToV2(state: AbilityStateV1): AbilityState {
  return {
    ...state,
    schemaVersion: 2,
    phases: state.phases.map((phase) => ({
      ...phase,
      estimatedDuration: '',
      requiredNodePolicy: 'all_required' as const,
    })),
    nodes: state.nodes.map((node) => ({ ...node, requiredForPhase: true })),
    resources: [],
    resourceLinks: [],
  }
}
```

- [ ] **Step 5: 补齐新数组的唯一性和引用验证，再运行定向测试**

Run: `npm test -- --run src/ability/abilityStorage.test.ts src/ability/abilityGraph.test.ts`
Expected: PASS。

- [ ] **Step 6: 提交迁移基础**

```bash
git add src/ability/types.ts src/ability/abilityStorage.ts src/ability/abilityGraph.ts src/ability/abilityStorage.test.ts src/ability/abilityGraph.test.ts
git commit -m "feat(ability): migrate ability data to schema v2"
```

### Task 2: 阶段进度与统一可见图

**Files:**
- Create: `src/ability/abilityView.ts`
- Create: `src/ability/abilityView.test.ts`
- Modify: `src/ability/abilityGraph.ts`
- Modify: `src/ability/types.ts`
- Test: `src/ability/abilityGraph.test.ts`

- [ ] **Step 1: 写阶段完成、“下一步”和残留清理的失败测试**

```ts
it('does not let optional nodes block phase completion', () => {
  expect(getPhaseProgress(state, 'phase-1')).toEqual({ mastered: 1, required: 1, complete: true })
})

it('derives nodes, edges, groups and outcomes from one visible id set', () => {
  const visible = buildAbilityVisibleGraph(state, 'tree-1', 'mastered')
  expect(visible.nodes.map(({ id }) => id)).toEqual(['mastered-node'])
  expect(visible.edges).toEqual([])
  expect(visible.groups).toEqual([])
  expect(visible.outcomes.every((item) => item.nodeId === 'mastered-node')).toBe(true)
})
```

- [ ] **Step 2: 运行定向测试并确认失败**

Run: `npm test -- --run src/ability/abilityGraph.test.ts src/ability/abilityView.test.ts`
Expected: FAIL with missing `getPhaseProgress` / `buildAbilityVisibleGraph`.

- [ ] **Step 3: 收敛筛选并实现阶段选择器**

```ts
export type TreeNodeFilter = 'all' | 'next' | 'mastered'

export function getPhaseProgress(state: AbilityState, phaseId: string) {
  const required = state.nodes.filter((node) => node.learningPhaseId === phaseId && node.requiredForPhase && !node.archived)
  const mastered = required.filter((node) => node.progress === 'mastered')
  return { mastered: mastered.length, required: required.length, complete: required.length === 0 || mastered.length === required.length }
}
```

- [ ] **Step 4: 实现 `buildAbilityVisibleGraph` 一次派生所有显示对象**

```ts
export interface AbilityVisibleGraph {
  nodes: SkillNode[]
  edges: SkillDependency[]
  groups: ParallelGroup[]
  outcomes: AbilityOutcome[]
  visibleNodeIds: Set<string>
}

export function buildAbilityVisibleGraph(state: AbilityState, treeId: string, filter: TreeNodeFilter): AbilityVisibleGraph {
  const nodes = selectVisibleNodes(state, treeId, filter)
  const visibleNodeIds = new Set(nodes.map((node) => node.id))
  return {
    nodes,
    visibleNodeIds,
    edges: state.dependencies.filter((edge) => visibleNodeIds.has(edge.fromNodeId) && visibleNodeIds.has(edge.toNodeId)),
    groups: state.parallelGroups.filter((group) => group.nodeIds.some((id) => visibleNodeIds.has(id))),
    outcomes: state.outcomes.filter((outcome) => visibleNodeIds.has(outcome.nodeId)),
  }
}
```

- [ ] **Step 5: 测试下一阶段差距、空阶段和选中节点可见性**

Run: `npm test -- --run src/ability/abilityGraph.test.ts src/ability/abilityView.test.ts`
Expected: PASS。

- [ ] **Step 6: 提交选择器**

```bash
git add src/ability/types.ts src/ability/abilityGraph.ts src/ability/abilityGraph.test.ts src/ability/abilityView.ts src/ability/abilityView.test.ts
git commit -m "feat(ability): derive stage progress and visible graph"
```

### Task 3: 全局资源库与节点关联领域层

**Files:**
- Create: `src/ability/abilityResources.ts`
- Create: `src/ability/abilityResources.test.ts`
- Modify: `src/ability/abilityEngine.ts`
- Modify: `src/ability/useAbilitySystem.ts`
- Test: `src/ability/abilityEngine.test.ts`
- Test: `src/ability/useAbilitySystem.test.tsx`

- [ ] **Step 1: 先写 URL 规范化、去重复用和删除语义测试**

```ts
expect(normalizeResourceUrl('HTTPS://Example.com/guide/?utm_source=x')).toBe('https://example.com/guide')
expect(() => normalizeResourceUrl('file:///tmp/a')).toThrow('仅支持 HTTP / HTTPS')

const linked = addOrLinkResource(state, 'node-2', {
  url: 'https://example.com/guide/', title: 'Guide', type: 'article', note: '',
}, ids, now)
expect(linked.resources).toHaveLength(1)
expect(linked.resourceLinks).toHaveLength(2)
expect(() => deleteResource(linked, linked.resources[0].id)).toThrow(/仍关联/)
```

- [ ] **Step 2: 运行测试，确认新 API 不存在**

Run: `npm test -- --run src/ability/abilityResources.test.ts src/ability/abilityEngine.test.ts src/ability/useAbilitySystem.test.tsx`
Expected: FAIL with missing resource functions.

- [ ] **Step 3: 实现保守的 URL 规范化**

```ts
const TRACKING_KEYS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'])

export function normalizeResourceUrl(value: string) {
  const url = new URL(value.trim())
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('仅支持 HTTP / HTTPS 链接')
  url.hostname = url.hostname.toLowerCase()
  for (const key of [...url.searchParams.keys()]) if (TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key)
  url.hash = ''
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString().replace(/\/$/, '')
}
```

- [ ] **Step 4: 实现资源和关联 CRUD，保持原件/关联分离**

```ts
export function addOrLinkResource(state, nodeId, input, ids, now) {
  const normalizedUrl = normalizeResourceUrl(input.url)
  const existing = state.resources.find((item) => item.normalizedUrl === normalizedUrl)
  const resource = existing ?? createResource(input, normalizedUrl, ids.resource(), now)
  if (state.resourceLinks.some((link) => link.nodeId === nodeId && link.resourceId === resource.id)) return state
  return {
    ...state,
    resources: existing ? state.resources : [...state.resources, resource],
    resourceLinks: [...state.resourceLinks, { id: ids.link(), nodeId, resourceId: resource.id, createdAt: now }],
  }
}
```

- [ ] **Step 5: 暴露 hook 操作并验证 undo/持久化不回退**

Run: `npm test -- --run src/ability/abilityResources.test.ts src/ability/abilityEngine.test.ts src/ability/useAbilitySystem.test.tsx`
Expected: PASS。

- [ ] **Step 6: 提交资源领域层**

```bash
git add src/ability/abilityResources.ts src/ability/abilityResources.test.ts src/ability/abilityEngine.ts src/ability/abilityEngine.test.ts src/ability/useAbilitySystem.ts src/ability/useAbilitySystem.test.tsx
git commit -m "feat(ability): add reusable learning resource library"
```

### Task 4: 节点详情和掌握闭环

**Files:**
- Create: `src/ability/components/AbilityResourceSection.tsx`
- Modify: `src/ability/components/AbilityNodePanel.tsx`
- Modify: `src/ability/components/AbilityForms.tsx`
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/abilityEngine.ts`
- Test: `src/ability/AbilityModule.test.tsx`
- Test: `src/ability/abilityEngine.test.ts`

- [ ] **Step 1: 写详情顺序、无任务/判断文本框、资源收藏和掌握门槛测试**

```tsx
render(<AbilityModule initialAbilityState={state} />)
await user.click(screen.getByRole('button', { name: '查看节点 类型体基础' }))
expect(screen.queryByLabelText('掌握判断依据')).not.toBeInTheDocument()
expect(screen.queryByText('关联任务')).not.toBeInTheDocument()
expect(sectionTitles()).toEqual(['掌握标准', '学习资源', '真实成果'])

await user.click(screen.getByRole('button', { name: '收藏资源' }))
await user.type(screen.getByLabelText('链接'), 'https://example.com/course')
await user.type(screen.getByLabelText('标题'), 'Course')
await user.click(screen.getByRole('button', { name: '保存资源' }))
expect(screen.getByRole('link', { name: 'Course' })).toHaveAttribute('target', '_blank')
```

- [ ] **Step 2: 运行测试并确认旧详情结构导致失败**

Run: `npm test -- --run src/ability/AbilityModule.test.tsx src/ability/abilityEngine.test.ts`
Expected: FAIL，旧任务区和 mastery note 仍存在。

- [ ] **Step 3: 将掌握规则收敛为标准或成果**

```ts
export function canMasterNode(state: AbilityState, nodeId: string) {
  const criteria = state.masteryCriteria.filter((item) => item.nodeId === nodeId)
  const criteriaSatisfied = criteria.length > 0 && criteria.every((item) => item.satisfied)
  const hasOutcome = state.outcomes.some((item) => item.nodeId === nodeId)
  return criteriaSatisfied || hasOutcome
}

export function masterNode(state: AbilityState, nodeId: string, now: string) {
  if (!canMasterNode(state, nodeId)) throw new Error('请先添加掌握标准或记录一项成果')
  return updateNodeProgress(state, nodeId, 'mastered', now)
}
```

- [ ] **Step 4: 实现资源语义列表和两种收藏入口**

```tsx
<section aria-labelledby={`resource-heading-${node.id}`}>
  <h3 id={`resource-heading-${node.id}`}>学习资源 <span>{resources.length}</span></h3>
  <button type="button" onClick={() => setComposer('new')}>＋ 收藏资源</button>
  <ul>{shownResources.map((resource) => <ResourceItem key={resource.id} resource={resource} />)}</ul>
  {resources.length > 3 && <button type="button" onClick={() => setExpanded(true)}>查看全部</button>}
</section>
```

- [ ] **Step 5: 移除新 UI 的 task/masteryNote 依赖，保留持久化旧数据**

Run: `npm test -- --run src/ability/AbilityModule.test.tsx src/ability/abilityEngine.test.ts`
Expected: PASS，且节点不存在资源时只显示数量 0 和收藏入口。

- [ ] **Step 6: 提交详情闭环**

```bash
git add src/ability/components/AbilityResourceSection.tsx src/ability/components/AbilityNodePanel.tsx src/ability/components/AbilityForms.tsx src/ability/AbilityModule.tsx src/ability/AbilityModule.css src/ability/AbilityModule.test.tsx src/ability/abilityEngine.ts src/ability/abilityEngine.test.ts
git commit -m "feat(ability): focus node details on mastery and resources"
```

### Task 5: 紧凑信息架构与浏览/编辑模式

**Files:**
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/components/SkillLibrary.tsx`
- Modify: `src/ability/AbilityModule.css`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] **Step 1: 写页面结构和模式边界失败测试**

```tsx
expect(screen.queryByText('重点技能')).not.toBeInTheDocument()
expect(screen.getAllByTestId('compact-skill-card').length).toBeLessThanOrEqual(6)
expect(screen.getByRole('button', { name: '记录成果' })).toBeVisible()
expect(screen.getByRole('button', { name: '编辑技能树' })).toBeVisible()
expect(screen.queryByRole('button', { name: '添加阶段' })).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: '设置并行组' })).not.toBeInTheDocument()
expect(screen.getAllByRole('radio').map((item) => item.textContent)).toEqual(['全部', '下一步', '已掌握'])
```

- [ ] **Step 2: 运行测试，确认旧六按钮页头和重点技能条导致失败**

Run: `npm test -- --run src/ability/AbilityModule.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 将技能库改为画布上方横向 5–6 张紧凑卡**

```tsx
<nav className="ability-library-rail" aria-label="技能库">
  {visibleTrees.slice(0, expanded ? undefined : 6).map((tree) => (
    <button data-testid="compact-skill-card" aria-current={tree.id === currentTreeId ? 'true' : undefined}>
      <strong>{tree.name}</strong><span>{currentPhaseName}</span><progress value={mastered} max={total} />
    </button>
  ))}
</nav>
```

- [ ] **Step 4: 收敛页头主操作并增加模式状态**

```tsx
const [editMode, setEditMode] = useState(false)

<button onClick={openOutcomeDialog}>记录成果</button>
<button aria-pressed={editMode} onClick={() => setEditMode((value) => !value)}>
  {editMode ? '完成编辑' : '编辑技能树'}
</button>
<button aria-label="更多技能树操作">…</button>
```

- [ ] **Step 5: 验证切树重置“全部”、浏览模式无结构控件**

Run: `npm test -- --run src/ability/AbilityModule.test.tsx`
Expected: PASS。

- [ ] **Step 6: 提交页面架构**

```bash
git add src/ability/AbilityModule.tsx src/ability/components/SkillLibrary.tsx src/ability/AbilityModule.css src/ability/AbilityModule.test.tsx
git commit -m "feat(ability): simplify the skill tree workspace"
```

### Task 6: 真实阶段列与画布内结构编辑

**Files:**
- Modify: `src/ability/abilityCanvasLayout.ts`
- Modify: `src/ability/abilityCanvasGeometry.ts`
- Modify: `src/ability/components/AbilityTreeStage.tsx`
- Modify: `src/ability/components/AbilityForms.tsx`
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/AbilityModule.css`
- Test: `src/ability/abilityCanvasLayout.test.ts`
- Test: `src/ability/abilityCanvasGeometry.test.ts`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] **Step 1: 写空阶段、阶段列坐标和水平直线测试**

```ts
it('keeps an empty second stage visible after layout', () => {
  const layout = buildAbilityCanvasLayout(stateWithEmptySecondPhase, 'tree-1')
  expect(layout.phases.map((phase) => phase.id)).toEqual(['phase-1', 'phase-2'])
  expect(layout.phases[1]).toMatchObject({ nodeCount: 0 })
})

it('uses a literal horizontal line for equal center y', () => {
  expect(buildAlignedOrthogonalPath({ sourceX: 100, sourceY: 80, targetX: 300, targetY: 80, branchX: 200 }))
    .toBe('M 100 80 L 300 80')
})
```

- [ ] **Step 2: 运行测试并确认布局尚未输出阶段**

Run: `npm test -- --run src/ability/abilityCanvasLayout.test.ts src/ability/abilityCanvasGeometry.test.ts`
Expected: FAIL。

- [ ] **Step 3: 扩展布局输出并使阶段/节点/母线共用 16px 网格**

```ts
export interface AbilityCanvasPhase {
  id: string
  x: number
  y: number
  width: number
  height: number
  nodeCount: number
}

export interface AbilityCanvasLayout {
  phases: AbilityCanvasPhase[]
  nodes: AbilityCanvasNode[]
  edges: AbilityCanvasEdge[]
  groups: AbilityCanvasGroup[]
  outcomes: AbilityCanvasOutcome[]
}
```

- [ ] **Step 4: 增加 React Flow 阶段背景节点和画布内小型新建器**

```tsx
<PhaseCanvasNode
  phase={phase}
  progress={getPhaseProgress(state, phase.id)}
  editMode={editMode}
  onAddFirstNode={() => onAddNodeToPhase(phase.id)}
  onEdit={() => onEditPhase(phase.id)}
/>
{editMode && <AddPhaseCanvasNode onSave={onAddPhase} />}
```

- [ ] **Step 5: 仅在编辑模式显示加号、删除、拖动、撤销和重新布局**

```tsx
const nodeDraggable = editMode
const structuralControlsVisible = editMode && selected
const onNodeDoubleClick = editMode ? handleRename : undefined
```

- [ ] **Step 6: 验证同父连续三次 `+` 自动并行，子节点 `+` 串行，空阶段刷新保留**

Run: `npm test -- --run src/ability/abilityCanvasLayout.test.ts src/ability/abilityCanvasGeometry.test.ts src/ability/AbilityModule.test.tsx`
Expected: PASS。

- [ ] **Step 7: 提交阶段画布**

```bash
git add src/ability/abilityCanvasLayout.ts src/ability/abilityCanvasLayout.test.ts src/ability/abilityCanvasGeometry.ts src/ability/abilityCanvasGeometry.test.ts src/ability/components/AbilityTreeStage.tsx src/ability/components/AbilityForms.tsx src/ability/AbilityModule.tsx src/ability/AbilityModule.css src/ability/AbilityModule.test.tsx
git commit -m "feat(ability): make stages first-class canvas columns"
```

### Task 7: 紧凑线性路线与移动端详情

**Files:**
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/components/AbilityNodePanel.tsx`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] **Step 1: 写线性顶部对齐、40 节点和 390px 默认视图测试**

```tsx
it('uses compact stage lists without inheriting the canvas minimum height', () => {
  render(<AbilityModule initialAbilityState={fortyNodeState} />)
  expect(screen.getByTestId('ability-linear-route')).toHaveClass('ability-linear-route--compact')
  expect(screen.getAllByTestId('linear-skill-node')).toHaveLength(40)
  expect(screen.queryByText('学习资源 2')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试，确认旧 `min-height: 520px` 和卡片布局导致失败**

Run: `npm test -- --run src/ability/AbilityModule.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 按阶段输出紧凑纵向列表**

```tsx
<section className="ability-linear-stage">
  <header><h3>{phase.name}</h3><p>{phase.description}</p><span>{mastered}/{required}</span></header>
  <ol>{orderedNodes.map((node, index) => <LinearNode key={node.id} index={index + 1} node={node} />)}</ol>
</section>
```

- [ ] **Step 4: 移除线性容器最小高度，同顶线对齐右侧详情，390px 使用底部抽屉**

```css
.ability-linear-route { min-height: 0; align-self: start; }
.ability-workbench { align-items: start; }
@media (max-width: 680px) {
  .ability-node-panel { position: fixed; inset: auto 0 0; max-height: 82dvh; overflow: auto; }
  .ability-canvas-view-toggle [data-view='canvas'] { display: none; }
}
```

- [ ] **Step 5: 运行组件测试并提交**

Run: `npm test -- --run src/ability/AbilityModule.test.tsx`
Expected: PASS。

```bash
git add src/ability/AbilityModule.tsx src/ability/AbilityModule.css src/ability/components/AbilityNodePanel.tsx src/ability/AbilityModule.test.tsx
git commit -m "feat(ability): compact the linear growth route"
```

### Task 8: 实现级回归、兼容说明与交接

**Files:**
- Modify: `src/ability/AppAbilityIntegration.test.tsx`
- Modify: `src/ability/abilityRoute.test.ts`
- Modify: `src/ability/e2e/ability-canvas.spec.ts`
- Modify: `src/ability/docs/README.md`
- Create: `src/ability/docs/releases/2026-08-12-ability-v3-implementation.md`

- [ ] **Step 1: 补齐 App 集成兼容和主路由懒加载回归**

```tsx
expect(await screen.findByRole('region', { name: '能力模块' })).toBeVisible()
expect(screen.getByRole('navigation', { name: '技能库' })).toBeVisible()
expect(screen.queryByText('关联任务')).not.toBeInTheDocument()
```

- [ ] **Step 2: 更新已受影响的 E2E 选择器，不缩减原有 3/5/多层几何场景**

```ts
await page.getByRole('button', { name: '编辑技能树' }).click()
await expect(page.getByTestId('ability-stage-phase-2')).toBeVisible()
await page.getByRole('button', { name: '切换到线性路线' }).click()
await expect(page.getByTestId('ability-linear-route')).toBeVisible()
```

- [ ] **Step 3: 运行实现级单元回归和构建**

Run: `npm test -- --run src/ability`
Expected: all ability Vitest suites PASS。

Run: `npm run build`
Expected: TypeScript and Vite build exit 0。

- [ ] **Step 4: 只做烟雾级 E2E 启动检查，不将此作为总控最终验收**

Run: `npx playwright test src/ability/e2e/ability-canvas.spec.ts --project=desktop-chrome --grep "stage|resource|linear"`
Expected: 新交互基本路径 PASS；如旧截图因预期 UI 变更失败，保留差异供总控测试方案复核，不自行降低标准。

- [ ] **Step 5: 归档实现范围、旧数据兼容、未进入本版的 AI/文件能力和待验收项**

```markdown
# 能力模块 V3 实现归档
- 日期：2026-08-12
- 数据兼容：schema v1 自动迁移为 v2，旧 masteryNote/taskLinks 保留但不再显示。
- 已知限制：资源仅链接、手动录入；无 AI 推荐、文件上传、内置阅读器。
- 状态：实现完成，等待总控测试方案。
```

- [ ] **Step 6: 提交实现级交接文档**

```bash
git add src/ability/AppAbilityIntegration.test.tsx src/ability/abilityRoute.test.ts src/ability/e2e/ability-canvas.spec.ts src/ability/docs/README.md src/ability/docs/releases/2026-08-12-ability-v3-implementation.md
git commit -m "docs(ability): archive v3 implementation handoff"
```

## 实施停止点

完成 Task 1–8 后，只回报已实现范围、迁移兼容、已知风险、实现级测试结果和各小步提交号。明确标记“**等待总控测试方案**”，不自行声称最终验收通过，不合并 main，不 push。

