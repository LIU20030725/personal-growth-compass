# Refero 检索证据与阻塞记录

日期：2026-08-15

## 结论

Refero MCP 已连接且工具可调用，但当前账户订阅未激活或已过期。所有检索均返回同一错误：`NO_SUBSCRIPTION`。因此本阶段没有可用的 screen / flow / style ID，不能把空结果包装成 Refero 研究结论。

恢复条件：账户重新获得 Refero MCP 检索权限后，按下表原查询复跑，并补录 ID、产品、截图和规律。开通订阅涉及付费，未获得用户新的付费授权前不执行。

## 已执行的检索

| 类别 | 查询 | 平台 | 结果 |
|---|---|---|---|
| 屏幕 1：健康今日概览 | `health dashboard daily summary quick log trends` | iOS | `NO_SUBSCRIPTION` |
| 屏幕 2：训练进行中 | `workout tracker active workout sets rest timer exercise library` | iOS | `NO_SUBSCRIPTION` |
| 屏幕 3：身体变化 | `body measurements weight body fat progress trends` | iOS | `NO_SUBSCRIPTION` |
| 流程 1：逐组训练 | `logging a workout exercise sets rest timer` | iOS | `NO_SUBSCRIPTION` |
| 风格 1：可信健康 | `warm trustworthy healthcare product marketing restrained calm` | Web | `NO_SUBSCRIPTION` |
| 风格 2：轻量效率 | `airy productivity SaaS calm dashboard sage yellow` | Web | `NO_SUBSCRIPTION` |

## 其他来源边界

- 当前没有 Mobbin 或 Page Flows 的直接工具，未把网页搜索结果冒充其付费产品证据。
- 飞书 v03 章节内的 9 张 OtterLife 截图由用户直接提供，可作为用户参考资料使用，但不替代 Refero ID 证据。
- 后续 reference lock 会明确区分“用户提供的 OtterLife 规律”和“Dice Life 自有设计决策”。

## 用户提供的 OtterLife 参考图索引

| 飞书素材 token | 页面 | 可借鉴 | 明确不照搬 |
|---|---|---|---|
| `NkGYbrLZxoqzqVxnLiucfC2Cnqg` | 训练准备 | 计时器置顶；热身/动作/拉伸按真实顺序组织；单一添加动作 | 大面积空白和紫色品牌色 |
| `WEtwbObTAoZO2lxW0ibcsxgEnzd` | 动作库 | 搜索、筛选、列表内直接添加；抽屉式上下文 | 依赖外部动作图片库和会员内容 |
| `UlVUbDAhmoehhwxxtjzcntZDnkb` | 热量概览 | 一屏一个主题；核心数字先于明细 | 无硬件和食物数据库时伪造精确热量、代谢与缺口 |
| `XSOZbWRO6ojnl8xqiigcYWoPnGe` | 餐次列表 | 早餐/午餐/晚餐/加餐采用可快速进入的时间线 | 推荐卡路里区间和默认营养处方 |
| `T98rbXcXFo15Zgxf7x8cv6g0nfd` | 食物库 | 最近使用、搜索、直接添加 | V1 引入庞大食物数据库和精确卡路里 |
| `HSp4baK7lomblqxcbjlcv63Inxh` | 饮水设置 | 目标与快捷杯量分开；低频设置后置 | 提醒通知能力尚不存在时展示定时提醒 |
| `EH93blL0lonZm3xIWIPcvBCFnFd` | 睡眠 | 日/周/月分段；缺失数据空态明确 | 伪造心率、血氧、呼吸和体温数据 |
| `SxpVb7MJyoqbVExUttMc1azpn2e` | 身体变化 | 围度围绕人体位置呈现；指标与趋势相邻 | 复杂人体图成为记录前置步骤 |
| `MS9abuoguo2fgMxgC5yccuotnBb` | 身体记录动作面板 | 单一加号打开可识别的记录类型 | 仅用图标而缺少文本标签 |

## 权限恢复后的补证要求

1. 至少取得 3 类 screen/flow 参考与 2 类 style 参考。
2. 每条记录 screen / flow / style ID、产品、检索词、可借鉴规律、拒绝照搬项。
3. 调用 `refero_get_screen_image` 视觉核验入选屏幕，不仅依赖文字元数据。
4. 若 Refero 结果与用户提供的 OtterLife 参考冲突，以本项目任务层级和数据真实性边界为准。
