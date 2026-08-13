---
type: ux-audit
date: 2026-08-14
product: Dice Life 能力模块 V4
journey: 创建与推进技能树、查看节点详情
platform: desktop-web / mobile-web
screens: 6
findings-critical: 0
findings-major: 0
findings-minor: 2
findings-cosmetic: 0
---

# 能力模块 V4 UX 审计

## 结论

核心旅程可完成，阶段—节点—成果的对象归属明确，“下一步”降低了用户在复杂树中的定位成本。没有可见的 Severity 3/4 问题。两项 Severity 2 均不阻塞目标：桌面工具条的操作密度偏高；移动详情虽已占据主视觉，但顶部仍露出部分背景操作。

## 范围与方法

- 目标：用户创建技能树、理解阶段和并行关系、定位下一步并在节点中记录证据。
- 用户：首次与回访用户混合。
- 屏幕：`screenshots/00-1440-empty.png` 至 `screenshots/05-390-mobile-detail.png`。
- 框架：Nielsen、Shneiderman、Bastien & Scapin、Hick/Fitts、Gestalt、Norman、WCAG 2.1 静态子集、内容设计。
- 静态图不可独立判断的行为由 Playwright/axe 补充：键盘、焦点、重排、延迟、读屏语义。
- UX Audit 安装包缺少声明的 `scripts/annotate.py`，按技能备用规则输出自包含 `annotated.html` 与 `annotations.json`。

## Findings

### [S2] F-01 · 画布工具条扫描负担偏高

- Check：OVERLOAD。
- Heuristics：Hick's Law；Nielsen #8；B&S Workload。
- Evidence：`01-1440-parallel-candidates.png` 中工具条同时呈现添加阶段、添加节点、自动布局、定位、撤销、重做、快捷键七项。
- Impact：新用户需要先辨别结构、视口、历史和帮助四类操作，进入核心“添加/推进”动作略慢。
- Recommendation：后续可将“重新自动布局、快捷键”收进低频菜单，保留添加、定位、撤销/重做；本轮接受，因为所有动作有文字标签且未阻挡流程。

### [S2] F-02 · 移动详情的背景层仍产生轻微竞争

- Check：HIERARCHY-FLAT。
- Heuristics：Gestalt Figure/Ground；Nielsen #8；Fitts's Law。
- Evidence：`05-390-mobile-detail.png` 顶部仍能看到背景页的“修改技能树资料/添加阶段”边缘。
- Impact：详情打开的瞬间，背景操作与当前节点操作存在轻微视觉竞争，但主内容和关闭按钮完整可达。
- Recommendation：后续在移动详情打开时加入低透明度 backdrop，或将详情顶边提升到导航下方；本轮接受，因为焦点、触控尺寸和关闭路径均通过自动化。

## What works

- P-01：空态采用单一主 CTA 与简短说明，满足 Nielsen #6、#10 和 Content #3。
- P-02：阶段容器、节点边、并行外框使用不同形状与位置编码，满足 Gestalt Common Region 和 Tog “颜色不是唯一载体”。
- P-03：“下一步 · 2”同时表达动作和候选数量，满足 Nielsen #1 与 Fogg Prompt。
- P-04：桌面画布和移动线性路线分别匹配输入设备能力，满足 Shneiderman Universal Usability。
- P-05：详情按“掌握标准—学习资源—真实成果”排列，符合用户证明成长的心智顺序。

## Journey-level assessment

- Fogg B=MAP：动机由成长进度与成果支撑；能力通过“下一步”、线性移动路线和节点内资源降低成本；提示在候选按钮与节点加号处及时出现。
- Peak-End：空态起点明确；完成证据后可以确认掌握，形成清楚闭环。
- 200% 缩放、键盘、焦点、触控尺寸与 axe 结果见 `results.md`，不从静态图臆测。

## 优先级

1. 发布阻塞：无。
2. 计划优化：F-01、F-02，均为 Severity 2，接受理由见上。
3. 应保留：空态单 CTA、“下一步”候选数、节点内成果与资源、移动线性路线。
