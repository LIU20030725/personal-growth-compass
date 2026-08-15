# Dice Life Ability V5 Calm Command Center Implementation Plan

> **Required sub-skills:** execute with `tdd`, then use `verification-before-completion` before reporting completion. Keep changes inside the ability module and necessary shared interfaces.

**Goal:** 在不改变 Ability Schema V2、业务能力、路由和持久化的前提下，把能力模块重构为方案 A“平静指挥中心”，并实现连接点按需加号与阶段容器四向自适应。

**Architecture:** `AbilityModule` 继续负责编排技能库、工具栏、视图和详情；`AbilityTreeStage` 负责 React Flow 画布直接操作；`abilityCanvasLayout` 用纯函数派生阶段与节点几何；`AbilityNodePanel`/`AbilityResourceSection` 保持节点上下文动作。视觉只通过模块级 token 与现有组件调整，不增加依赖。

**Tech Stack:** React 19、TypeScript、@xyflow/react、Vitest/Testing Library、Playwright、axe-core。

---

### Task 1: 阶段容器四向自适应几何

**Files:**
- Modify: `src/ability/abilityCanvasLayout.ts`
- Modify: `src/ability/abilityCanvasGeometry.ts`
- Test: `src/ability/abilityCanvasLayout.test.ts`
- Test: `src/ability/abilityCanvasGeometry.test.ts`

- [ ] 写失败测试：成员向左/右/上/下越界时阶段边界扩张，拖回时收缩，且不小于空阶段最小尺寸。
- [ ] 写失败测试：跨入另一阶段视觉区域后节点 stageId 不变；阶段标题安全区、节点工具条和连接点纳入边距。
- [ ] 写失败测试：极端/损坏坐标不产生 NaN/Infinity；16px 网格与自动布局复位保持。
- [ ] 实现可复用的成员包围盒与阶段矩形派生函数，替换只计算 `memberBottom` 的单向增长。
- [ ] 运行几何测试并提交 `feat(ability): fit stages around assigned nodes`。

### Task 2: 飞书式连接点加号

**Files:**
- Modify: `src/ability/components/AbilityTreeStage.tsx`
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/components/AbilityTreeStage.test.ts`
- Modify: `src/ability/AbilityModule.test.tsx`

- [ ] 把“每个节点常驻加号”旧断言改为失败测试：常态只有连接点，hover/focus 后出现可访问的添加子节点控件。
- [ ] 写失败测试：Enter/Space 每次只创建一个直接子节点，重复三次形成三个并行子节点；Tab 不创建。
- [ ] 写失败测试：连接点命中区不触发节点详情，鼠标离开/失焦后恢复圆点；只读/锁定状态按既有规则禁用。
- [ ] 将 source handle 与添加入口合并为单一交互命中区，保留 React Flow 连线能力和安全键盘作用域。
- [ ] 运行组件测试并提交 `feat(ability): reveal branch creation at node ports`。

### Task 3: 平静指挥中心布局与视觉 token

**Files:**
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/components/SkillLibrary.tsx`
- Modify: `src/ability/components/AbilityTreeStage.tsx`
- Test: `src/ability/AbilityModule.test.tsx`

- [ ] 写失败测试：页面保留所有现有动作，但主动作只突出“下一步 · N”；低频树/阶段/布局动作保持可达。
- [ ] 建立能力模块 token：冷白、鼠尾草、柔黄、低对比边框、8/12/16 圆角和浮层阴影。
- [ ] 重排标题行、主动作、视图/筛选/结构工具组，消除重复工具条和永久说明条。
- [ ] 降低未选节点、阶段、辅助线和 MiniMap 的视觉权重；选中和主 CTA 才使用柔黄。
- [ ] 修复长技能名、很多技能树、空态/错误态和菜单 click-away。
- [ ] 运行模块组件测试并提交 `feat(ability): apply calm command center layout`。

### Task 4: 详情、资源与中窄屏信息层级

**Files:**
- Modify: `src/ability/components/AbilityNodePanel.tsx`
- Modify: `src/ability/components/AbilityResourceSection.tsx`
- Modify: `src/ability/components/AbilityForms.tsx`
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/AbilityModule.test.tsx`

- [ ] 写失败测试：详情顺序为状态/标准/资源/成果/高级信息，且每个状态只有一个主动作。
- [ ] 写失败测试：资源空态只有一个添加入口；已有资源仍可新增、选择、编辑、解除和安全删除。
- [ ] 写失败测试：URL/表单错误通过 `aria-describedby` 关联；成功后回列表并保留焦点语义。
- [ ] 修复 `<=1180px` 的 `.has-detail` 特异性，使 1024px 使用覆盖详情；390px 底部详情隔离背景并不遮主操作。
- [ ] 将移动端技能库、菜单、关闭和主要动作触控框统一到至少 44px。
- [ ] 运行模块测试并提交 `feat(ability): clarify detail and resource workflows`。

### Task 5: 菜单、焦点与响应式回归

**Files:**
- Modify: `src/ability/AbilityModule.tsx`
- Modify: `src/ability/components/AbilityForms.tsx`
- Modify: `src/ability/AbilityModule.css`
- Modify: `src/ability/AbilityModule.test.tsx`
- Modify: `src/ability/abilityKeyboard.test.ts`

- [ ] 写失败测试：菜单点击外部/Escape 关闭并回焦；弹层打开时背景与画布快捷键失效。
- [ ] 写失败测试：连接点、节点、视图、下一步、详情和资源可全键盘完成；多余修饰键不误触。
- [ ] 修复 200% 缩放、1024px 工具栏和 390px 无横向页面溢出。
- [ ] 检查所有 icon-only 控件名称、状态非颜色表达和 live region 反馈。
- [ ] 运行能力模块测试并提交 `fix(ability): harden responsive keyboard interactions`。

### Task 6: 浏览器验证、证据与归档

**Files:**
- Modify: `src/ability/e2e/ability-canvas.spec.ts`
- Modify: `src/ability/e2e/ability-v4-independent-acceptance.spec.ts`
- Create: `src/ability/docs/evidence/2026-08-15-ui-v5-redesign/results.md`
- Create: `src/ability/docs/releases/2026-08-15-ability-v5.0-calm-command-center.md`
- Add screenshots under: `src/ability/docs/evidence/2026-08-15-ui-v5-redesign/screenshots/`

- [ ] Playwright 覆盖：连接点 hover/focus、连续三个分支、跨阶段误拖归属不变、阶段四向扩缩、重载和自动布局。
- [ ] 重新生成 1440×900、1024×768、390×844 的空态、画布、详情、资源和移动路线截图。
- [ ] 运行能力模块测试、全仓测试、生产构建、专项 E2E 与 a11y；记录精确文件/用例/失败数。
- [ ] 断言 axe serious/critical=0，console error/warn、pageerror=0，无横向溢出且移动端触控目标≥44px。
- [ ] 记录 Refero 订阅限制、兼容性、性能观察、截图路径和最终提交；提交 `docs(ability): archive calm command center v5`。

## 执行门禁

- [ ] 不修改 Ability Schema V2、路由或持久化 key。
- [ ] 不删除、合并或弱化现有功能。
- [ ] 不新增 npm 依赖、外部上传或付费服务。
- [ ] 每个生产变更先有失败测试，再最小实现与重构。
- [ ] 不合并 main、不 push；最终 worktree 干净并等待总控集成。

