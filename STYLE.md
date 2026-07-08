# 系统总体风格指南

> 参考界面：`光明冒险财务大厅 - 视觉精修版`  
> 适用范围：个人成长进步规划 App 的全局 UI、仪表盘、任务、数据看板、成长系统、财务/习惯/目标模块。

## 1. 风格定位

本系统采用「硬边报表 + RPG 成长面板」视觉风格。

整体气质应像一份可交互的冒险任务账本：既有清晰、可执行的数据报表感，也有角色成长、任务进度、奖励反馈的游戏化动机。界面不追求柔软可爱，而是偏向精修、克制、有力量的任务控制台。

关键词：

- 明亮 RPG
- 财务/成长任务面板
- 报表式布局
- 黑色硬边框
- 实体硬阴影
- 金色主操作
- 英文微标签
- 角色成长反馈

## 2. 视觉原则

### 清晰优先

所有页面首先要像报表一样清楚：标题、数字、状态、操作入口必须一眼可扫。游戏化元素用于增强动机，不应干扰信息读取。

### 硬边而非柔软

主内容区使用 2px 深色边框和实体投影建立层级。避免大面积柔和阴影、玻璃拟态、渐变背景和过度圆角。

### 明亮但不空泛

背景保持浅灰白，卡片使用白色或浅灰容器。通过边框、分隔线、微标签和紧凑栅格制造秩序感，而不是靠大面积留白撑开页面。

### 游戏化服务于进步

等级、称号、XP 条、任务、里程碑、徽章等元素都应对应真实的用户进展。不要只做装饰性的游戏词汇。

### 布局保护优先

除非用户明确提出「页面布局」「整体结构」「模块位置」「信息架构」需要变更，否则不得主动改变现有 UI 页面布局。默认只允许在原有布局内优化视觉细节、组件状态、文案、颜色、间距、交互反馈或局部功能，不得重新排列主模块、改变页面纵横结构、压缩/拉长整体页面节奏，或把纵向布局改成横向布局。

## 3. 颜色系统

### 核心颜色

```yaml
colors:
  background: "#f8f9fa"
  surface: "#f8f9fa"
  surface_container_lowest: "#ffffff"
  surface_container_low: "#f3f4f5"
  surface_container: "#edeeef"
  surface_container_high: "#e7e8e9"
  surface_variant: "#e1e3e4"

  ink: "#191c1d"
  text_primary: "#191c1d"
  text_secondary: "#4d4732"
  outline: "#7e775f"
  outline_variant: "#d0c6ab"

  gold: "#ffd700"
  gold_dark: "#705d00"
  emerald: "#006c49"
  emerald_light: "#6cf8bb"
  ruby: "#b91a24"
  ruby_light: "#ffceca"
  error: "#ba1a1a"
```

### 语义用法

- `gold`：主操作、当前成就、核心进度、高亮月份、重要奖励。
- `emerald`：收入、完成、增长、正向反馈、健康状态。
- `ruby`：支出、风险、亏损、逾期、需要注意的状态。
- `ink`：主文字、边框、硬阴影，不要用透明黑替代。
- `surface_container`：列表项、空月份卡、次级模块底色。

## 4. 字体系统

使用两套字体：

```yaml
fonts:
  display: "Bebas Neue"
  body: "Bricolage Grotesque"
  icon: "Material Symbols Outlined"
```

### 字体规则

- 大数字、大标题、模块标题优先使用 `Bebas Neue`。
- 正文、导航、标签、小金额使用 `Bricolage Grotesque`。
- 大标题可以使用全大写英文或中英混排，形成报表/任务板气质。
- 小标签使用 uppercase，允许较大 letter spacing。
- 不使用过细字重。界面需要有“印刷墨迹”般的重量。

### 推荐字号

```yaml
typography:
  display_lg:
    font: "Bebas Neue"
    size: 64px
    weight: 400
    line_height: 1
    usage: 主资产数字、核心等级、页面主数字

  headline_lg:
    font: "Bebas Neue"
    size: 40px
    weight: 400
    line_height: 1
    usage: 页面模块标题

  headline_md:
    font: "Bebas Neue"
    size: 32px
    weight: 400
    line_height: 1
    usage: 卡片标题、品牌标题

  body_md:
    font: "Bricolage Grotesque"
    size: 16px
    weight: 400
    line_height: 1.5
    usage: 默认正文

  label_bold:
    font: "Bricolage Grotesque"
    size: 14px
    weight: 700
    line_height: 1
    usage: 导航、按钮、状态标签

  stat_number:
    font: "Bricolage Grotesque"
    size: 20px
    weight: 800
    line_height: 1
    usage: 卡片内小金额、小数据
```

## 5. 布局系统

### 桌面布局

- 顶部 Header：固定，高度 64px。
- 左侧 Sidebar：固定，宽度 256px。
- 主内容区：左侧偏移 256px，顶部偏移 64px。
- 主容器最大宽度：1200px。
- 卡片网格：优先使用 3 列、6 列等报表式栅格。

### 间距

```yaml
spacing:
  xs: 4px
  base: 8px
  sm: 12px
  gutter: 20px
  md: 24px
  lg: 48px
  container_max: 1200px
```

### 页面节奏

- 页面顶部先展示核心状态或总览数字。
- 中部展示 3 个以内关键指标。
- 之后进入账户、任务、模块详情。
- 底部展示周期进度、历史轨迹或可复盘内容。

## 6. 形状与边框

主内容区遵循硬边矩形原则。

```yaml
borders:
  card: "2px solid #191c1d"
  subtle: "1px solid #d0c6ab"
  xp: "1px solid #191c1d"
  dashed: "2px dashed #7e775f"

shadows:
  hard_default: "4px 4px 0 0 #191c1d"
  hard_small: "2px 2px 0 0 #191c1d"
  gold: "4px 4px 0 0 #705d00"
```

圆角规则：

- 主卡片：尽量 0-4px，保留硬朗报表感。
- 侧栏角色卡、头像、导航项：可使用 8-12px 圆角。
- 圆形只用于头像、图标按钮、徽章。

## 7. 核心组件

### Card / Panel

所有主要模块使用硬边卡片。

```css
.system-card {
  background: #ffffff;
  border: 2px solid #191c1d;
  box-shadow: 4px 4px 0 0 #191c1d;
}

.system-card:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 0 #191c1d;
}
```

卡片内容结构：

- 顶部：中文标题 + 英文微标签 + 图标。
- 中部：关键数字或任务描述。
- 底部：状态条、进度条或操作入口。

### Primary Button

主操作按钮使用金色硬边命令按钮。

```css
.primary-command {
  background: #ffd700;
  color: #705d00;
  border: 2px solid #191c1d;
  box-shadow: 4px 4px 0 0 #191c1d;
  font-weight: 700;
}

.primary-command:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

按钮文案建议中英结合：

- `新任务 NEW QUEST`
- `记录进展 LOG PROGRESS`
- `开始挑战 START CHALLENGE`
- `新交易 NEW TRANSACTION`

### XP Progress Bar

用于成长、目标、任务、月份进度。

```css
.xp-bar {
  height: 8px;
  background: #e1e3e4;
  border: 1px solid #191c1d;
  overflow: hidden;
}

.xp-bar-fill {
  height: 100%;
  transition: width 1s ease-out;
}
```

填充色：

- 金色：核心进度或高价值成就。
- 绿色：完成、收益、健康成长。
- 红色：风险、亏损、惩罚项或警告。

### Quest Month / Track Card

周期追踪卡采用报表格样式。

- 空状态：虚线边框、低透明度、浅灰文字。
- 普通完成：黑边 + 浅灰底。
- 高亮完成：金色边框 + 金色淡底 + 金色硬阴影。
- 风险月份：红色数字和红色进度条。

### Sidebar Character Card

侧栏承载角色身份和长期成长感。

内容建议：

- 等级：如 `42级`
- 职业/身份：如 `圣骑士`、`炼金师`、`战略家`
- 称号：如 `理财大师`、`习惯猎人`、`成长指挥官`
- 系统导航：财富状况、能力属性、健康状况、情绪状态、成就收集
- 3 条属性：财富、健康度、情绪等，也可在后续模块扩展为专注力、行动力、复盘力

侧栏图标应使用同一套线性图标语言：

- 财富状况：钱币、金库、账本或财富符号
- 能力属性：能力、技能、脑力或成长节点
- 健康状况：心电、心脏、身体监测
- 情绪状态：表情、情绪波动、心境
- 成就收集：奖杯、徽章、里程碑

## 8. 文案风格

文案要像任务系统，不像普通表单系统。

推荐模式：

- 中文主含义 + 英文系统标签
- 数字优先，解释跟随
- 用“任务、进度、轨道、等级、称号、奖励”组织成长行为

示例：

- `2026 每月结余 THE TRACK`
- `资产净值 TOTAL NET WORTH`
- `月度任务 MONTHLY QUEST`
- `下个里程碑 NEXT MILESTONE`
- `成长评分 GROWTH SCORE`
- `记录进展 LOG PROGRESS`

避免：

- 大段解释性文案
- 过度情绪化鼓励语
- 与真实进度无关的装饰性游戏词

## 9. 图标规范

使用 `Material Symbols Outlined`。

图标风格：

- 线性图标优先。
- 重要角色/等级图标可使用 filled 变体。
- 图标应配合文本和状态色，不单独作为复杂插画使用。

常用图标：

```yaml
icons:
  finance: account_balance
  task: assignment
  market: storefront
  team: group
  history: history
  notification: notifications
  settings: settings
  character: shield
  progress: stars
  achievement: workspace_premium
  map: map
  add: add_circle
  income: payments
  expense: shopping_bag
  saving: savings
  chart: monitoring
```

## 10. 禁止事项

- 不使用大面积渐变背景。
- 不使用玻璃拟态作为主视觉。
- 不使用柔和漂浮卡片作为主要层级。
- 不使用过多圆角胶囊按钮。
- 不使用纯装饰插画占据首屏。
- 不让游戏化元素掩盖真实数据。
- 不使用单一金色铺满整页，金色只做强调。

## 11. 适用页面参考

### 仪表盘

采用「总览数字 + 三指标 + 模块网格 + 周期轨道」结构。

### 任务页

采用「当前主线任务 + 支线任务卡 + XP 进度 + 奖励/惩罚状态」结构。

### 成长目标页

采用「年度目标轨道 + 月度节点 + 里程碑卡 + 属性成长条」结构。

### 记录页

采用「命令按钮 + 表格式记录卡 + 状态标签 + 时间线」结构。

### 设置页

可以降低游戏化强度，但仍保留硬边卡片、清晰分组和金色主操作。

## 12. 总结

这套系统风格的核心不是“可爱 RPG”，而是“把个人成长变成一套可执行、可复盘、可升级的任务账本”。  

视觉上要保持明亮、硬朗、有秩序；交互上要让用户感觉每一次记录、完成、复盘都在推动角色成长。
