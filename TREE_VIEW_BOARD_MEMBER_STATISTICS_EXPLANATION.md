# 树形视图是否考虑负责理事成员设定

**创建时间**: 2025-01-13  
**主题**: 统计是否考虑负责理事成员设定  
**状态**: 📖 说明文档

---

## ✅ 是的，完全考虑负责理事设定

树形视图的活动财务统计**完全基于负责理事**的设定进行分组和统计。

---

## 📊 统计逻辑

### 第一步：按负责理事分组

```typescript
// Line 1490: 获取负责理事
const boardMemberKey = event?.boardMember || 'unassigned';

// Line 1491-1494: 按负责理事分组
if (!boardMemberGroups[boardMemberKey]) {
  boardMemberGroups[boardMemberKey] = [];
}
boardMemberGroups[boardMemberKey].push(transaction);
```

**逻辑**:
- ✅ 通过 `event.boardMember` 获取负责理事
- ✅ 如果活动没有设置负责理事，归类为 'unassigned'
- ✅ 按负责理事分组所有交易

---

### 第二步：统计每个理事的金额

```typescript
// Line 1507-1513: 计算该理事的净收入
const incomeTotal = boardTransactions
  .filter(t => t.transactionType === 'income')
  .reduce((sum, t) => sum + (t.amount || 0), 0);

const expenseTotal = boardTransactions
  .filter(t => t.transactionType === 'expense')
  .reduce((sum, t) => sum + (t.amount || 0), 0);

const netTotal = incomeTotal - expenseTotal;
```

**统计**:
- ✅ 该理事负责的所有活动的收入总和
- ✅ 该理事负责的所有活动的支出总和
- ✅ 净收入 = 收入 - 支出

---

### 第三步：显示理事节点

```typescript
// Line 1545-1552: 添加负责理事节点
tableData.push(createUnifiedTreeItem(
  `income-${category}-board-${boardMemberKey}`,
  `${boardMemberKey === 'unassigned' ? '未设置负责理事' : boardMemberNameMap[boardMemberKey] || boardMemberKey} (${eventCount}个活动) 净收入: RM ${netTotal.toFixed(2)}`,
  2,
  boardIndex === boardMemberKeys.length - 1,
  boardTransactions,
  { category, boardMember: boardMemberKey }
));
```

**显示**:
- ✅ 理事名称（中文显示）
- ✅ 该理事负责的活动数量
- ✅ 该理事的净收入

---

## 🌳 树形结构示例

```
活动财务 (100条交易)
  │
  ├─ Treasurer（财政） (5个活动) 净收入: RM 12500.00 ← 按理事分组
  │   │
  │   ├─ Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00
  │   │   ├─ [收入] RM 5000.00
  │   │   └─ [支出] RM 2500.00
  │   │
  │   └─ JCI KL Dinner (20-JUN-2024) 净收入: RM 10000.00
  │       └─ [收入] RM 12000.00
  │
  ├─ VP Community（社区发展） (3个活动) 净收入: RM 8000.00 ← 按理事分组
  │   └─ AGM 2024 (10-SEP-2024) 净收入: RM 8000.00
  │       └─ [收入] RM 10000.00
  │
  └─ 未设置负责理事 (2个活动) 净收入: RM -500.00 ← 未设置理事的活动
      └─ [支出] RM 500.00
```

---

## 🔍 完整流程

### 1. 获取负责理事

```typescript
// Line 1469-1490
categoryTransactions.forEach(transaction => {
  // 去除空格以确保匹配
  const txAccount = (transaction.txAccount || '').trim();
  
  // 通过 txAccount 查找活动
  let event = eventsMap.get(txAccount);
  
  // 如果精确匹配失败，尝试模糊匹配
  if (!event && txAccount) {
    for (const [eventName, eventData] of eventsMap.entries()) {
      if (eventName.trim() === txAccount) {
        event = eventData;
        break;
      }
    }
  }
  
  // 获取负责理事（从 Event 对象）
  const boardMemberKey = event?.boardMember || 'unassigned';
  
  // 分组
  boardMemberGroups[boardMemberKey].push(transaction);
});
```

### 2. 统计金额

```typescript
// Line 1507-1513
boardTransactions.forEach(transaction => {
  // 累加收入
  if (transaction.transactionType === 'income') {
    incomeTotal += transaction.amount;
  }
  
  // 累加支出
  if (transaction.transactionType === 'expense') {
    expenseTotal += transaction.amount;
  }
});

const netTotal = incomeTotal - expenseTotal;
```

### 3. 计算活动数量

```typescript
// Line 1515-1522: 统计该理事负责的活动数量
const eventNamesSet = new Set(
  boardTransactions
    .map(t => t.txAccount?.trim() || '')
    .filter(name => name && name !== 'uncategorized')
);
const eventCount = eventNamesSet.size;
```

---

## 📊 统计层级

### 层级1: 负责理事

```typescript
Treasurer（财政） (5个活动) 净收入: RM 12500.00
```

**统计范围**:
- ✅ 该理事负责的所有活动
- ✅ 净收入 = 所有活动的收入 - 所有活动的支出

### 层级2: 单个活动

```typescript
Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00
```

**统计范围**:
- ✅ 该活动的所有交易
- ✅ 净收入 = 该活动的收入 - 该活动的支出

### 层级3: 交易记录

```
[收入] RM 5000.00
[支出] RM 2000.00
```

---

## 🎯 负责理事设定来源

### 数据来源

负责理事设定来自 **Event** collection 的 `boardMember` 字段：

```typescript
interface Event {
  name: string;
  startDate: string;
  boardMember?: string; // ← 负责理事设定
  // ...
}
```

### 查询逻辑

```typescript
// 通过 txAccount（活动名称）查找活动
const event = eventsMap.get(txAccount);

// 获取负责理事
const boardMemberKey = event?.boardMember || 'unassigned';
```

### 理事名称映射

```typescript
const boardMemberNameMap: Record<string, string> = {
  'president': 'President（会长）',
  'vp-community': 'VP Community（社区发展）',
  'vp-membership': 'VP Membership（会员发展）',
  'vp-business': 'VP Business（商业发展）',
  'secretary': 'Secretary（秘书）',
  'treasurer': 'Treasurer（财政）',
  'immediate-past-president': 'Immediate Past President（前任会长）',
  'director-public-relations': 'Director Public Relations（公关理事）',
  'director-creative': 'Director Creative（创意理事）',
  'director-training': 'Director Training（培训理事）',
  'director-sports': 'Director Sports（体育理事）',
};
```

---

## ✅ 总结

### 统计是否考虑负责理事？

**是的，完全考虑！**

### 统计逻辑

1. ✅ **按负责理事分组**
   - 通过 `event.boardMember` 获取负责理事
   - 将交易按理事分组

2. ✅ **统计每个理事的金额**
   - 累加该理事所有活动的收入
   - 累加该理事所有活动的支出
   - 计算净收入

3. ✅ **显示理事节点**
   - 显示理事名称（中文）
   - 显示该理事负责的活动数量
   - 显示该理事的净收入

### 未设置理事的活动

如果活动没有设置负责理事（`boardMember` 为空），会被归类为：
- 理事名称: "未设置负责理事"
- 理事 key: "unassigned"

---

**文档创建时间**: 2025-01-13  
**状态**: ✅ 已完成

