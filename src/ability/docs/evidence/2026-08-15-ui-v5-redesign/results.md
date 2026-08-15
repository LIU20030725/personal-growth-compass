# 能力模块 V5 Calm Command Center 验证结果

- 日期：2026-08-15
- 分支：`codex/ability-ui-v5`
- 基线：`origin/main` / `e82e31b`
- 最终实现提交：`ac2707a`
- 设计锁：总控共享规范 `16ab4c5` + 能力模块 A 方案

## 覆盖映射

| 目标 | 自动化与证据 | 结果 |
| --- | --- | --- |
| 连接圆点按需显示分支加号 | `AbilityModule.test.tsx`、V5 Playwright 三档流程、`1440-canvas-branch-port.png` | 默认仅圆点；hover/focus 显示加号；Enter/Space 可创建直接子节点 |
| 阶段随所属节点四向扩缩 | `abilityCanvasLayout.test.ts`、V5 Playwright 拖动流程、`1440-stage-expanded.png` | 越界后容器扩张；拖回后收缩；阶段 ID 不变 |
| 拖动后的连线完整性 | `abilityCanvasGeometry.test.ts`、三/五/多层像素门禁 | 父节点位于子节点右侧时仍连接到目标边缘，不断线、不穿节点 |
| Calm Command Center 信息层级 | 三档截图、frontend-design-audit、A 方案 reference lock | 每页单一主 CTA；画布、工具栏、详情层级统一 |
| 移动端详情隔离与焦点恢复 | V5 Playwright 390px 流程 | 背景整体 inert；关闭后焦点回到原线性节点 |
| 44px 触控目标 | CSS 目标收口 + 390px 浏览器断言 | 详情关闭、过滤/切换、撤销、资源、折叠等操作目标不小于 44px |
| 无障碍 | `npm run test:a11y` | 2/2 通过；axe critical/serious = 0 |
| 历史兼容 | V1/V2 Playwright 验收 + 全仓单元测试 | Schema 仍为 V2；既有数据键、迁移和画布偏好不变 |
| 压力场景 | V4 independent acceptance 20 阶段/200 节点 | 串行无资源争用环境通过原性能门槛，无浏览器异常 |

## 最终门禁

- 定向能力测试：4 个文件、83 项测试通过。
- 整仓测试：69 个文件、448 项测试通过，0 失败、0 未处理异常。
- Playwright：`npm run test:e2e -- --workers=1`，13/13 通过。并发三 worker 首次运行仅 200 节点计时受资源争用影响（2.332s > 2s）；未放宽门槛，改用单 worker 干净端口重跑完整套件后通过。
- axe：`npm run test:a11y`，2/2 通过；画布、线性路线、资源表单、弹窗与移动详情均为 0 critical / 0 serious。
- 生产构建：TypeScript 与 Vite 构建通过，1834 个模块；Ability JS 293.71 kB（gzip 91.13 kB），Ability CSS 63.19 kB（gzip 10.75 kB）。
- 视觉基线：三分支、五分支、多层分支像素门禁通过；V5 新增三档关键状态截图已人工检查。
- 浏览器异常：既有关键流程对 console error/warn、pageerror、requestfailed 的断言继续通过；仅出现 Playwright 运行环境的 `NO_COLOR` 提示，不来自产品页面。

## V5 截图

目录：`src/ability/docs/evidence/2026-08-15-ui-v5-redesign/screenshots/`

- `1440-canvas-branch-port.png`：连接圆点 hover 后显示加号。
- `1440-canvas-branches.png`：桌面三分支与工作台层级。
- `1440-stage-expanded.png`：节点越界后原阶段框扩张包住节点，反向路径仍完整。
- `1024-detail-overlay.png`：中等桌面详情覆盖，不压缩画布、不产生页面横向溢出。
- `390-linear-bottom-detail.png`：移动线性路线、底部详情与背景隔离。

## 审计处置

- Severity 3：6/6 已修复。覆盖永久加号、阶段单向增长、工具遮挡、动作层级重复、1024px 详情挤压、移动端小触控目标。
- Severity 2：菜单点击外部关闭、资源重复入口、资源错误关联、移动详情背景隔离、详情层级等均已修复；确认交互继续沿用现有统一弹窗，不引入新依赖。
- Refero MCP 返回 `NO_SUBSCRIPTION`，按总控指令未重试；研究文档只记录可验证的公开参考，不声称获取了 Refero screen/flow ID。

## 已知限制

1. 复杂画布编辑仍以桌面为主；390px 默认提供完整线性路线与底部详情，不在手机强塞自由画布。
2. 阶段框可能因所属节点远距离拖动而变得很宽；这是“不因误拖改变学习结构”的明确产品取舍，可通过重新自动布局恢复。
3. 阶段归属仍需在节点编辑表单中显式修改；仅把节点拖入另一阶段视觉区域不会迁移归属。
4. 多浏览器并行运行性能测试会受本机 CPU 争用影响，因此正式性能证据采用单 worker；功能 E2E 仍可并行运行。

**状态：实现与开发验收完成，等待总控集成。**
