# 能力模块 V3 独立测试基线与覆盖矩阵

- 日期：2026-08-12
- 测试前 HEAD：`600679c1021bc34047f4ae8c90a7256b7d456fb5`
- 测试前工作区：干净（`git status --porcelain=v1` 无输出）
- 对比起点：`2954cba`
- `.audit-ignore`：不存在
- 测试角色：使用本地单用户能力模块的普通用户

## 实现提交序列

1. `d99eac7` V3 实施计划与风险依赖检查
2. `622c7b8` schema v2 无损迁移
3. `3192ac5` 阶段进度与统一可见图
4. `47e771a` 可复用学习资源领域层
5. `c42b2ca` 节点详情、资源与掌握闭环
6. `a1e1635` 紧凑信息架构与浏览/编辑模式
7. `ea57d0a` 真实阶段列与画布内结构编辑
8. `7fbbaa1` 紧凑线性路线与移动端详情
9. `5c13ce7` V3 筛选边界与 Playwright 实现级回归路径
10. `600679c` V3 实现归档

## `2954cba..600679c` 文件边界（33 个）

全部位于 `src/ability/`：

1. `AbilityModule.css`
2. `AbilityModule.test.tsx`
3. `AbilityModule.tsx`
4. `AppAbilityIntegration.test.tsx`
5. `abilityCanvasGeometry.test.ts`
6. `abilityCanvasGeometry.ts`
7. `abilityCanvasLayout.test.ts`
8. `abilityCanvasLayout.ts`
9. `abilityDrafts.test.ts`
10. `abilityDrafts.ts`
11. `abilityEngine.test.ts`
12. `abilityEngine.ts`
13. `abilityGraph.test.ts`
14. `abilityGraph.ts`
15. `abilityLayout.test.ts`
16. `abilityResources.test.ts`
17. `abilityResources.ts`
18. `abilityStorage.test.ts`
19. `abilityStorage.ts`
20. `abilityView.test.ts`
21. `abilityView.ts`
22. `components/AbilityForms.tsx`
23. `components/AbilityNodePanel.tsx`
24. `components/AbilityResourceSection.tsx`
25. `components/AbilityTreeStage.tsx`
26. `components/SkillLibrary.tsx`
27. `docs/README.md`
28. `docs/plans/2026-08-12-dice-life-ability-v3.md`
29. `docs/releases/2026-08-12-ability-v3.0-implementation.md`
30. `e2e/ability-canvas.spec.ts`
31. `types.ts`
32. `useAbilitySystem.test.tsx`
33. `useAbilitySystem.ts`

## 验收场景映射

| ID | 测试目标 | 起始条件与关键步骤 | 期望结果 | 证据方式 |
|---|---|---|---|---|
| MIG-01 | V1→V2 无损且幂等 | 复杂 V1 快照→读取→保存→再次读取 | 旧树/阶段/节点/关系/任务/说明均保留；新增字段只补一次 | Vitest + 浏览器流程 B |
| MIG-02 | 局部损坏安全降级 | 缺数组、孤儿边、非法关联、损坏 JSON | 合法可恢复数据保留或明确回退；无白屏 | Vitest + console 证据 |
| PER-01 | 结构与偏好重载 | 阶段/必修/位置/折叠/视口/资源关联写入后 reload | 值与引用保持一致，无重复 | Vitest + Playwright |
| DOM-01 | 阶段完成规则 | 0 节点、仅选修、部分必修、全部必修 | 进度结果明确，选修不阻塞 | Vitest |
| DOM-02 | 串并行和跨阶段可见图 | 3/5/多层/跨阶段/空阶段，切三种筛选 | 画布和线性路线使用同一可见集合 | Vitest + Playwright |
| DOM-03 | 掌握门禁 | 空证据、未完成标准、完成标准、真实成果、回退 | 仅合法证据允许掌握 | Vitest + 浏览器流程 |
| RES-01 | URL 安全与去重 | http/https、追踪参数、javascript/data/畸形 URL | 非 http(s) 拒绝；规范化保守；同链接单一原件 | Vitest |
| RES-02 | 多节点关联生命周期 | 同资源关联两节点→移除一处→编辑→安全删除 | 另一节点仍存在且同步；仍关联时禁止删原件 | Vitest + Playwright |
| GEO-01 | 有限网格布局 | 空/3/5/多层/手动位置/自动复位 | 坐标有限、16px 对齐、无 NaN/断边 | Vitest + SVG 检查 |
| UI-01 | 浏览/编辑边界 | 浏览→编辑→退出→键盘快捷键 | 结构工具只在编辑模式出现且退出即失效 | Testing Library + Playwright |
| UI-02 | 菜单键盘语义 | 打开更多菜单→方向键/Tab/Esc | menu/menuitem 合法、焦点返回触发器 | Testing Library + Playwright |
| UI-03 | 阶段安全编辑 | 空阶段新增；改名；尝试删除含节点阶段 | 空阶段可见；含节点不误删并给出提示 | Testing Library + Playwright |
| UI-04 | 资源区完整交互 | 空态→新增→复用→编辑→4 项展开→移除/删除 | 状态清楚、操作不混淆原件与关联 | Testing Library + Playwright |
| UI-05 | 技能库压力与键盘 | 8+ 技能树、长名称、搜索、窄屏横滚 | 默认≤6、可展开、长名可理解、键盘可切树 | Testing Library + Playwright |
| UI-06 | 线性/画布一致 | 选择节点并来回切换视图 | 状态/阶段/选择/详情保持一致 | Testing Library + Playwright |
| MOB-01 | 390px 主路径 | 默认线性→开关底部详情→资源操作 | 无遮挡/页面横溢；触控目标≥44px | Playwright + 截图 + 尺寸断言 |
| E2E-A | 全新空数据流程 | 建树→阶段→串并行→资源→掌握→拖动→切视图 | 全流程无 console error/warn 和未处理异常 | Playwright |
| E2E-B | V1 历史复杂树流程 | 注入 V1→迁移→执行同一关键路径 | 兼容数据保留，新 UI 无旧入口 | Playwright |
| VIS-01 | 多视口视觉 | 1440×900、1024×768、390×844 | 无页面横溢、遮挡、不可达主操作 | 截图 + 人工审查记录 |
| PERF-01 | 40 节点压力 | 首次渲染、切视图、选第40节点、打开详情 | 无循环/警告风暴；主要操作无明显卡顿 | Playwright 计时 + console |
| A11Y-01 | 键盘与 axe | 画布/线性/编辑/资源/移动详情 | critical/serious=0；图标有名称；状态不只靠颜色 | Playwright + axe JSON |
| REG-01 | 全量回归和构建 | ability、全仓、Playwright、build | 所有门禁精确记录；失败必须修复或明确阻塞 | 命令输出归档 |

## 审计收敛账本

后续每轮在最终报告登记：`轮次 / 审计角度 / 新发现数 / 已验证数 / 修复提交`。停止条件为两个连续、不同角度的轮次没有新增 CRITICAL/HIGH。
