# 能力模块 V3 独立测试与验收记录

- 验收日期：2026-08-12
- 测试前 HEAD：`600679c1021bc34047f4ae8c90a7256b7d456fb5`
- 测试分支：`codex/ability/main`
- 范围：`2954cba..HEAD` 的能力模块 V3 交付，以及消除全站 favicon 404 所需的 `index.html` 单行共享修复
- 原则：未合并 main，未 push，未重写或压缩既有提交

## 1. 自动化覆盖映射

| 验收主题 | 主要证据 |
| --- | --- |
| V1→V2 迁移、幂等、旧任务与旧掌握说明保留 | `abilityStorage.test.ts`；浏览器流程 B |
| 局部损坏恢复 | `abilityStorage.test.ts`：缺失资源数组、孤儿边、孤儿标准仅丢弃非法记录，合法树/阶段/节点保留 |
| 阶段必修规则与统一当前阶段 | `abilityGraph.test.ts`、`AbilityModule.test.tsx`；顶部摘要和技能库共用 `getCurrentPhase` |
| 掌握证据门禁 | `abilityEngine.test.ts`、`AbilityModule.test.tsx`；浏览器流程 A |
| URL 安全、去重与多节点关联 | `abilityResources.test.ts`、`abilityEngine.test.ts`；浏览器流程 A |
| 16px 网格、有限坐标、自动布局、3/5/多层母线 | `abilityCanvasLayout.test.ts`、`abilityCanvasGeometry.test.ts`、`abilityCanvasStorage.test.ts`、Playwright 截图专项 |
| 浏览/编辑模式、阶段增改删、必修设置、空阶段 | `AbilityModule.test.tsx`、Playwright 流程 A |
| 菜单、弹层、快捷键与焦点恢复 | `AbilityModule.test.tsx`、`ability-canvas.spec.ts` |
| 线性路线、移动详情与 44px 触控目标 | `AbilityModule.test.tsx`、`ability-canvas.spec.ts`、视觉证据 |
| 真实浏览器无 error/warn | `ability-v3-acceptance.spec.ts` 的 A、B、视觉压力三场景 |
| axe | `ability-canvas.spec.ts` 与 `ability-v3-acceptance.spec.ts` 共 7 个扫描状态 |

## 2. 真实浏览器流程

### A. 全新空数据

已自动完成：新建技能树 → 新建阶段 → 根节点 → 两个并行子节点 → 退出编辑模式 → 开始学习 → 无证据掌握被阻止 → 添加并完成掌握标准 → 确认掌握 → 收藏资源 → 在第二节点用同一规范化 URL 复用 → 画布/线性路线切换 → reload。

结果：状态、节点关系、掌握结果、资源唯一对象和两条节点关联均保持；浏览模式不暴露结构编辑工具；控制台 error/warn 与未处理异常为 0。

### B. V1 历史复杂树

输入包含两阶段、三节点、两条依赖、并行组、旧任务关联、旧掌握说明和旧成果。

结果：升级到 schema v2 后数量与关系不变；阶段和节点新增字段得到默认值；旧 `taskLinks` 与 `masteryNote` 原样保留；新 UI 不出现“关联任务”或“掌握判断依据”旧入口；二次 reload 与第一次迁移结果完全相同；控制台 error/warn 与未处理异常为 0。

## 3. 视觉与响应式证据

截图均由本轮 Playwright 重新生成并人工核对：

1. `screenshots/00-1440-three-branch.png`：三分支共享母线。
2. `screenshots/01-1440-five-branch-multilevel.png`：五分支及多层路径。
3. `screenshots/02-1024-stage-columns-empty-stage.png`：阶段列与空阶段。
4. `screenshots/03-1024-resource-expanded.png`：节点内四项资源展开。
5. `screenshots/04-1024-linear-route.png`：线性路线与详情并列。
6. `screenshots/05-390-bottom-detail.png`：390px 底部详情、资源区和主操作。
7. `screenshots/06-390-40-node-pressure.png`：40 节点线性路线。

人工检查结论：3/5 分支及多层树的主边共享同层母线，目标入口对齐；阶段标题、外框、节点和连线没有压线；资源只在详情出现；390px 没有页面级横向溢出，主要交互目标均不小于 44×44px。

## 4. 性能与稳定性

- 40 节点场景从写入数据、reload 到 40 个线性节点可操作设置 8 秒门槛，并通过；精确 `readyMs` 作为 Playwright 附件 `40-node-performance` 保存在报告中。
- 测试过程未观察到布局无限循环、重复渲染警告风暴、控制台 error/warn 或未处理异常。
- 生产拆包结果：主入口 276.42 kB，能力模块异步包 279.24 kB；能力模块没有重新拖入主入口。

## 5. axe 与键盘

- 扫描状态：浏览画布、编辑画布、线性路线、资源表单、390px 移动详情、基础模块、通用弹窗。
- critical：0。
- serious：0。
- 修复记录：线性路线 9px 序号原对比度 4.47:1，改用更深中性色后通过。
- 仅键盘已覆盖：切树、进入编辑模式、画布快捷键作用域、打开详情、技能树/技能库/资源菜单、弹层 Tab 环、Escape 关闭与焦点恢复。

## 6. 审查收敛记录

### Pass 1

发现并修复：局部损坏数据会整库清空、画布偏好接受非法坐标、节点必修状态无法编辑、阶段无法安全删除、空阶段在线性路线消失、多个菜单缺少真实菜单键盘语义、移动详情触控目标不足、favicon 404、线性序号对比度不足。

### Pass 2

发现并修复：顶部摘要与紧凑技能库没有复用必修节点阶段规则，选修节点可能错误阻塞“当前阶段”。两处现已统一调用 `getCurrentPhase`。

### Pass 3

针对迁移引用、资源生命周期、阶段派生、模式边界、菜单语义、移动尺寸、控制台和静态残留再次检查，未发现新的 CRITICAL/HIGH。

## 7. 已知限制与规格解释

1. 按批准的 V3 规格，前置关系是建议与非阻塞警告，不引入锁定状态；用户仍可提前开始任意节点。
2. 移动端支持成长、资源、成果与详情操作；复杂结构编辑仍建议桌面端。
3. 学习资源首版仅支持用户手工添加 HTTP/HTTPS 链接，不含文件上传、内容抓取、链接失效巡检或 AI 推荐。
4. 空阶段可删除；含节点阶段必须先移动或归档节点，避免级联误删。
5. 40 节点移动端使用线性路线，不在手机强塞画布。

## 8. 最终门禁

| 门禁 | 结果 |
| --- | --- |
| 能力模块 Vitest | 14 个文件、88 条用例全部通过 |
| 仓库全量 Vitest | 23 个文件、126 条用例全部通过 |
| Playwright 非 axe 专项 | 8 条全部通过 |
| Playwright axe 专项 | 2 条全部通过；7 个扫描状态 critical/serious 为 0 |
| 生产构建 | TypeScript 与 Vite 构建通过；1773 个模块完成转换 |
| 浏览器控制台 | 三套关键流程 error/warn 为 0；未处理异常为 0 |

测试期间新增修复/验收提交：

1. `c69cf41`：迁移容错、非法画布偏好、必修编辑与安全阶段删除。
2. `c73cefb`：技能库/资源菜单键盘语义与移动端 44px 触控目标。
3. `de04460`：完整 V3 浏览器验收、视觉基准、favicon 404、对比度与统一阶段摘要。

最终提交后执行 `git status --short` 应无输出；实际状态由交付回报再次证明。
