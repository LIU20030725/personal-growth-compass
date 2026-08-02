# 能力模块质量审计工具调研

日期：2026-08-02

## 结论

能力模块不适合依赖一个“万能评分工具”。建议建立四层审计：

1. 浏览器端功能回归：发现操作失败、状态丢失、连线错误和撤回异常。
2. 产品红队审查：判断功能是否多余、概念是否重复、关键痛点是否遗漏。
3. UI/UX 与可访问性审查：评价信息层级、布局密度、反馈、键盘操作和响应式表现。
4. 真实用户行为验证：用漏斗、热图和会话回放验证推测，而不是只听 AI 的主观意见。

## 当前已具备、建议优先使用的 Skills

无需新增安装，按顺序组合使用：

| 阶段 | Skill | 作用 |
| --- | --- | --- |
| 需求与范围 | `grill-me`、`strategy-red-team` | 质疑功能必要性、边界和失败场景 |
| 规格对照 | `intended-vs-implemented` | 对照规格检查实现偏差 |
| 场景覆盖 | `test-scenarios`、`qa` | 生成异常、边界和组合操作场景 |
| 实机体验 | `ux-audit` | 像真实用户一样完成任务并记录交互证据 |
| 视觉质量 | `frontend-design-audit`、`ui-ux-pro-max` | 检查布局、层级、密度、响应式和一致性 |
| 发布质量 | `production-audit` | 汇总代码、运行时、性能和发布风险 |

建议每次迭代产生一份统一审计报告，放入 `src/ability/docs/audits/`，严重度统一为 Critical / High / Medium / Low。

## Bug 与交互回归工具

### 1. Playwright：首选

适合能力画布的拖动、缩放、连续新增、并行汇合、删除撤回、切换技能树和刷新恢复。它支持 Chromium、Firefox、WebKit、Trace Viewer，以及内置截图对比。官方视觉对比通过 `toHaveScreenshot()` 保存基线并在后续运行中检测像素变化。

- 官方项目：https://github.com/microsoft/playwright
- 视觉回归：https://playwright.dev/docs/test-snapshots
- 调试建议：https://playwright.dev/docs/best-practices

Skills 生态中可选 `bobmatnyc/claude-mpm-skills@playwright-e2e-testing`，约 2.7K 安装，安全扫描通过；但仓库星数约 63，且项目已经具备浏览器控制能力，因此不是当前必装项。

### 2. Storybook：节点状态矩阵

把技能节点、工具栏、并行组、成果节点分别做成 Story，可独立验证未开始、成长中、已掌握、选中、悬停、长名称、空数据、窄屏等状态。Storybook 支持交互测试、视觉测试和 axe 可访问性测试。

- 测试总览：https://storybook.js.org/docs/writing-tests
- 交互测试：https://storybook.js.org/docs/9/writing-tests/interaction-testing
- 可访问性：https://storybook.js.org/docs/9/writing-tests/accessibility-testing

它会增加组件维护成本，建议在能力画布进入稳定迭代期后引入，而不是立刻全项目铺开。

### 3. axe-core：可访问性自动门禁

适合检测缺失标签、错误 ARIA、对比度和常见 WCAG 2.2 问题，可与 Playwright 组合。官方说明平均可自动发现约 57% 的 WCAG 问题，剩余仍需键盘和人工测试。

- 官方项目：https://github.com/dequelabs/axe-core

### 4. Lighthouse CI：性能与基础质量

适合防止画布依赖和节点数量增长后出现性能退化，并在 CI 中设置性能、可访问性和最佳实践阈值。它不能评价技能树交互是否合理。

- 官方项目：https://github.com/GoogleChrome/lighthouse-ci

## UI 视觉回归工具

### 低成本方案：Playwright Screenshot

当前最适合。为桌面、窄屏、空树、单链、并行分支、复杂树、选中态建立 7 组截图基线，不引入云服务。

### 团队协作方案：Storybook + Chromatic

Chromatic 会在不同浏览器和视口中生成视觉快照并显示像素差异，适合以后多人评审和 PR 审核。缺点是需要云端账号，且无法判断变化在产品上是否正确。

- 官方说明：https://storybook.js.org/docs/8/writing-tests/visual-testing
- Chromatic：https://www.chromatic.com/storybook

### 本地开源备选：BackstopJS

适合纯截图回归，但本项目已经适合直接使用 Playwright，额外引入 BackstopJS 会产生重复能力。

- 项目：https://github.com/garris/BackstopJS

## 判断功能多余或痛点缺失

自动测试不能回答这个问题，建议使用两类证据：

1. 产品红队：用 `grill-me`、`strategy-red-team`、`ux-audit` 对核心任务逐项审查。
2. 真实行为：记录用户从“创建技能树”到“完成首次技能记录”的路径，查看放弃点、误点击和反复操作。

可选平台：

- PostHog：漏斗、事件、会话回放、功能开关和实验，适合验证功能使用率与路径流失。https://github.com/posthog/posthog
- Microsoft Clarity：免费热图、会话回放、rage click 等，适合早期低成本观察。https://learn.microsoft.com/en-us/clarity/session-recordings/recordings-overview
- OpenReplay：可自托管，会话回放同时关联错误、网络和性能信息。https://github.com/openreplay/openreplay
- Sentry：适合错误定位和错误发生前后的会话回放，不适合判断功能有没有价值。https://docs.sentry.dev/platforms/javascript/session-replay/

项目目前是本地优先应用。在没有真实用户和明确隐私策略前，不建议立即接入会话回放 SDK；先通过 5 至 8 名目标用户的任务测试收集证据。

## 第一轮审计应重点验证的假设

以下是待验证假设，不是最终结论：

1. 顶部“添加技能节点”和节点旁“＋”存在入口重复，可能增加选择成本。
2. 自动把同一父节点的全部子节点标记为“可并行”，可能把“备选路线”和“真正并行任务”混为一谈。
3. 手动辅助连线、拖拽换父级、并行汇合都属于高级能力，首屏暴露过多可能干扰首次使用。
4. 完整技能库、当前技能概览和画布同时出现，页面纵向较长，主任务焦点可能不够集中。
5. 画布已经能表达结构，但“今天该做什么”“下一个最小行动是什么”仍不够突出。
6. 长名称、大规模节点、触控设备、键盘焦点、误删后的多步撤回仍需专项压力测试。

## 推荐执行顺序

1. 先做一次产品红队审计，产出“保留 / 延后 / 删除 / 缺失”功能清单。
2. 再做桌面与窄屏 UX 实机审计，记录完成核心任务的步骤、失败点和截图。
3. 补 Playwright E2E、视觉截图基线和 axe 检查。
4. 修复 High/Critical 后，邀请 5 至 8 名用户完成规定任务。
5. 产品上线并取得用户授权后，再选择 PostHog、Clarity 或 OpenReplay。

## 推荐安装判断

- 现在不需要安装新插件即可完成第一轮审计。
- 如果需要自动生成和维护 E2E，可考虑 `playwright-e2e-testing` skill，但应先审阅其内容。
- 如果需要更强的独立视觉批评，可考虑 `pbakaus/impeccable@impeccable`；其 Skills 页面约 215.7K 安装、GitHub 约 53.6K stars，但安全审计存在 Warn，安装前必须人工审阅。
- 可用插件中，后续优先级是 `PostHog`（产品证据）与 `Sentry`（运行错误）；`Product Design` 可作为补充评审，而不是代替真实用户测试。
