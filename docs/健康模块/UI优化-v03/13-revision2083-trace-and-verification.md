# revision 2083 追踪矩阵与验证

## 飞书要求追踪矩阵

| 飞书要求 | 页面/组件 | 生产代码 | 自动化/浏览器证据 |
|---|---|---|---|
| 训练顶部计时、三阶段、动作数 | `WorkoutWorkspace` | `src/health/Revision2083Workspaces.tsx`、`healthModule.css` | `Revision2083Workspaces.test.tsx`；`candidate/*-workout.png` |
| 动作库搜索、筛选、横向浏览、逐项添加后开始 | 动作库 dialog | 同上；既有 `WorkoutRecorder` 继续承载五模式/逐组/休息 | Playwright 关键旅程；1440/1024/390 workout |
| 饮食剩余热量环、三大营养素、能量台账 | `MealsWorkspace` | 同上；`types.ts`、`useHealthSystem.ts` 扩展营养字段 | 组件测试；`candidate/*-meals.png` |
| 早餐/午餐/晚餐/加餐；公共/我的/食谱；搜索、自定义、克重热量 | 食物库 dialog | `Revision2083Workspaces.tsx`；`foodCatalog` 可选兼容字段 | 组件/浏览器旅程；持久化测试 |
| 喝水目标/选项/提醒、久坐间隔、睡眠时长与状态 | `DailyWorkspace` | 同上；preferences 与 `sedentary-break` | 组件/浏览器旅程；`candidate/*-daily.png` |
| 七项围度、体重/体脂/BMI/比率、加号类型选择 | `BodyWorkspace` | 同上；`BodyRecord.circumferencesMm` | 组件/浏览器旅程；`candidate/*-body.png` |
| 旧记录、趋势、训练、导入导出、垃圾箱完整保留 | 原 `HealthModule` 支撑区 | `HealthModule.tsx` 原逻辑未删除；新增工作台前置 | 全仓 452 tests；关键旅程；构建 |

## 同数据成对视觉证据

基线与候选均从空本地存储开始，并通过相同步骤写入：体重 70.2 kg、餐食“鸡胸肉、米饭和蔬菜”、饮水 250 ml。随后分别在 1440×900、1024×768、390×844 捕获五页。

- `evidence/revision2083/origin-main/{1440,1024,390}-{home,workout,meals,daily,body}.png`
- `evidence/revision2083/candidate/{1440,1024,390}-{home,workout,meals,daily,body}.png`

origin/main：`e82e31b`；候选基线：`2c21b1c` + 本轮差异。

## 四条关键旅程与实际步骤数

| 旅程 | 用户步骤 | 步数 |
|---|---|---:|
| 训练加动作并开始 | 进入训练 → 点击“训练动作”加号 → 搜索/选择动作 → 完成添加 → 开始训练 | 5（不计输入字符） |
| 从餐次记录饮食 | 进入饮食 → 早餐加号 → 选食物 → 填克重 → 加入早餐 | 5 |
| 喝水/休息/睡眠 | 进入日常 → 快捷水量；输入活动分钟并记录；输入睡眠时长/状态并保存 | 单项 2–4 |
| 新增身体围度 | 进入身体 → 添加身体数据 → 选择腰围 → 输入数值 → 保存 | 5 |

全局“添加食物”与餐次入口共用同一食物库；关闭弹窗返回原餐次。普通训练不展示高级字段，高级字段继续在逐组记录中渐进展开。

## 失败、修复与复测

1. 首轮候选截图测试因历史时间文本对比度 3.9:1 失败；定位到 `.health-row time` 覆盖规则，改为 `#52645c`。
2. axe 复测 critical/serious = 0。
3. 一次 Chrome 预加载超时 warning 无法在源码检索，原样复跑后未复现；最终复测 console/pageerror = 0。
4. 三档所有五页水平溢出 ≤1px；390px 可见按钮目标 ≥44×44。

## 数据兼容与持久化

- V1 继续使用 schemaVersion 1；新字段均为可选增量字段，旧状态无需破坏性迁移。
- `Revision2083Persistence.test.tsx` 验证围度、食物/食谱、餐食营养、目标提醒、久坐记录保存重载。
- 同文件验证旧 schema-1 缺少新可选字段仍可加载，首次保存会补入用户修改且不丢旧集合。
- 导入/导出校验、媒体、备份恢复和垃圾箱继续由原测试覆盖。

## 门禁结果（最终命令需以提交前复跑为准）

- 新增交互工作台：4 tests；新增持久化兼容：2 tests。
- 全仓：71 files / 452 tests 全部通过。
- Playwright 候选关键旅程：2 tests；基线截图：1 test。
- 生产构建：通过。

5 名真实用户计时和中端设备真实照片仍是上线前人工门禁，不在自动化结果中伪造。
