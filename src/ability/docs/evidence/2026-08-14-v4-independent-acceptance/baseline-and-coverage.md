# V4 独立验收基线与覆盖映射

日期：2026-08-14

## 基线

- 测试前 HEAD：`6c7786be804805bfc431800b9ce0cc30d39fe966`
- 分支：`codex/ability/main`
- 审查范围：`5d8b084..6c7786b`，33 个文件，约 2,079 行新增、230 行删除。
- 测试前 `git status --short` 与暂存区均为空。
- 没有合并 main、push、重写既有提交或清理用户文件。

## 测试覆盖映射

| 领域 | 证据 |
|---|---|
| 阶段 0/1/多、空阶段、重复/极长标题 | `abilityGraph.test.ts`、`abilityCanvasLayout.test.ts`、`abilityV4Acceptance.test.ts` |
| 节点 CRUD、并行/汇合、循环与非法边 | `abilityEngine.test.ts`、`abilityGraph.test.ts`、`ability-canvas.spec.ts` |
| 下一步空/单/多候选及稳定轮换 | `abilityGraph.test.ts`、`AbilityModule.test.tsx`、V4 acceptance E2E |
| undo/redo、跨视图、跨树、刷新与保存失败 | `useAbilitySystem.test.tsx`、`AbilityModule.test.tsx`、`AbilityTreeStage.test.ts`、E2E |
| V1/V2、损坏数据、缺失阶段坐标、孤儿坐标 | `abilityStorage.test.ts`、`abilityCanvasStorage.test.ts`、V4 acceptance tests |
| 快捷键作用域与多余修饰键 | `abilityKeyboard.test.ts`、`AbilityModule.test.tsx`、Playwright |
| 详情、成果归属、资源与焦点 | `AbilityModule.test.tsx`、V3/V4 Playwright |
| 20 阶段 / 200 节点性能 | `abilityV4Acceptance.test.ts` 与 V4 Playwright 性能用例 |
| 1440/1024/720/390 响应式 | `ability-v4-independent-acceptance.spec.ts` 与 `screenshots/` |
| axe | `ability-canvas.spec.ts`、`ability-v3-acceptance.spec.ts`，共 7 个扫描状态 |

## 新增测试文件

- `src/ability/abilityV4Acceptance.test.ts`：5 个纯领域/布局边界。
- `src/ability/e2e/ability-v4-independent-acceptance.spec.ts`：3 个真实浏览器旅程。
- 原有 `AbilityModule.test.tsx`、`AbilityTreeStage.test.ts` 各增加针对性回归。
