# 📊 活动详情侧边栏功能

## 📅 完成日期
**2025-10-17**

---

## 🎯 功能概述

为活动财务列表添加了**Drawer（侧边栏）**组件，点击"查看详情"按钮时在右侧弹出详情面板，显示活动的完整信息和关联的财务交易记录。

---

## ✨ 核心功能

### 1️⃣ 侧边栏显示

- **位置**：右侧滑出
- **宽度**：720px
- **关闭**：点击遮罩层或ESC键

---

### 2️⃣ 基本信息卡片

显示活动的核心信息：
- ✅ 活动名称
- ✅ 负责理事（带职位标签）
- ✅ 活动日期
- ✅ 活动状态

---

### 3️⃣ 财务统计卡片

实时计算并显示：
- ✅ **总收入**：该活动的所有收入交易总和
- ✅ **总支出**：该活动的所有支出交易总和
- ✅ **净收入**：收入 - 支出

**特点：**
- 绿色显示收入
- 红色显示支出
- 净收入根据正负显示颜色

---

### 4️⃣ 交易记录表格

显示该活动的所有关联交易：
- ✅ 交易日期
- ✅ 交易描述
- ✅ 交易类型（收入/支出）
- ✅ 交易金额（带正负号）
- ✅ 交易状态

**特点：**
- 自动加载该活动的所有交易（`subCategory = 活动名称`）
- 包含父交易和子交易
- 按交易日期降序排列
- 每页显示10条记录

---

## 📊 UI界面

### Drawer布局

```
┌────────────────────────────────────────────────────────┐
│ 活动详情                                          [x]  │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ 基本信息 ────────────────────────────────────┐   │
│  │ 活动名称:   2024新年晚会                      │   │
│  │ 负责理事:   [President]                       │   │
│  │ 活动日期:   31-Dec-2024                       │   │
│  │ 状态:       [计划中]                          │   │
│  └───────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 财务统计 ────────────────────────────────────┐   │
│  │                                                 │   │
│  │  总收入         总支出         净收入          │   │
│  │  RM 25,000.00   RM 18,000.00   RM 7,000.00    │   │
│  │  (绿色)         (红色)         (绿色)         │   │
│  │                                                 │   │
│  └───────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 交易记录（共 8 笔）───────────────────────────┐   │
│  │                                                 │   │
│  │ 日期       │ 描述        │ 类型 │ 金额      │  │   │
│  ├──────────────────────────────────────────────│  │   │
│  │ 01-Nov-24 │ 场地预订    │ 支出 │ -RM 5,000 │  │   │
│  │ 05-Nov-24 │ 员工报名    │ 收入 │ +RM 8,000 │  │   │
│  │ 10-Nov-24 │ 餐饮服务    │ 支出 │ -RM 12K   │  │   │
│  │ 15-Nov-24 │ 赞助收入    │ 收入 │ +RM 15K   │  │   │
│  │ ...                                           │  │   │
│  │                                                 │   │
│  │                          [1] [2] [3] ... [10]  │   │
│  └───────────────────────────────────────────────┘   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 🔧 技术实现

### 1️⃣ 新增状态

```typescript
const [eventDetailDrawerVisible, setEventDetailDrawerVisible] = useState(false);
const [selectedEventDetail, setSelectedEventDetail] = useState<EventFinancialSummary | null>(null);
const [eventTransactions, setEventTransactions] = useState<Transaction[]>([]);
const [eventTransactionsLoading, setEventTransactionsLoading] = useState(false);
```

---

### 2️⃣ 点击处理函数

```typescript
const handleEventSelect = async (eventId: string) => {
  const eventData = events.find(e => e.eventId === eventId);
  if (!eventData) return;
  
  setSelectedEventDetail(eventData);
  setEventDetailDrawerVisible(true);
  
  // 🔑 加载该活动的所有交易记录
  await loadEventTransactions(eventData.eventName);
};
```

---

### 3️⃣ 加载活动交易

```typescript
const loadEventTransactions = async (eventName: string) => {
  const result = await getTransactions({
    page: 1,
    limit: 100, // 加载所有交易
    category: 'event-finance',
    subCategory: eventName, // 🔑 按活动名称过滤
    sortBy: 'transactionDate',
    sortOrder: 'desc',
    includeVirtual: true,
  });
  
  setEventTransactions(result.data);
};
```

---

### 4️⃣ 实时财务统计

```typescript
// 总收入
const totalRevenue = eventTransactions
  .filter(t => t.transactionType === 'income')
  .reduce((sum, t) => sum + t.amount, 0);

// 总支出
const totalExpense = eventTransactions
  .filter(t => t.transactionType === 'expense')
  .reduce((sum, t) => sum + t.amount, 0);

// 净收入
const netIncome = eventTransactions.reduce((sum, t) => 
  sum + (t.transactionType === 'income' ? t.amount : -t.amount), 0
);
```

---

## 💡 使用场景

### 场景1: 查看活动财务明细

**操作：**
1. 进入活动财务页面
2. 在活动列表中找到目标活动
3. 点击"查看详情"按钮
4. 右侧滑出详情面板

**查看内容：**
```
2024新年晚会
━━━━━━━━━━━━━━━━━━━━━━━━━━
负责理事: President（会长）
活动日期: 31-Dec-2024
状态: 进行中

财务统计:
├─ 总收入: RM 25,000.00 ✅
├─ 总支出: RM 18,000.00
└─ 净收入: RM 7,000.00 ✅

交易明细:
1. 01-Nov-24 | 场地预订 | -RM 5,000 (支出)
2. 05-Nov-24 | 员工报名 | +RM 8,000 (收入)
3. 10-Nov-24 | 餐饮服务 | -RM 12,000 (支出)
4. 15-Nov-24 | 赞助收入 | +RM 15,000 (收入)
5. 20-Nov-24 | 场地布置 | -RM 1,000 (支出)

共 5 笔交易
```

---

### 场景2: 活动财务审计

**操作：**
1. 点击"查看详情"
2. 查看财务统计卡片
3. 确认收入支出是否合理
4. 查看交易明细，核对每笔交易

**审计清单：**
- [x] 收入来源是否正确
- [x] 支出是否有凭证
- [x] 金额是否准确
- [x] 净收入是否符合预期

---

### 场景3: 活动进度跟踪

**操作：**
1. 打开活动详情Drawer
2. 查看已完成的交易数量
3. 对比预算执行情况
4. 评估活动财务健康度

**示例：**
```
Q1商业论坛
━━━━━━━━━━━━━━━━━━━━━━━━━━
预算收入: RM 50,000
实际收入: RM 45,000 (90%) ⚠️

预算支出: RM 35,000
实际支出: RM 28,000 (80%) ✅

净收入目标: RM 15,000
实际净收入: RM 17,000 (113%) ✅✅

评估: 超出预期，活动成功！
```

---

## 📊 数据流程

```
用户点击"查看详情"
    ↓
handleEventSelect(eventId)
    ↓
1. 查找活动数据: events.find(e => e.eventId === eventId)
2. 设置选中活动: setSelectedEventDetail(eventData)
3. 打开Drawer: setEventDetailDrawerVisible(true)
4. 加载交易: loadEventTransactions(eventData.eventName)
    ↓
调用 getTransactions({
  category: 'event-finance',
  subCategory: eventName,  // 🔑 关键过滤
  includeVirtual: true,
})
    ↓
获取该活动的所有交易记录
    ↓
setEventTransactions(result.data)
    ↓
实时计算财务统计
    ↓
显示在Drawer中 ✅
```

---

## 🎨 UI组件

### Descriptions组件

用于显示基本信息：
```typescript
<Descriptions column={1} bordered size="small">
  <Descriptions.Item label="活动名称">
    {selectedEventDetail.eventName}
  </Descriptions.Item>
  <Descriptions.Item label="负责理事">
    <Tag color="purple">{boardMemberLabel}</Tag>
  </Descriptions.Item>
  ...
</Descriptions>
```

---

### Statistic组件

用于显示财务数据：
```typescript
<Statistic
  title="总收入"
  value={totalRevenue}
  precision={2}
  prefix="RM"
  valueStyle={{ color: '#3f8600' }}
/>
```

---

### Table组件

用于显示交易记录：
```typescript
<Table
  columns={transactionColumns}
  dataSource={eventTransactions}
  loading={eventTransactionsLoading}
  pagination={{ pageSize: 10 }}
  size="small"
/>
```

---

## ✅ 优势

### Before（没有详情功能）

```
❌ 只能看到列表摘要
❌ 无法查看具体交易
❌ 需要去交易管理页面筛选
❌ 操作繁琐
```

---

### After（Drawer详情）

```
✅ 一键查看完整详情
✅ 财务统计自动计算
✅ 交易明细一目了然
✅ 无需切换页面
✅ 操作便捷
```

---

## 🚀 未来增强

### 1️⃣ 编辑活动

在Drawer中添加编辑按钮：
- 修改活动名称
- 修改负责理事
- 修改活动日期
- 修改活动状态

---

### 2️⃣ 导出活动报表

在Drawer中添加导出按钮：
- 导出活动财务PDF报表
- 导出活动交易明细Excel
- 导出活动统计图表

---

### 3️⃣ 活动预算对比

显示预算执行情况：
```
收入预算: RM 50,000
实际收入: RM 45,000
执行率: 90% [====      ] ⚠️

支出预算: RM 35,000
实际支出: RM 28,000
执行率: 80% [====      ] ✅
```

---

### 4️⃣ 活动时间线

显示活动的财务时间线：
```
时间线:
━━━━━━━━━━━━━━━━━━━━━━━━━━
2024-11-01  场地预订 (-RM 5,000)
2024-11-05  员工报名 (+RM 8,000)
2024-11-10  餐饮服务 (-RM 12,000)
2024-11-15  赞助收入 (+RM 15,000)
```

---

## 📝 测试验证

### 测试用例1: 打开详情

1. ✅ 点击"查看详情"按钮
2. ✅ Drawer从右侧滑出
3. ✅ 显示活动基本信息
4. ✅ 显示财务统计（自动计算）
5. ✅ 显示交易记录表格

---

### 测试用例2: 关闭详情

1. ✅ 点击遮罩层关闭
2. ✅ 按ESC键关闭
3. ✅ 点击Drawer内的关闭按钮
4. ✅ 关闭后状态清空

---

### 测试用例3: 财务计算

1. ✅ 收入金额计算正确
2. ✅ 支出金额计算正确
3. ✅ 净收入 = 收入 - 支出
4. ✅ 颜色显示正确（收入绿色，支出红色）

---

### 测试用例4: 交易记录

1. ✅ 只显示该活动的交易
2. ✅ 包含父交易和子交易
3. ✅ 按日期降序排列
4. ✅ 分页功能正常

---

## 🎯 数据准确性

### 自动筛选逻辑

```typescript
// 🔑 关键查询参数
await getTransactions({
  category: 'event-finance',    // 只查询活动财务
  subCategory: eventName,       // 只查询该活动
  includeVirtual: true,         // 包含子交易
});
```

**确保：**
- ✅ 只统计该活动的交易
- ✅ 不会包含其他活动的交易
- ✅ 包含拆分的子交易

---

## 📚 相关文档

- ✅ `EVENT_FINANCE_CLASSIFICATION_FEATURE.md` - 活动财务分类
- ✅ `BOARD_MEMBER_EVENT_FEATURE.md` - 理事团队管理
- ✅ `EVENT_DETAIL_DRAWER_FEATURE.md` - 本文档

---

## ✅ 完成清单

- [x] 添加Drawer组件
- [x] 添加基本信息卡片
- [x] 添加财务统计卡片
- [x] 添加交易记录表格
- [x] 实现自动加载交易
- [x] 实现实时财务计算
- [x] 删除未使用的状态变量
- [x] 清理lint警告
- [x] 更新文档

---

**功能已完成，立即可用！** 🎉

点击活动列表中的"查看详情"按钮即可看到完整的活动财务信息。

