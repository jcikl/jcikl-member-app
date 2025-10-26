# 树形视图表格内容分析

**分析时间**: 2025-01-13  
**分析范围**: 交易管理页面树形视图表格

---

## 📋 树形表格结构

### 表格列定义

```typescript
const treeTableColumns: ColumnsType<TreeTableItem> = [
  {
    title: '账户/项目名称',        // 第1列
    dataIndex: 'name',
    align: 'left',
    render: (text, record) => {
      // 显示树形结构：
      // Level 0: ''          (无前缀)
      // Level 1+: '├──' 或 '└──'
    }
  },
  {
    title: `${treeSelectedYear} (RM)`,  // 第2列（当前年份）
    dataIndex: 'year2025',
    align: 'right',
    width: 120,
    render: (amount) => {
      // 绿色显示正数
      // 红色显示负数
    }
  },
  {
    title: `${treeSelectedYear - 1} (RM)`,  // 第3列（前一年）
    dataIndex: 'year2024',
    align: 'right',
    width: 120,
    render: (amount) => {
      // 绿色显示正数
      // 红色显示负数
    }
  }
]
```

**示例显示**:
```
┌─────────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称           │ 2024 (RM)     │ 2023 (RM)     │
├─────────────────────────┼──────────────┼──────────────┤
│ 收入                    │              │              │
│ ├── 活动财务 (15)        │              │              │
│ │ ├── President（会长）  │              │              │
│ │ │ └── Hope for Nature 6│              │              │
```

---

## 📊 数据结构

### TreeTableItem 接口

```typescript
interface TreeTableItem {
  key: string;                    // 唯一标识
  name: string;                   // 显示名称
  level: number;                  // 层级：0=主类别, 1=子类别, 2=具体项目
  isLastChild: boolean;           // 是否是最后一个子项（决定显示 ├── 还是 └──）
  count: number;                  // 交易数量
  totalAmount: number;            // 总金额
  year2025: number;               // 当前年份金额（净收入/净支出）
  year2024: number;               // 前一年金额（净收入/净支出）
  transactions: Transaction[];    // 关联的交易数据
  category?: string;              // 类别
  txAccount?: string;            // 子账户
  boardMember?: string;           // 负责理事
  eventName?: string;             // 活动名称
}
```

---

## 🌳 树形结构层次

### Level 0: 主类别

```
收入                (level: 0, category: null)
支出                (level: 0, category: null)
```

### Level 1: 子类别

```
收入
├── 活动财务          (level: 1, category: 'event-finance')
├── 会员费用          (level: 1, category: 'member-fees')
└── 日常账户          (level: 1, category: 'general-accounts')
```

### Level 2: 负责理事/子账户

**活动财务 (按负责理事分组)**:
```
├── 活动财务
│   ├── President（会长）    (level: 2, boardMember: 'president')
│   ├── VP Community        (level: 2, boardMember: 'vp-community')
│   └── 未设置负责理事       (level: 2, boardMember: 'unassigned')
```

**其他类别 (按子账户分组)**:
```
├── 会员费用
│   ├── 2024                (level: 2, txAccount: '2024')
│   └── 2023                (level: 2, txAccount: '2023')
```

### Level 3: 具体活动/项目

**活动财务 (具体活动)**:
```
├── President（会长）
│   ├── Hope for Nature 6   (level: 3, eventName: 'Hope for Nature 6')
│   └── APBN 2025           (level: 3, eventName: 'APBN 2025')
```

**其他类别 (具体项目)**:
```
├── 日常账户
│   └── 租金收入 (12)        (level: 2, txAccount: 'rental-income')
```

---

## 📋 树形数据构建逻辑

### 1. 按类别分组 (Line 1309-1319)

```typescript
// 按类别分组交易
const groupedTransactions = transactions.reduce((acc, transaction) => {
  if (transaction.isSplit === true) return acc; // 跳过已拆分的父交易
  
  const category = transaction.category || 'uncategorized';
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(transaction);
  return acc;
}, {} as Record<string, Transaction[]>);
```

**分组结果**:
```
{
  'event-finance': [Transaction, Transaction, ...],
  'member-fees': [Transaction, Transaction, ...],
  'general-accounts': [Transaction, Transaction, ...],
  'uncategorized': [Transaction, Transaction, ...]
}
```

---

### 2. 类别名称映射 (Line 1340-1345)

```typescript
const categoryNameMap: Record<string, string> = {
  'event-finance': '活动财务',
  'member-fees': '会员费用',
  'general-accounts': '日常账户',
  'uncategorized': '未分类',
};
```

---

### 3. 活动财务特殊处理 (Line 1379-1450)

**按负责理事分组 → 再按活动分组**

```typescript
if (category === 'event-finance') {
  // Step 1: 按负责理事分组
  const boardMemberGroups: Record<string, Transaction[]> = {};
  
  categoryTransactions.forEach(transaction => {
    const event = eventsMap.get(transaction.txAccount || '');
    const boardMemberKey = event?.boardMember || 'unassigned';
    // ...
  });
  
  // Step 2: 为每个负责理事创建节点
  boardMemberKeys.forEach((boardMemberKey) => {
    tableData.push(createUnifiedTreeItem(
      `income-${category}-board-${boardMemberKey}`,
      `${boardMemberName} (${eventCount}个活动) 净收入: RM ${netTotal.toFixed(2)}`,
      // ...
    ));
    
    // Step 3: 为每个活动创建子节点
    eventNames.forEach((eventName) => {
      tableData.push(createUnifiedTreeItem(
        `income-${category}-board-${boardMemberKey}-event-${eventName}`,
        `${eventName} (${eventDate}) 净收入: RM ${eventNetTotal.toFixed(2)}`,
        // ...
      ));
    });
  });
}
```

---

### 4. 其他类别处理 (Line 1452-1488)

**按子账户分组**

```typescript
else {
  // 其他类别：按子账户分组
  const subGroups = categoryTransactions.reduce((acc, transaction) => {
    const txAccount = transaction.txAccount || 'uncategorized';
    if (!acc[txAccount]) {
      acc[txAccount] = [];
    }
    acc[txAccount].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);
  
  // 为每个子账户创建节点
  subGroupKeys.forEach((txAccount, subIndex) => {
    const items = subGroups[txAccount];
    const subTotal = items.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    tableData.push(createUnifiedTreeItem(
      `income-${category}-${txAccount}`,
      `${displayName} (${items.length}) RM ${subTotal.toFixed(2)}`,
      // ...
    ));
  });
}
```

---

## 📊 显示示例

### 完整树形结构示例

```
┌──────────────────────────────────────────┬───────────┬───────────┐
│ 账户/项目名称                            │ 2024 (RM) │ 2023 (RM) │
├──────────────────────────────────────────┼───────────┼───────────┤
│ 收入                                    │           │           │
│ ├── 活动财务 (15)                        │ 50,000.00 │ 45,000.00 │
│ │ ├── President（会长）(2个活动)         │ 25,000.00 │ 20,000.00 │
│ │ │ ├── Hope for Nature 6 (净收入)     │ 15,000.00 │ 12,000.00 │
│ │ │ └── APBN 2025 (净收入)              │ 10,000.00 │  8,000.00 │
│ │ └── VP Community (1个活动)            │ 25,000.00 │ 25,000.00 │
│ │   └── Workshop 2024 (净收入)          │ 25,000.00 │ 25,000.00 │
│ ├── 会员费用 (30)                        │ 12,000.00 │ 10,000.00 │
│ │ ├── 2024 (12)                         │  7,000.00 │           │
│ │ └── 2023 (18)                         │           │ 10,000.00 │
│ └── 日常账户 (8)                         │  3,500.00 │  3,200.00 │
│   ├── 租金收入 (4)                       │  2,000.00 │  2,000.00 │
│   └── 其他收入 (4)                       │  1,500.00 │  1,200.00 │
│                                          │           │           │
│ 支出                                    │           │           │
│ └── 日常账户 (12)                        │ -5,000.00 │ -4,500.00 │
│   ├── 租金支出 (6)                       │ -3,000.00 │ -3,000.00 │
│   └── 其他支出 (6)                       │ -2,000.00 │ -1,500.00 │
└──────────────────────────────────────────┴───────────┴───────────┘
```

---

## 🎯 关键特性

### 1. 树形显示

- **Level 0**: 无前缀
- **Level 1+**: 使用 `├──` 或 `└──` 表示层级关系
- **层级缩进**: `paddingLeft: ${record.level * 20}px`

### 2. 年度对比

- **第2列**: 当前年份金额
- **第3列**: 前一年金额
- **动态标题**: 根据 `treeSelectedYear` 自动更新

### 3. 净收入计算

- **活动财务**: 显示净收入（收入 - 支出）
- **其他类别**: 显示总额

### 4. 可点击展开

- **Level 0**: 不可点击
- **Level 1+**: 可点击查看详细交易

### 5. 颜色标识

- **正数**: 绿色 (#52c41a)
- **负数**: 红色 (#ff4d4f)

---

## 📊 数据统计示例

### 活动财务节点显示信息

```
名称: President（会长）(2个活动) 净收入: RM 25,000.00
年份2024: RM 25,000.00
年份2023: RM 20,000.00
```

### 具体活动节点显示信息

```
名称: Hope for Nature 6 (15-01-2025) 净收入: RM 15,000.00
年份2024: RM 15,000.00
年份2023: RM 12,000.00
```

---

## 🔍 详细字段说明

### 活动财务节点字段

```typescript
{
  key: 'income-event-finance-board-president-event-Hope for Nature 6',
  name: 'Hope for Nature 6 (15-01-2025) 净收入: RM 15,000.00',
  level: 3,
  isLastChild: false,
  count: 5,                    // 5笔交易
  totalAmount: 20000,          // 总金额 RM 20,000
  year2025: 15000,             // 2024年净收入 RM 15,000
  year2024: 12000,             // 2023年净收入 RM 12,000
  transactions: [...],          // 关联的5笔交易
  category: 'event-finance',
  boardMember: 'president',
  eventName: 'Hope for Nature 6'
}
```

### 会员费用节点字段

```typescript
{
  key: 'income-member-fees-2024',
  name: '2024 (12)',
  level: 2,
  isLastChild: false,
  count: 12,                   // 12笔交易
  totalAmount: 7000,           // 总金额 RM 7,000
  year2025: 7000,             // 2024年金额 RM 7,000
  year2024: 0,                // 2023年金额 RM 0
  transactions: [...],         // 关联的12笔交易
  category: 'member-fees',
  txAccount: '2024'
}
```

---

## ✅ 总结

### 表格内容

1. **第1列**: 树形结构显示，使用前缀和缩进表示层级
2. **第2列**: 当前年份的金额（根据选择动态变化）
3. **第3列**: 上一年的金额（用于对比）

### 树形结构

- **3-4 层结构**: 主类别 → 子类别 → 负责理事/子账户 → 具体活动/项目
- **智能分组**: 活动财务按负责理事分组，其他类别按子账户分组
- **统计信息**: 显示交易数量、净收入、活动日期等

### 交互特性

- **可点击**: 点击节点可查看详细交易
- **颜色区分**: 正负数用不同颜色显示
- **动态更新**: 根据日期范围自动过滤和统计

**分析完成时间**: 2025-01-13  
**数据结构**: TreeTableItem（18个字段）  
**树形层级**: 3-4层  
**展示方式**: 树形表格，年度对比

