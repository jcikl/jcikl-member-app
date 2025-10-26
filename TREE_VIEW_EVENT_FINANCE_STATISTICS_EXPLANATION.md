# 树形视图活动财务金额统计说明

**创建时间**: 2025-01-13  
**主题**: 树形视图标签页活动财务的金额统计逻辑  
**状态**: 📖 说明文档

---

## 📊 统计层级

树形视图的活动财务金额统计分为**三个层级**：

### 层级1: 负责理事（Board Member）

```typescript
// 计算该理事负责的所有活动的净收入
const incomeTotal = boardTransactions
  .filter(t => t.transactionType === 'income')
  .reduce((sum, t) => sum + (t.amount || 0), 0);

const expenseTotal = boardTransactions
  .filter(t => t.transactionType === 'expense')
  .reduce((sum, t) => sum + (t.amount || 0), 0);

const netTotal = incomeTotal - expenseTotal;
```

**统计逻辑**:
- ✅ 收入总额：累加所有收入类型交易
- ✅ 支出总额：累加所有支出类型交易
- ✅ 净收入 = 收入总额 - 支出总额

**显示示例**:
```
Treasurer（财政） (5个活动) 净收入: RM 12500.00
```

---

### 层级2: 单个活动（Individual Event）

```typescript
// 筛选出该活动的所有交易
const eventItems = boardTransactions.filter(t => t.txAccount === eventName);

// 分别计算收入和支出
const eventIncomeItems = eventItems.filter(t => t.transactionType === 'income');
const eventExpenseItems = eventItems.filter(t => t.transactionType === 'expense');

// 计算总额
const eventIncomeTotal = eventIncomeItems.reduce((sum, t) => sum + (t.amount || 0), 0);
const eventExpenseTotal = eventExpenseItems.reduce((sum, t) => sum + (t.amount || 0), 0);

// 计算净收入
const eventNetTotal = eventIncomeTotal - eventExpenseTotal;
```

**统计逻辑**:
- ✅ 筛选出该活动的所有交易（txAccount === eventName）
- ✅ 收入总额：累加该活动的所有收入交易
- ✅ 支出总额：累加该活动的所有支出交易
- ✅ 净收入 = 收入总额 - 支出总额

**显示示例**:
```
Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00
```

---

### 层级3: 所有交易（Individual Transactions）

**统计逻辑**:
- ✅ 显示每一笔交易的详细信息
- ✅ 包括金额、描述、日期等

---

## 🔍 完整数据流程

### 1. 数据分组

```typescript
// 按负责理事分组
const boardMemberGroups: Record<string, Transaction[]> = {};

categoryTransactions.forEach(transaction => {
  const event = eventsMap.get(transaction.txAccount || '');
  const boardMemberKey = event?.boardMember || 'unassigned';
  if (!boardMemberGroups[boardMemberKey]) {
    boardMemberGroups[boardMemberKey] = [];
  }
  boardMemberGroups[boardMemberKey].push(transaction);
});
```

### 2. 负责理事层级统计

```typescript
const incomeTotal = boardTransactions
  .filter(t => t.transactionType === 'income')
  .reduce((sum, t) => sum + (t.amount || 0), 0);

const expenseTotal = boardTransactions
  .filter(t => t.transactionType === 'expense')
  .reduce((sum, t) => sum + (t.amount || 0), 0);

const netTotal = incomeTotal - expenseTotal;

// 显示: Treasurer（财政） (5个活动) 净收入: RM 12500.00
```

### 3. 活动层级统计

```typescript
// 获取该活动的所有交易
const eventItems = boardTransactions.filter(t => t.txAccount === eventName);

// 分别计算收入和支出
const eventIncomeTotal = eventIncomeItems.reduce((sum, t) => sum + (t.amount || 0), 0);
const eventExpenseTotal = eventExpenseItems.reduce((sum, t) => sum + (t.amount || 0), 0);

const eventNetTotal = eventIncomeTotal - eventExpenseTotal;

// 显示: Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00
```

---

## 📊 树形结构示例

```
活动财务 (100条交易)
  │
  ├─ Treasurer（财政） (5个活动) 净收入: RM 12500.00
  │   │
  │   ├─ Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00
  │   │   ├─ [交易1] 收入 RM 5000.00
  │   │   ├─ [交易2] 支出 RM 2000.00
  │   │   └─ [交易3] 支出 RM 500.00
  │   │
  │   ├─ JCI KL Dinner (20-JUN-2024) 净收入: RM 10000.00
  │   │   ├─ [交易1] 收入 RM 12000.00
  │   │   └─ [交易2] 支出 RM 2000.00
  │   │
  │   └─ AGM 2024 (10-SEP-2024) 净收入: RM 0.00
  │       └─ (尚无交易)
  │
  └─ President（会长） (3个活动) 净收入: RM 8000.00
      └─ ...
```

---

## 💡 关键要点

### 1. 净收入计算公式

```
净收入 = 总收入 - 总支出
```

### 2. 统计范围

- ✅ **负责理事层级**：该理事负责的所有活动
- ✅ **活动层级**：该活动的所有交易
- ✅ **交易层级**：单笔交易

### 3. 数据类型

```typescript
// 收入交易
transactionType === 'income'

// 支出交易
transactionType === 'expense'
```

### 4. 金额累加

```typescript
// 使用 reduce 累加金额
.reduce((sum, t) => sum + (t.amount || 0), 0)

// 如果 amount 不存在，则视为 0
```

---

## 🔄 数据处理流程

```
1. 获取所有活动财务交易
   └─> category === 'event-finance'

2. 按负责理事分组
   └─> 通过 event.boardMember 分组

3. 计算每个理事的统计
   ├─> 收入总额 = 所有收入交易的总和
   ├─> 支出总额 = 所有支出交易的总和
   └─> 净收入 = 收入 - 支出

4. 按活动名称分组（在理事组内）
   └─> 通过 transaction.txAccount 分组

5. 计算每个活动的统计
   ├─> 收入总额 = 该活动的收入交易总和
   ├─> 支出总额 = 该活动的支出交易总和
   └─> 净收入 = 收入 - 支出

6. 排序活动
   ├─> 先按活动日期从旧到新
   └─> 日期相同时按名称字母排序
```

---

## ✅ 总结

### 统计层级

1. **负责理事层级** - 统计该理事所有活动的净收入
2. **活动层级** - 统计单个活动的净收入
3. **交易层级** - 显示单笔交易详情

### 核心公式

```
净收入 = Σ(收入交易金额) - Σ(支出交易金额)
```

### 排序规则

1. 先按活动日期从旧到新
2. 日期相同时按名称字母排序

---

**文档创建时间**: 2025-01-13  
**状态**: ✅ 已完成

