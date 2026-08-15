# 能力模块 V5｜参考研究与 Reference Lock

日期：2026-08-15  
范围：能力模块画布、线性路线、节点详情、资源库、响应式与键盘交互

## 1. Refero 连接结果

按要求直接使用已连接的 Refero MCP，未安装 `refero-design` 技能，也未购买或申请外部订阅。

### 1.1 已执行检索

| 类型 | 查询 | 结果 |
| --- | --- | --- |
| screen | `mind map editor canvas node connector contextual add button` | `NO_SUBSCRIPTION` |
| screen | `learning roadmap curriculum progress skill detail` | `NO_SUBSCRIPTION` |
| screen | `resource library side panel linked articles videos` | `NO_SUBSCRIPTION` |
| flow | `creating new document and organizing content` | `NO_SUBSCRIPTION` |
| flow | `creating project and adding tasks` | `NO_SUBSCRIPTION` |
| style | `productivity SaaS with airy spacing calm interface` | `NO_SUBSCRIPTION` |
| style | `playful creator tool landing page with vivid accent` | `NO_SUBSCRIPTION` |
| style | `editorial SaaS typography warm neutral` | `NO_SUBSCRIPTION` |

统一返回：`Your subscription is not active or has expired. Please visit https://refero.design/mcp/upgrade`。

因此本轮不存在可诚实记录的 Refero screen/flow/style ID。以下研究全部标记为“官方公开资料替代证据”，不冒充 Refero、Mobbin 或 Page Flows 结果。该限制不阻塞现有技术栈内的原型与实现。

## 2. 三类屏幕/流程参考

### 2.1 画布分支创建：飞书画板 / 飞书思维导图 / Miro Mind Map

证据：

- 飞书画板节点数据结构：<https://open.feishu.cn/document/docs/board-v1/data-structure?lang=zh-CN>
- 飞书思维导图操作说明：<https://www.feishu.cn/hc/en-US/articles/360049067712/>
- 飞书画板图形与“快捷创建”说明：<https://www.feishu.cn/hc/en-US/articles/696582613898-use-shapes-on-a-board/>
- Miro Mind Map：<https://help.miro.com/hc/en-us/articles/360017730753-Mind-map>

可借鉴规律：

1. 子节点入口属于“连接点”，不是节点卡片右上角的常驻按钮。
2. 入口只在节点被指向、选中或连接点获得键盘焦点时显现；离开后恢复为安静圆点。
3. 每次激活只创建一个直接子节点；连续三次就是三个并行子节点。
4. 创建后立即进入命名，并让新节点可见；同级节点由布局系统保持对齐。
5. 节点编辑、结构创建、缩放定位各自有稳定入口，避免一个悬浮工具条同时承载所有动作。

明确拒绝照搬：

- 不采用飞书思维笔记的 `Tab` 新建子节点，因为本产品此前出现过全局 Tab 劫持，且用户已明确要求保留原生焦点导航。
- 不采用 Miro 的“拖动即重新挂载父级”；本模块的阶段和依赖是学习结构，误拖不能改变语义。
- 不把节点样式、颜色编辑等通用白板能力带入 V5。

### 2.2 学习路线与下一步：Duolingo / Khan Academy

证据：

- Duolingo 路径改版：<https://blog.duolingo.com/new-duolingo-home-screen-design/>
- Duolingo mini-units：<https://blog.duolingo.com/intermediate-mini-units/>
- Khan Academy Course and Unit Mastery：<https://support.khanacademy.org/hc/en-us/articles/115002552631-What-are-Course-and-Unit-Mastery->
- Khan Academy Mastery Learning：<https://support.khanacademy.org/hc/en-us/articles/360030753412-Why-Mastery-Learning-by-Sal-Khan>

可借鉴规律：

1. 首屏优先回答“我现在该做什么”，完整结构用于理解全貌和维护计划。
2. 长路线需要“回到当前位置”的稳定入口，减少用户在大画布中迷失。
3. 阶段标题说明将要获得的能力，而不是仅显示序号。
4. 掌握状态应来自练习、标准或成果等证据，不能只靠用户随手点亮。
5. 大路径在移动端使用线性路线，不把桌面画布压缩进窄屏。

明确拒绝照搬：

- 不采用 Duolingo 单一路径替代用户自建的并行技能树。
- 不引入积分、连续打卡、动画角色和强游戏化。
- 不引入 Khan Academy 的统一百分制；个人技能的证据类型差异过大。

### 2.3 节点内资源库：Notion Web Clipper / Milanote

证据：

- Notion Web Clipper：<https://www.notion.com/en-gb/help/web-clipper>
- Notion 学习资源组织指南：<https://www.notion.com/en-gb/help/guides/get-organized-for-a-new-semester-with-notion>
- Milanote Visual Project Management：<https://milanote.com/product/project-management>

可借鉴规律：

1. 收藏是轻量动作：链接、标题、来源和备注即可完成，不要求先填写完整元数据。
2. 资源作为独立对象保存，再关联到一个或多个学习节点，避免复制与失联。
3. 资源只在节点详情中出现；画布卡片只显示精简计数或状态，不展示链接列表。
4. 空态优先解释“为什么收藏”，主操作只有一个；已有资源与新建资源分流。
5. 资源可以被再次打开、编辑和解除当前关联，但多节点共享时不误删本体。

明确拒绝照搬：

- 不把资源库做成全屏数据库或可自由排布的素材墙。
- 不把标签、视图、排序、封面、复杂属性全部塞进节点详情。
- 不在 V5 增加浏览器扩展、内容抓取或外部数据上传。

## 3. 两类风格参考

### 3.1 主风格：Linear 的安静专业编辑器

证据：

- Linear 2026 UI Refresh：<https://linear.app/changelog/2026-03-12-ui-refresh>
- A calmer interface for a product in motion：<https://linear.app/now/behind-the-latest-design-refresh>

借鉴：

- 主内容获得最高对比，导航和辅助控件主动后退。
- 相同层级的标题、控制条和动作在不同状态中保持位置一致。
- 暖一点但仍清脆的中性色，轻边框、少阴影、克制圆角。
- 高信息密度不等于每个元素都高强调；只让当前任务和主操作竞争注意力。

不照搬：Linear 的深色开发者气质、极细小控件和高密度快捷键文化不直接用于个人成长场景。

### 3.2 借用细节：Milanote 的创作温度

证据：<https://milanote.com/product/project-management>

只借两点：

- 轻暖画布与略带纸感的空间，让长期规划不像冷冰冰的后台系统。
- 内容可逐步长大、保留自由位置的创作感。

明确拒绝：不采用自由卡片墙、不去掉网格、不使用大量图片卡、贴纸或装饰字体。

## 4. Reference Lock

### 4.1 北极星

“一眼知道下一步，靠近节点才出现结构操作；画布像安静的学习工作台，而不是功能展板。”

### 4.2 布局锁定

1. 顶部只保留技能树切换、视图切换、下一步和溢出菜单；低频管理动作进入菜单。
2. 桌面以画布为主，详情作为上下文检查器；详情打开时不压碎画布。
3. 中等宽度详情改为覆盖式抽屉或单列下置，禁止出现画布与详情各半且都不可用。
4. 移动端默认线性路线，节点详情使用底部面板；画布只提供明确的“桌面查看”提示。
5. 阶段是语义容器：节点无论拖到视觉上的哪里，仍归属原阶段；原阶段边界按所属节点四向扩缩。

### 4.3 信息层级锁定

1. 第一层：当前技能树、下一步节点、阶段进度。
2. 第二层：节点名称、状态、必修/锁定语义、依赖路径。
3. 第三层：掌握标准、资源、成果。
4. 第四层：结构管理、删除、重排、批量设置。

### 4.4 交互锁定

1. 单击节点：立即打开详情。
2. 单击画布空白：关闭详情并保持画布焦点。
3. 子节点创建：来源连接点静默显示为圆点；hover/focus-within 时圆点变为可读的加号；每次只建一个直接子节点。
4. 连接点必须提供至少 44×44px 的鼠标/触控命中区，可键盘聚焦并有可访问名称；hover 不是唯一完成方式；不使用 Tab 作为创建快捷键。
5. 节点拖动只改变该节点在所属阶段中的手工位置，不改变 stageId；阶段框实时/落点后自适应包住全部所属节点。
6. 结构性动作只在明确上下文出现；节点详情里的学习动作不与画布结构动作混在同一工具条。
7. 下一步：定位、居中并打开详情；并行候选用稳定轮换，并显示候选数量。

### 4.5 Dice Life 视觉适配

| 角色 | 规则 |
| --- | --- |
| 画布 | 冷白/轻暖白，点阵更淡；不使用大面积灰蓝底 |
| 鼠尾草 | 阶段边界、完成状态和辅助信息；不用于主 CTA |
| 柔黄 | 当前选择、下一步和唯一主操作；同屏不超过一个高强度黄色动作 |
| 边框 | 默认低对比 1px；选中时增强，不靠阴影堆层级 |
| 圆角 | 控件 10–12、节点/卡片 14–16、弹层 16；不再混用过多档位 |
| 阴影 | 只用于浮层/抽屉/悬浮菜单；节点与阶段不使用重阴影 |
| 字体 | 系统无衬线；层级靠字号、字重和留白，不用装饰字 |

### 4.6 明确禁用项

- 常驻在节点右上角的方形 `+`。
- 选中节点后同时出现顶部工具条、右上角加号、右侧详情三套动作层。
- 拖入另一个阶段即可悄悄改变结构。
- 为了“可爱”加入渐变、emoji 装饰、玻璃拟态、大胶囊和高饱和多色状态。
- 在画布节点中展开资源链接、成果全文或大段掌握标准。
- 用颜色作为锁定、必修、完成的唯一表达。
- 在移动端缩小桌面画布冒充响应式。

## 5. 原型验收问题

三套结构原型必须用同一份真实数据回答：

1. 从进入页面到开始“下一步”需要几次操作？
2. 用户能否在 3 秒内分辨当前技能、下一步和阶段进度？
3. 连接点加号是否只在需要时出现，且不遮挡节点文本/连线？
4. 详情打开后，画布是否仍保留足够的方向感？
5. 1024px 是否避免两块内容都被压缩？
6. 390px 是否能用一只手完成打开节点、查看资源、记录成果、关闭详情？
7. 全流程是否保留原生 Tab、可见焦点、语义名称和至少 44px 的移动端触控目标？
