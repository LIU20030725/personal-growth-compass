# Dice Life · Personal Growth Compass

Dice Life 是一个本地优先、游戏化表达的个人成长仪表盘，把财富、能力、身体健康、情绪、任务与冒险记录整理成可持续回顾的生活系统。

## 当前版本

| 项目 | 内容 |
| --- | --- |
| 正式版本 | `2.2.0` |
| 发布日期 | `2026-08-15` |
| 产品主线 | `main` |
| 发布标签 | `V2.2.0` |
| 技术栈 | React 18、TypeScript、Vite、Vitest、Playwright、axe-core |

本次发布将“今日总览”与身体健康、能力、情绪三个子模块的最新 UI/UX 改造合入主线。完整版本说明见 [CHANGELOG.md](./CHANGELOG.md)，发布快照见 [spec/releases/v2.2.0/README.md](./spec/releases/v2.2.0/README.md)。

## 已实现模块

| 模块 | 当前能力 | 主要目录 |
| --- | --- | --- |
| 财富 | 账户、流水、转账、月度账单、储蓄日历与支出分析 | `src/finance/` |
| 能力 | V5.1 平静指挥中心、首屏技能图、阶段与节点拖拽、按需连接点、学习资源、成果、下一步与工具收纳 | `src/ability/` |
| 身体健康 | 今日总览、训练动作库、饮食营养与食物库、日常提醒、身体围度、历史更正、回收站与备份恢复 | `src/health/` |
| 情绪 | 记录此刻、分类化情绪与活动、文字/图片/视频/语音/音乐、日记/内容库/日历回看 | `src/emotion/`、`server/music/` |
| 任务 | 任务中心与成长积分相关流程 | `src/tasks/` |
| 冒险日志 | 旅途、家园、投入与发现记录 | `src/adventure-journal/` |

## 快速开始

要求 Node.js 18 或更高版本。

```bash
npm install
npm run dev
```

默认地址：`http://127.0.0.1:5173/`

Windows 用户也可以双击仓库中的 `启动 Dice Life.bat`。

## 质量门禁

```bash
npm test
npm run build
npm run test:e2e
npm run test:a11y
```

模块开发完成后必须运行全仓测试和生产构建；UI 变更还需保留桌面、平板和移动端截图及 axe 结果。

## 仓库结构

```text
.
├─ api/                         # Serverless API 入口
├─ docs/                        # PRD、实施计划、审计与模块验收证据
│  ├─ 健康模块/
│  ├─ 情绪模块/
│  └─ git-branching-and-versioning-guide.md
├─ server/music/                # 音乐元数据解析与安全边界
├─ spec/releases/               # 正式版本快照
├─ src/
│  ├─ ability/                  # 能力模块
│  ├─ adventure-journal/        # 冒险日志
│  ├─ emotion/                  # 情绪模块
│  ├─ finance/                  # 财富模块
│  ├─ health/                   # 身体健康模块
│  └─ tasks/                    # 任务模块
├─ CHANGELOG.md                 # 整站版本时间线
├─ PROJECT_CONTEXT.md           # 产品上下文
├─ STYLE.md                     # 视觉规范
└─ package.json
```

## 分支结构

`main` 是唯一正式产品主线。模块工作使用 `codex/<module>/...` 命名，稳定后合回 `main`：

```text
main
├─ codex/ability/main
├─ codex/emotion/main
├─ codex/health/main
├─ codex/adventure-journal/main
└─ codex/economic-system/main
```

详细规则、版本时间线和命名规范见 [Git 分支与版本管理规范](./docs/git-branching-and-versioning-guide.md)。

## 数据与隐私

- 当前成长数据主要保存在浏览器本地。
- 健康模块提供 JSON 备份与恢复；恢复前会完成预检并要求确认整体替换。
- 健康提示仅用于记录和自我观察，不构成医疗诊断或治疗建议。
- 音乐解析只处理支持平台的公开链接，并限制响应体、重定向和目标地址范围。

## 版本资料

| 日期 | 版本 | 重点 |
| --- | --- | --- |
| 2026-08-15 | `V2.2.0` | 今日总览、能力 V5.1、健康 revision 2083、情绪平静指挥中心 |
| 2026-08-14 | `V2.1.0` | 情绪、能力、身体健康三模块整合 |
| 2026-07-02 | `V2.0` | 账户驱动经济系统 |
| 2026-06-28 | `v0.1-0628` | 经济系统早期备份 |

旧标签与历史分支只读保留，不覆盖、不强制改写，以保证 Git 历史可追溯。

## 许可证

仓库目前尚未添加开源许可证。用于公开分发或商业用途前，请先补充明确的许可证。
