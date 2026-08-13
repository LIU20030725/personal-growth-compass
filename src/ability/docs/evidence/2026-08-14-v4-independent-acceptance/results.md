# 能力模块 V4 独立验收结果

日期：2026-08-14

## 结论

自评：**通过**。本次差异引入的问题已修复并有回归测试；Severity 3/4 UX 问题为 0，两个 Severity 2 已说明接受理由。等待总控最终结论。

## Code review findings 与处置

| Severity | Finding / 根因 | 位置 | 处置与提交 |
|---|---|---|---|
| P1 | 画布节点打开详情后，关闭只聚焦画布容器，不能回到原触发节点；根因是 `closeDetails` 只保存了线性按钮引用。 | `AbilityModule.tsx` | 查找当前选中 React Flow 节点并优先恢复焦点；`68fb960`。 |
| P1 | 画布/阶段拖动保存失败后，本地 React Flow 坐标可能继续显示，和“调整未应用”提示矛盾；根因是提交函数未返回成功状态。 | `AbilityTreeStage.tsx` | 提交返回 boolean，失败立即以计算节点恢复；`68fb960`。 |
| P2 | 删除空阶段后偏好里可能残留 `phasePositions[phaseId]`；根因是领域删除与视图偏好未联动。 | `AbilityModule.tsx` | 删除成功后提交清理后的画布偏好；`7da1936`。 |

阶段顺序线只由 `order` 派生，未进入依赖/解锁计算；并行汇合只有所有未归档成员掌握后才进入“下一步”；成果表单固定当前节点；快捷键要求画布自身聚焦、单选节点、精确修饰键，并排除表单/菜单/弹窗。

## 自动化结果

| 门禁 | 结果 |
|---|---|
| 全仓 Vitest | `npm test`：26 文件、197 测试，0 失败，0 未处理异常。 |
| Playwright 非 axe | 隔离端口 4237：12/12 通过。 |
| axe | 隔离端口 4238：2/2 测试、7 个状态，critical/serious = 0。 |
| Production build | TypeScript + Vite 通过；1,775 modules；Ability chunk 293.48 kB / gzip 90.79 kB。 |
| `git diff --check` | 通过。 |

首次尝试 `npm test -- --maxWorkers=2` 在测试收集前因 Vitest `minThreads/maxThreads` 参数冲突退出；改用仓库原生 `npm test` 后稳定通过。这是命令参数冲突，不是产品用例失败。

## 浏览器旅程与控制台

- 全新数据：技能树→阶段→三个并行子节点→开始→掌握门禁→标准→成果→资源去重→线性路线→刷新，完成。
- V1 复杂数据：无损迁移到 Schema V2，旧任务关联和掌握说明保留但新 UI 不暴露旧入口。
- V2 历史数据：Ability Schema 保持 V2；缺失 `phasePositions` 安全读取为空；任务、掌握说明、资源、并行关系往返不变。
- 详情：节点单击打开，空白关闭，关闭后焦点回到原画布/线性节点。
- 键盘：Tab、表单、按钮、弹窗和额外 Alt/Meta/Ctrl/Shift 组合不误触；快捷键弹层困住焦点并在关闭后恢复。
- console error/warn、pageerror、requestfailed：两套关键数据旅程均为 0。仅测试 runner 输出 `NO_COLOR` 环境提示，不来自页面。

## UI/UX、响应式与可访问性

- 截图：`screenshots/00-1440-empty.png`、`01-1440-parallel-candidates.png`、`02-1440-stage-dragged.png`、`03-1440-detail-open.png`、`04-1024-linear-route.png`、`05-390-mobile-detail.png`。
- 同目录中不在上述清单内的同名前序号截图是首次脚本滚动位置不正确时产生的未采用草稿；因本机命令策略拒绝删除，保留但不作为验收依据。
- 人工核对：节点/边无穿透或错位；阶段标题、并行外框与节点网格一致；页面无横向溢出；移动详情主操作可达。
- 720×450 等效检查 1440 桌面 200% 缩放：下一步与视图切换可达、无页面横向溢出。
- 390px 详情的可交互元素通过 44×44 门禁。
- 键盘焦点、Enter/Space、关系导航、Esc、弹层、焦点回归均有单元/Playwright 覆盖。
- Frontend Design Audit 15 原则与 UX Audit 见同目录报告；标注备用页为 `annotated.html`。

## 性能

- 20 阶段 / 200 节点浏览器样本：ready 1,472ms；下一步定位 784ms；阶段拖动+撤销 923ms。
- PerformanceObserver 记录 12 个 long task，最长 133ms。未出现布局无限循环、控制台警告风暴或明显交互卡死。
- 结论：代表性大数据可用；后续若扩展到千级节点，应考虑可视区域渲染和布局 worker。

## 修复与验收提交

- `68fb960`：详情焦点恢复、保存失败拖动回滚。
- `bd6c5b5`：V4 独立领域与浏览器验收覆盖。
- `a8188d4`：等效 200% 缩放 reflow 门禁。
- `7da1936`：删除阶段时清理孤儿画布位置。
- 最终证据归档提交：见本文件所在提交。

## 已知限制

1. UX Audit / Frontend Design Audit 本机技能包缺少 `annotate.py`、`heuristics.md`、`patterns.md`；已按技能规定输出 `annotated.html` 备用标注，并根据 SKILL.md 正文完成 15 原则审计。
2. 桌面工具条 7 个动作密度偏高（S2）；移动详情顶部仍露出少量背景操作（S2）。两者不阻塞本轮目标，建议后续统一做低频动作收纳/backdrop。
3. 200 节点存在最长 133ms 长任务，但关键动作均低于验收预算；千级节点未覆盖。
