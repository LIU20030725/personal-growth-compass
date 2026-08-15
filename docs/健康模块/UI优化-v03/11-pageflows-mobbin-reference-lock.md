# revision 2083 竞品证据与 reference lock

## 可验证来源

### Page Flows（屏幕级主证据）

| 产品/流程 | URL | 借鉴规律 | 明确拒绝照搬 |
|---|---|---|---|
| Strava / Starting an activity | https://pageflows.com/post/android/starting-an-activity/strava/ | 先确认活动，再进入强状态计时；停止与保存分步防误触 | 不照搬社交可见性、路线或定位权限 |
| Withings Healthmate / General browsing | https://pageflows.com/post/ios/general-browsing/withings-healthmate/ | 首页到手动记录再到趋势；手动体重与活动入口紧邻上下文 | 不照搬设备同步和医疗化健康评分 |
| MyFitnessPal / General browsing | https://pageflows.com/post/desktop-web/general-browsing/my-fitness-pal/ | 餐次→食物搜索→营养信息→加入日记；水记录独立快捷 | 不照搬广告、订阅墙和过密表格 |
| Calory / Onboarding and tracking | https://pageflows.com/post/ios/onboarding/calory/ | 热量目标成为单一主视觉；最近食物、搜索和手动输入并存 | 不把热量变成综合健康分，不强迫完成全部目标 |
| Lifesum / General browsing | https://pageflows.com/post/ios/general-browsing/lifesum/ | 日记、食谱、筛选、测量趋势分层；设置不抢首页 | 不照搬饮食诊断和“好/坏食物”结论 |
| Foodvisor / General browsing | https://pageflows.com/post/ios/general-browsing/foodvisor/ | 日志进入食物搜索，活动与体重目标保持上下文 | 不做照片 AI 识别或营养处方 |
| Me+ / Discovering content | https://pageflows.com/post/ios/discovering-content/meplus/ | 动作/例程库先浏览后选入计划；详情提供动作理解 | 不引入付费课程、视频流和内容推荐系统 |

### Mobbin 与 Refero 的边界

- Mobbin 官方 MCP 页面：https://mobbin.com/mcp 。可借鉴其公开表达的健康产品通用关注点：敏感权限、习惯循环与低压力 onboarding。
- Mobbin 具体 screen/flow 检索需要付费 API/MCP；本轮没有可验证的公开健康 screen ID，因此不伪称使用了具体 Mobbin 屏幕。
- Refero MCP 已由总控复测为 `NO_SUBSCRIPTION`。本轮记录为外部阻塞，不重试，也不把它当作停工理由。

## Reference lock

### 主风格

Dice Life A「Calm Command Center / 平静指挥中心」：冷白画布、鼠尾草主色、柔黄仅用于当前状态和主 CTA；1px 低对比边框、12–16px 圆角、柔和阴影；不使用红色健康警报、综合健康分、硬黑框或大面积高饱和渐变。

### 页面结构锁

```text
健康首页
  ├─ 今日快速记录（唯一主动作）
  ├─ 今日状态摘要（事实，不做诊断）
  └─ 四个工作台入口
       ├─ 训练：计时 → 三阶段计划 → 动作库 → 逐组记录 → 摘要/历史
       ├─ 饮食：热量/营养总览 → 四餐 → 食物库 → 克重记录 → 日志
       ├─ 日常：喝水 / 久坐休息 / 睡眠 → 目标与提醒 → 历史
       └─ 身体：围度视图 → 核心指标/比率 → 类型选择 → 记录/趋势
```

### 交互锁

1. 页面首屏只突出一个主动作，历史与设置降为次级分组。
2. 动作库和食物库均使用“搜索 + 分类筛选 + 最近/常用 + 详情/添加”，避免空白输入成为主入口。
3. 训练高级字段、提醒设置、自定义食物默认折叠；普通记录不会因此多一步。
4. 用户从餐次或训练阶段进入时保留上下文，关闭抽屉回到原位置。
5. 0 与缺失严格区分；计算值标注来源；极端值只提示复核。
6. 桌面允许摘要+任务双栏；平板收敛为主列+窄摘要；手机为单列，抽屉变全屏，关键按钮 ≥44px。

### 借用细节

- Strava：训练中强状态计时与明确停止/保存边界。
- MyFitnessPal/Calory：热量环作为饮食唯一主视觉，餐次和食物搜索成为下一层。
- Withings：身体记录与趋势邻接，但不引入设备或评分。

### 禁用项

- 不展示虚构设备心率、睡眠阶段或自动消耗。
- 不自动推断饮食是否健康，不生成医疗风险或处方。
- 不把四类记录变成每日完成率或连续打卡压力。
- 不用信息密集仪表盘把全部功能同时堆在首页。
