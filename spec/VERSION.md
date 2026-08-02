# 冒险日志模块版本

**当前稳定版本：** `0.1.0`
**当前发布状态：** 已发布
**数据 schema：** `1`
**内容版本：** `0.1.0`
**最后更新：** 2026-08-01

## 当前版本基线

- 源码：`src/adventure-journal/`
- 发布记录：`spec/releases/v0.1.0/`
- 存储键：`dice-life.adventure-journal.v1`
- 任务账本规则：`adventure-investment-v1`
- 稳定标签：`adventure-journal-v0.1.0`

## 版本含义

- 模块版本：用户可感知功能集合，遵循 SemVer。
- schema 版本：本地持久化结构的整数版本。
- 内容版本：地图、价格、发现、物件和资产清单版本。

三个版本独立演进。任何 schema 升级必须附带迁移测试；任何已开始目标必须保留开始投资时的固定价格。

## 标签规则

稳定模块版本使用：

```text
adventure-journal-v0.1.0
adventure-journal-v0.2.0
adventure-journal-v0.3.0
adventure-journal-v1.0.0
```

在正式发布前不得创建对应稳定标签。
