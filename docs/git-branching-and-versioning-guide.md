# Git 分支与版本管理规范

更新日期：2026-08-14

## 1. 主线原则

`main` 是唯一可运行、可发布的产品主线。正式版本只能从 `main` 创建标签；功能分支验收完成后合入 `main`，不再作为另一条产品主线继续演进。

## 2. 分支结构

```text
personal-growth-compass
├─ main                              # 产品主线与正式发布
├─ codex/ability/main                # 能力模块长期开发线
├─ codex/emotion/main                # 情绪模块长期开发线
├─ codex/health/main                 # 健康模块长期开发线
├─ codex/adventure-journal/main      # 冒险日志模块开发线
├─ codex/task-board/main             # 任务模块开发线（当前仅本地）
├─ codex/economic-system/main        # 经济模块历史开发线
└─ codex/archive/*                   # 只读历史归档，后续统一迁移到此前缀
```

Git 分支没有真正的父子目录；这里用 `/` 形成可读的命名层级。

## 3. 新分支命名

| 类型 | 格式 | 示例 |
| --- | --- | --- |
| 模块长期线 | `codex/<module>/main` | `codex/ability/main` |
| 功能 | `codex/<module>/feature/<topic>` | `codex/health/feature/photo-import` |
| 修复 | `codex/<module>/fix/<topic>` | `codex/emotion/fix/music-timeout` |
| 版本准备 | `codex/release/v<version>` | `codex/release/v2.2.0` |
| 归档 | `codex/archive/<name>` | `codex/archive/economy-v0.1` |

不要继续创建没有模块层级或日期含义不明确的分支。`codex/emotion-module`、`codex/health-status-v1`、`codex/body-health/main` 等旧名称保留历史，不强制改写；后续开发统一从对应的规范化 `main` 分支开始。

## 4. 版本与标签

- 使用语义化版本：`主版本.次版本.修订版本`。
- 新模块或明显能力扩展：增加次版本，例如 `2.0.0 → 2.1.0`。
- 向后兼容修复：增加修订版本，例如 `2.1.0 → 2.1.1`。
- 破坏性数据或产品变化：增加主版本。
- 新标签统一使用大写 `V` 和完整三段版本，例如 `V2.1.0`。
- 旧标签 `V2.0`、`v0.1-0628` 保留，不覆盖、不重写。

每次正式发布同步更新：

1. `package.json` 与 `package-lock.json`
2. 根目录 `CHANGELOG.md`
3. `spec/releases/v<version>/README.md`
4. 应用内展示版本与发布日期
5. Git 标签

## 5. 提交信息

```text
<type>(<module>): <清晰的改动摘要>
```

常用类型：`feat`、`fix`、`docs`、`test`、`style`、`refactor`、`chore`、`merge`、`release`。

示例：

```text
feat(health): add local-first health records
fix(ability): restore focus after closing details
docs(release): document V2.1.0 module rollout
```

日期、版本和完整说明统一放入 CHANGELOG 与发布快照，提交标题保持可扫描。

## 6. 标准发布流程

1. 从最新 `main` 创建或更新模块分支。
2. 小步提交并在模块分支完成单元、组件、浏览器和无障碍测试。
3. 将模块分支合入独立的 main 集成工作区。
4. 解决冲突后运行全仓测试和生产构建。
5. 更新版本号、CHANGELOG、发布快照与仓库首页。
6. 提交发布版本并创建带说明的标签。
7. 推送 `main`、标签和仍需保留的模块分支。

## 7. 当前版本时间线

| 日期 | 版本/标签 | 内容 |
| --- | --- | --- |
| 2026-06-28 | `v0.1-0628` | 经济系统早期备份 |
| 2026-07-02 | `V2.0` / `2.0.0` | 账户驱动经济系统 |
| 2026-08-01 | `adventure-journal-v0.1.0` | 冒险日志纵向切片 |
| 2026-08-14 | `V2.1.0` / `2.1.0` | 情绪、能力、身体健康三模块整合 |

## 8. GitHub 展示规则

- 仓库首页：`README.md` 展示当前版本、模块状态和目录入口。
- 跨模块版本：根目录 `CHANGELOG.md`。
- 正式发布证据：`spec/releases/v<version>/`。
- 产品和实施设计：`docs/`。
- 模块验收证据：模块自己的 `docs` 或 `验收证据` 目录。
- 构建产物、浏览器临时报告和缓存不进入 Git。
