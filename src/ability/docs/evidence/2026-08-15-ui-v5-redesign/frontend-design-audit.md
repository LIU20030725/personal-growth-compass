# 能力模块 UI/UX 审计（V5 重设计前）

- 日期：2026-08-15
- 基线：`origin/main` / `e82e31b`
- 范围：能力首页、技能库、当前技能概览、画布、线性路线、节点详情、资源区、空态、错误提示、菜单、弹窗、快捷键说明，以及 1440×900、1024×768、390×844 响应式状态。
- 方法：源码审查 + 本地真实页面操作 + 三档视口检查。
- 说明：`frontend-design-audit` 包内声明的 `references/heuristics.md` 未随本机 skill 安装提供；本报告依据 skill 内置的 15 项原则、严重度规则及实际页面证据完成，不虚构缺失参考文件的内容。

## 摘要

| 严重度 | 数量 |
| --- | ---: |
| 4 - 灾难 | 0 |
| 3 - 严重 | 6 |
| 2 - 一般 | 7 |
| 1 - 轻微 | 2 |
| **合计** | **15** |

最优先的三项整改：

1. 把常驻右上角 `＋` 改为连接圆点悬停/键盘聚焦后显现，消除节点、阶段标题与悬浮工具条的冲突。
2. 阶段框按所属节点四向边界自动扩缩，节点即使拖入其他阶段视觉区域也不改变归属。
3. 收敛“页面级—画布级—节点级”操作层级，解决重复新增入口和 1024px 详情面板挤压画布。

## Findings

### Severity 3

#### 1. 新建子分支入口脱离连接圆点且永久占位

- 原则：11 Affordances and Signifiers、6 Recognition Over Recall、8 Aesthetic and Minimalist Design
- 位置：`src/ability/components/AbilityTreeStage.tsx:182`；`src/ability/AbilityModule.css:66`
- 问题：按钮固定悬在节点右上角，与实际右侧 source handle 分离；所有节点都会显示按钮，选择后还会同时出现顶部工具条。
- 用户影响：用户难以把“从此节点长出分支”与连接圆点建立映射；节点多时画布被大量 `＋` 覆盖，且容易误点。
- 修复：保留可访问按钮，但将其与 source handle 共用一个端口容器；默认只显示圆点，端口 hover、focus-within 或节点键盘选中时展开 32–36px 的 `＋`，点击仍只创建直接子节点。

#### 2. 阶段框只会向下增高，不能四向包住所属节点

- 原则：1 Visibility of System Status、3 User Control and Freedom、15 Tolerance and Forgiveness
- 位置：`src/ability/abilityCanvasLayout.ts:219-225`
- 问题：布局只计算 `memberBottom`，没有根据节点的最小/最大 X、最小 Y 重算阶段 x/y/width/height，也不会在节点拖回后收缩。
- 用户影响：节点仍属于原阶段，却在视觉上掉出阶段框；用户会误判阶段归属，画布结构与真实数据不一致。
- 修复：用阶段全部可见成员的四向 bounding box 派生容器；顶部额外保留 80px 标题区，左右/底部保留 32/64px 内边距，尺寸按 16px 网格取整并允许回缩至最小 320×320。拖入其他阶段只扩张原阶段，不改领域归属。

#### 3. 选中工具条、节点标题和加号互相遮挡

- 原则：12 Structure、14 Perceptibility、5 Error Prevention
- 位置：`src/ability/components/AbilityTreeStage.tsx:157-187`；`src/ability/AbilityModule.css:66-70`
- 问题：工具条放在节点正上方，加号放在右上角；节点靠近阶段标题时两者进入标题区并遮住阶段说明。
- 用户影响：用户看不清阶段上下文，删除和新建操作距离过近，增加误操作风险。
- 修复：删除/详情工具条移到节点内部上沿或上下文菜单；新增端口固定在右侧中线，阶段自动布局为工具条预留安全间距。

#### 4. 页面级、画布级、节点级操作重复且层级不清

- 原则：6 Recognition Over Recall、8 Aesthetic and Minimalist Design、12 Structure
- 位置：`src/ability/AbilityModule.tsx:247-267`；`src/ability/components/AbilityTreeStage.tsx:818-834`
- 问题：页面上同时存在“添加阶段/下一步/筛选/切视图”，画布内又有“添加下一阶段/添加技能节点/重置/定位/撤销/重做/快捷键”，节点再提供加号与工具条。
- 用户影响：首次使用者要在三个区域寻找同一类动作；Hick 成本高，核心“选择下一项并推进”被结构编辑工具淹没。
- 修复：顶部保留技能级动作与“下一步”；画布工具条只保留视图操作（定位、撤销/重做、重置、快捷键）；结构创建回到阶段空态和节点端口。

#### 5. 1024px 下详情面板仍强制双列，覆盖预期单列规则

- 原则：12 Structure、13 Accessibility、14 Perceptibility
- 位置：`src/ability/AbilityModule.css:51`、`src/ability/AbilityModule.css:212-213`
- 问题：`.ability-workbench.has-detail` 的特异性高于媒体查询中的 `.ability-workbench`，导致 1024px 实测仍为画布 + 300–360px 详情双列。
- 用户影响：画布有效宽度骤减，节点和阶段被裁切，缩放/定位工具挤到内容上方；低视力用户放大后问题加剧。
- 修复：在 ≤1180px 明确覆盖 `.ability-workbench.has-detail { grid-template-columns: 1fr; }`，详情采用下方内联面板；≤680px 再切换为底部 sheet。

#### 6. 移动端技能库管理入口只有 28×28px

- 原则：13 Accessibility、11 Affordances and Signifiers、5 Error Prevention
- 位置：`src/ability/AbilityModule.css:175`；`src/ability/components/SkillLibrary.tsx:111`
- 问题：390px 实测“管理技能树”触控目标为 28×28px，低于 44×44px；同一屏上“查看全部/新建/筛选”也存在 34–36px 高度。
- 用户影响：拇指操作容易点错相邻技能卡，归档/置顶等结构动作风险更高。
- 修复：移动端将技能库管理入口、筛选和主要工具统一到至少 44×44px，并保持可见 focus ring。

### Severity 2

#### 7. 详情面板所有操作拥有接近的视觉权重

- 原则：8 Aesthetic and Minimalist Design、12 Structure、14 Perceptibility
- 位置：`src/ability/components/AbilityNodePanel.tsx:44-67`；`src/ability/AbilityModule.css:105-109`
- 问题：“编辑节点、开始学习、收藏、记录成果、关闭”均使用硬边框和接近的粗细，详情标题又占据很强视觉权重。
- 用户影响：用户难以迅速判断当前最重要动作；阅读顺序被按钮边框切碎。
- 修复：每个详情状态只保留一个主按钮；资源/成果采用次级文字按钮；标题、状态、说明、掌握标准形成明确层级。

#### 8. 资源新增入口重复，状态切换缺乏位置连续性

- 原则：4 Consistency and Standards、6 Recognition Over Recall、7 Flexibility and Efficiency
- 位置：`src/ability/components/AbilityResourceSection.tsx:88-139`
- 问题：标题处“收藏”与底部“从资源库选择”是两套入口；新链接和资源库表单互相替换，操作上下文会跳动。
- 用户影响：用户需要先判断“收藏”是否包含已有资源；切换后按钮位置变化，增加重复探索。
- 修复：统一为“添加资源”菜单，首选“粘贴链接”，次选“从资源库选择”；在同一展开容器内切换 tab/segmented control。

#### 9. 技能库、资源和更多菜单没有点击外部关闭

- 原则：3 User Control and Freedom、4 Consistency and Standards、15 Tolerance and Forgiveness
- 位置：`src/ability/components/SkillLibrary.tsx:111-120`；`src/ability/components/AbilityResourceSection.tsx:126-134`；`src/ability/AbilityModule.tsx:250-257`
- 问题：菜单支持 Escape 和方向键，但没有统一 click-away；打开一个菜单后点击画布可能留下悬浮层。
- 用户影响：菜单会遮挡邻近内容，用户必须回到原触发器或记住 Escape。
- 修复：抽取轻量菜单控制器，支持外部点击关闭、Escape、焦点返回和同类菜单互斥。

#### 10. 画布说明条与快捷键面板重复，并长期占据纵向空间

- 原则：8 Aesthetic and Minimalist Design、10 Help and Documentation
- 位置：`src/ability/components/AbilityTreeStage.tsx:695`；`src/ability/AbilityModule.css:53`
- 问题：说明条常驻两行交互文案，同时工具条已有“快捷键”入口。
- 用户影响：熟练用户持续支付空间成本；窄屏画布更容易被压缩。
- 修复：首次进入显示一次轻量提示，之后折叠为“？”；快捷键面板保留完整说明。

#### 11. 节点详情底部 sheet 打开时背景仍可滚动和操作

- 原则：3 User Control and Freedom、13 Accessibility、15 Tolerance and Forgiveness
- 位置：`src/ability/AbilityModule.css:222`；`src/ability/components/AbilityNodePanel.tsx:44`
- 问题：390px 下详情覆盖 82dvh，但仍是普通 complementary，不锁定背景滚动，也没有 sheet 的标题/拖拽/关闭语义。
- 用户影响：滚动详情时可能带动背景，关闭后失去原路线位置；屏幕阅读器仍会遍历被遮挡内容。
- 修复：移动端详情使用语义化非模态 sheet 容器，打开时冻结背景滚动并将背景设为不可交互；关闭后恢复到触发节点。

#### 12. 表单错误只显示文字，没有与字段建立程序化关联

- 原则：5 Error Prevention、9 Error Recovery、13 Accessibility
- 位置：`src/ability/components/AbilityForms.tsx:65-83`
- 问题：技能树名称为空时显示 `.ability-form-error`，但输入框没有 `aria-invalid/aria-describedby`，错误也没有 `role=alert`。
- 用户影响：读屏用户不知道哪个字段失败；键盘用户提交后焦点不会回到错误字段。
- 修复：为错误生成 id，给字段加 `aria-invalid` 和 `aria-describedby`，错误使用 `role="alert"`，提交失败后聚焦首个错误字段。

#### 13. 原生确认框破坏设计和焦点连续性

- 原则：4 Consistency and Standards、5 Error Prevention、9 Error Recovery
- 位置：`src/ability/components/AbilityForms.tsx:105`；`src/ability/components/AbilityResourceSection.tsx:130`
- 问题：阶段/资源删除使用 `window.confirm`，与已有可访问 DialogFrame 不一致，也不能展示影响范围。
- 用户影响：删除体验突兀；资源仍被其他节点引用等上下文无法完整表达。
- 修复：复用紧凑确认对话框，明确对象名称、影响与不可恢复性；危险按钮单独使用语义色。

### Severity 1

#### 14. 组件样式绕过模块 token，圆角和阴影缺少统一尺度

- 原则：4 Consistency and Standards、8 Aesthetic and Minimalist Design
- 位置：`src/ability/AbilityModule.css:53-87`
- 问题：画布区域混用 3/4/6/9/10/12/20px 圆角及多组硬编码颜色、阴影。
- 用户影响：不会阻断任务，但界面呈现“多个插件拼装”的感觉。
- 修复：建立能力模块局部 token：4/8/12px 间距、6/12px 圆角、两级阴影、冷白/鼠尾草/柔黄颜色角色。

#### 15. 中英文标签混用增加视觉噪声

- 原则：2 Match Between System and Real World、4 Consistency and Standards
- 位置：`src/ability/AbilityModule.tsx:232-234`；`src/ability/components/AbilityNodePanel.tsx:35-45`；`src/ability/components/AbilityForms.tsx:49`
- 问题：`Ability Tree · Manual First`、`SKILL DETAIL`、`Manual Builder` 与中文标题并列，但没有信息功能。
- 用户影响：轻微增加扫描成本，弱化产品自己的中文语气。
- 修复：保留 Dice Life 品牌英文名，其余功能标签改为简洁中文或只保留一处小型英文 eyebrow。

## 15 项原则覆盖

| 原则 | 结论 |
| --- | --- |
| 1 系统状态可见 | 阶段边界与真实归属不同步；持久化错误 banner 是优点。 |
| 2 贴近现实世界 | “阶段—节点—成果”模型清晰；中英文装饰标签略干扰。 |
| 3 控制与自由 | 画布撤销/重做和 Escape 良好；菜单 click-away、移动 sheet 背景控制不足。 |
| 4 一致性 | 菜单键盘语义较一致；确认框、资源入口和局部视觉 token 不一致。 |
| 5 错误预防 | 掌握门禁和阶段删除限制良好；危险操作邻近、表单错误关联不足。 |
| 6 识别优于记忆 | 节点状态有文字；操作分散与重复入口增加寻找成本。 |
| 7 灵活高效 | 快捷键、下一步和技能搜索是优点；重复资源入口降低效率。 |
| 8 极简美学 | 冷白底与柔黄强调方向正确；按钮、边框和常驻工具过多。 |
| 9 错误恢复 | 保存失败反馈、撤销恢复良好；原生确认与字段错误恢复不足。 |
| 10 帮助文档 | 快捷键面板完整；常驻说明条重复占位。 |
| 11 可供性 | 节点可拖拽、状态可读；新增按钮与连接端口映射错误。 |
| 12 结构 | 阶段容器是正确抽象；工具条层级和 1024 详情布局需重构。 |
| 13 可访问性 | DialogFrame 焦点陷阱、Escape、inert、焦点返回实现良好；小触控目标和移动 sheet 仍有缺口。 |
| 14 可感知性 | 状态不只靠颜色；遮挡、等权按钮和窄屏裁切降低可感知性。 |
| 15 容错 | 拖拽吸附、历史记录和不因误拖改阶段值得保留；阶段框尚未跟随成员。 |

## Strengths（应保留）

1. **弹窗无障碍基础扎实**：`DialogFrame` 已具备初始焦点、Tab 圈定、Escape、背景 inert 与关闭后焦点恢复，符合控制自由与可访问性原则。
2. **画布快捷键作用域安全**：快捷键只在画布明确聚焦时生效，不劫持 Tab；同时提供完整快捷键说明。
3. **画布与线性路线双入口**：桌面保留空间化技能树，移动端默认线性路线，避免在 390px 强塞复杂画布。
4. **状态与证据语义可靠**：节点状态有文字标签，掌握门禁要求标准或成果，阶段进度以必修节点计算。
5. **恢复能力完整**：领域与画布均有撤销/重做，存储失败有可见提示，重置布局可恢复自动对齐。

## 审计阶段处置结论

- Severity 3：全部进入本轮实现。
- Severity 2：1–13 全部修复，不做“接受风险”跳过。
- Severity 1：在不扩大业务范围的前提下随设计 token 和文案整理处理。
- 不改变：Ability Schema V2、阶段领域归属、解锁算法、成果/资源数据模型、移动端默认线性路线。
