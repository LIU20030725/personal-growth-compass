# Git 分支与版本管理规范

日期：2026-07-04

本文档用于记录本项目后续的 Git 分支结构、版本分支命名、提交信息规范和日常开发流程。

## 1. 核心原则

本项目后续会同时存在多条工作线：

- 经济系统功能迭代
- Stitch UI 视觉落地
- 文档与设计规范整理
- 后续其他系统：能力、身体、情绪等

为了避免分支混乱，所有长期方向都应该有清晰命名。每次提交都要能从提交信息里看出：

- 改了什么
- 属于哪个模块
- 是哪个版本或日期的变更

## 2. Git 分支没有真正的父子关系

Git 分支本质上只是一个指向提交的名字，不存在真正的“父分支 / 子分支”结构。

但我们可以用 `/` 做出命名层级，例如：

```text
codex/economic-system/main
codex/economic-system/v2.1-20260704-stitch-ui
codex/economic-system/feature/monthly-bill-20260704
```

这看起来像目录结构，方便管理。

需要注意：如果已经存在一个分支叫：

```text
codex/economic-system
```

就不能再创建：

```text
codex/economic-system/main
```

因为 Git 会把 `codex/economic-system` 当成一个文件路径，无法同时把它当成目录。因此长期主分支不要命名为 `codex/economic-system`，而应该命名为：

```text
codex/economic-system/main
```

## 3. 当前推荐分支结构与分类思路

本项目后续按“主线稳定、版本收敛、功能短跑、实验归档、备份兜底”的方式管理分支。

```text
personal-growth-compass
│
├─ master
│  └─ 早期规格与项目初始化基线，只保留
│
├─ codex/economic-system/main
│  └─ 经济系统长期主线
│     ├─ V2.0 已确认稳定版本
│     ├─ 当前整体 UI 版本
│     └─ 后续稳定功能都合回这里
│
├─ codex/economic-system/v2.1-20260705-ui-polish
│  └─ 下一轮 UI 细节优化分支
│     ├─ 细节设计调整
│     ├─ bug 修复
│     ├─ 移动端适配
│     └─ 验证通过后合回 main
│
├─ codex/economic-system/feature/xxx
│  └─ 后续单独小功能分支
│
├─ codex/stitch-ui-v1
│  └─ Stitch 视觉参考归档，不作为开发主线
│
├─ codex/economy-system-v0.1-0628
│  └─ 旧命名归档，只读，不再开发
│
└─ codex/backup-economic-system-local-20260704
   └─ 本地保险备份，确认无用后再删
```

分支用途分为五类：

| 类型 | 分支示例 | 用途 | 是否继续开发 |
| --- | --- | --- | --- |
| 长期主线 | `codex/economic-system/main` | 经济系统稳定主线，保存已确认可继续迭代的版本 | 是 |
| 版本迭代线 | `codex/economic-system/v2.1-20260705-ui-polish` | 承载一个完整版本的 UI 细化、bug 修复、移动端适配和验证 | 是 |
| 短期功能线 | `codex/economic-system/feature/monthly-bill-202607xx` | 承载单一小功能，完成后合回版本线或主线 | 按需 |
| 视觉参考归档 | `codex/stitch-ui-v1` | 保存 Stitch 视觉方向和实验结果，作为参考材料 | 否 |
| 旧线/备份归档 | `codex/economy-system-v0.1-0628`、`codex/backup-economic-system-local-20260704` | 保留历史版本和保险备份，避免误删可恢复内容 | 否 |

### 3.1 经济系统长期主分支

```text
codex/economic-system/main
```

用途：

- 作为经济系统的长期主线
- 所有经济系统稳定版本最终合并回这里
- 后续账户、理财、月度账单、存钱日历等功能都以它为基础
- 当前整体 UI 版本也归入这条主线

### 3.2 经济系统版本迭代分支

```text
codex/economic-system/v2.1-20260705-ui-polish
codex/economic-system/v2.2-202607xx-account-report
codex/economic-system/v3.0-2026xxxx-major-upgrade
```

用途：

- 承载一个明确版本的开发
- 适合有完整目标、测试、构建、截图验证的迭代
- 完成后合并回 `codex/economic-system/main`
- UI 细节优化和普通 bug 修复可以放在同一个版本分支中，但提交信息要按 `style`、`fix`、`test`、`docs` 分清楚

命名格式：

```text
codex/economic-system/v版本号-日期-主题
```

示例：

```text
codex/economic-system/v2.1-20260705-ui-polish
```

含义：

- `v2.1`：版本号
- `20260705`：开始或主要提交日期
- `ui-polish`：本次迭代主题，表示 UI 细节优化、bug 修复和移动端适配

### 3.3 经济系统短期功能分支

```text
codex/economic-system/feature/monthly-bill-20260704
codex/economic-system/feature/investment-profit-202607xx
codex/economic-system/feature/savings-calendar-202607xx
```

用途：

- 承载某一个小功能
- 功能完成后合并回版本分支或 main
- 不建议长期保留

### 3.4 UI 专项分支

```text
codex/stitch-ui-v1
```

用途：

- 保存 Stitch 生成的 UI 方案、视觉参考和历史实验结果
- 不作为后续代码开发主线
- 后续真正落地的 UI 变更应从 `codex/economic-system/main` 开版本分支完成

当 UI 方案稳定后，可以合并到：

```text
codex/economic-system/main
```

当前 `codex/stitch-ui-v1` 已作为视觉参考归档，不再直接在该分支上继续开发。

### 3.5 旧命名归档分支

```text
codex/economy-system-v0.1-0628
```

用途：

- 保留早期经济系统版本历史
- 因命名使用了 `economy-system`，与后续规范 `economic-system` 不一致，所以只作为归档
- 不再作为开发入口，避免新旧命名混用

### 3.6 本地备份分支

```text
codex/backup-economic-system-local-20260704
```

用途：

- 保留本地整理前的保险备份
- 确认所有历史内容都已纳入主线后，再决定是否删除
- 删除前必须先确认没有独有提交或未迁移内容

## 4. 版本标签规范

稳定版本应该打 tag。

推荐格式：

```text
V2.0
V2.1
V2.2
V3.0
```

已有标签：

```text
v0.1-0628
V2.0
```

建议后续统一使用大写 `V`：

```text
V2.1
V2.2
V3.0
```

## 5. 提交信息规范

提交信息必须包含：

- 日期
- 模块
- 版本或变更阶段
- 本次改动内容

### 5.1 推荐格式

```text
类型(模块): YYYY-MM-DD V版本号 改动摘要
```

示例：

```text
feat(economic-system): 2026-07-04 V2.1 新增账户总览优化
fix(economic-system): 2026-07-04 V2.1 修复月度账单统计
docs(repo): 2026-07-04 添加分支结构与提交规范
style(ui): 2026-07-04 V1 统一 Stitch 卡片视觉
chore(repo): 2026-07-04 清理生成文件和旧分支
```

### 5.2 类型说明

```text
feat   新功能
fix    修复问题
docs   文档变更
style  UI 样式调整，不改变业务逻辑
refactor 代码重构，不改变功能
test   测试相关
chore  仓库、依赖、构建、清理等维护工作
```

### 5.3 不推荐的提交信息

```text
update
修改
fix bug
0704
调整页面
```

问题是看不出来改了什么，也看不出属于哪个版本。

## 6. 推荐开发流程

### 6.1 做经济系统新版本

从主分支出发：

```bash
git switch codex/economic-system/main
git switch -c codex/economic-system/v2.1-20260705-ui-polish
```

完成开发后：

```bash
npm test
npm run build
git add -A
git commit -m "style(economic-system): 2026-07-05 V2.1 优化经济系统 UI 细节"
```

确认稳定后合并回 main：

```bash
git switch codex/economic-system/main
git merge codex/economic-system/v2.1-20260705-ui-polish
git tag V2.1
```

### 6.2 做 UI 细节优化与 bug 修复

当前阶段建议将 UI 细节优化和普通 bug 修复放在同一个版本分支：

```text
codex/economic-system/v2.1-20260705-ui-polish
```

原因：

- 本轮目标是围绕同一个整体 UI 版本做收敛
- UI 细节、交互状态、移动端适配和 bug 修复经常互相影响
- 单人/小范围快速迭代时，按版本聚合比分成多条分支更容易管理

但提交必须拆清楚：

```text
style(economic-system): 2026-07-05 V2.1 优化主面板视觉层级
fix(economic-system): 2026-07-05 V2.1 修复账户卡片点击问题
style(economic-system): 2026-07-05 V2.1 优化移动端底部导航
test(economic-system): 2026-07-05 V2.1 补充经济系统回归测试
docs(repo): 2026-07-05 更新 Git 分支管理说明
```

只有在以下情况才拆成独立分支：

- bug 是生产级严重问题，需要立即热修
- UI 优化周期很长，需要大量视觉实验
- bug 修复必须先合回 `main`
- 两类改动影响完全不同模块
- 后续多人并行开发时需要拆分责任边界

### 6.3 做 UI 视觉参考归档

先在 UI 分支整理设计交接：

```bash
git switch codex/stitch-ui-v1
```

先写文档，不改代码：

```text
ui/V1/README.md
ui/V1/stitch-reference.md
ui/V1/component-map.md
ui/V1/implementation-plan.md
```

确认后再开始改 React / CSS。

注意：当前 `codex/stitch-ui-v1` 只作为视觉参考归档。真正代码落地应在经济系统版本分支中完成。

## 7. 当前项目整理结果

当前保留：

```text
codex/economic-system/main
codex/economic-system/v2.1-20260705-ui-polish
codex/stitch-ui-v1
codex/economy-system-v0.1-0628
codex/backup-economic-system-local-20260704
master
```

当前已删除：

```text
codex/ui
```

当前已清理：

```text
.vite/
canvas/*.tmp
docs/docs_bak/
```

当前已忽略：

```text
.vite/
exports/
docs/docs_bak/
canvas/*.tmp
```

## 8. 后续建议

- 经济系统主线固定使用 `codex/economic-system/main`
- 下一轮细节优化固定使用 `codex/economic-system/v2.1-20260705-ui-polish`
- 每个完整版本使用 `codex/economic-system/v版本-日期-主题`
- 单独小功能使用 `codex/economic-system/feature/功能名-日期`
- Stitch UI 分支只作为视觉参考归档，不作为开发主线
- 旧命名分支 `codex/economy-system-v0.1-0628` 只读保留，不再开发
- 每个稳定版本打 tag
- 每次提交写清日期、模块、版本和改动内容
- 不要把临时构建产物、缓存、导出文件提交进 Git

