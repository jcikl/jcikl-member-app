# 树形视图缺失交易诊断

**创建时间**: 2025-01-13  
**问题**: 某些已设定二次分类的交易没有纳入树形视图统计  
**状态**: 🔍 诊断中

---

## 🎯 问题分析

### 问题描述

- ✅ 银行交易记录已经设定了二次分类（活动）
- ❌ 某些交易记录没有纳入树形视图的统计
- ❌ 点击该活动时没有显示全部已设定的记录

---

## 🔍 可能的原因

### 原因1: txAccount 字段值不匹配

**现象**: `fin_transactions` 中的 `txAccount` 与活动名称不完全一致

**可能的情况**:
- `txAccount` = "Hope for Nature 6.0"
- 但系统中存储的活动名称 = "Hope for Nature 6.0 "
- 多了空格导致不匹配

**验证方法**:
```typescript
// 检查 txAccount 是否与活动名称完全匹配
const eventItems = boardTransactions.filter(t => t.txAccount === eventName);
```

---

### 原因2: category 字段不是 'event-finance'

**现象**: 交易记录的 category 字段不是 'event-finance'

**检查代码** (Line 1347-1356):
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

**问题**: 如果 `transaction.category !== 'event-finance'`，则不会出现在活动财务的分组中

---

### 原因3: isSplit = true 被过滤

**代码** (Line 1348):
```typescript
if (transaction.isSplit === true) return acc; // 跳过已拆分的父交易
```

**问题**: 如果交易被错误标记为已拆分，会被跳过

---

### 原因4: txAccount 字段为空或未设置

**代码** (Line 1489-1490):
```typescript
const eventNamesSet = new Set(boardTransactions.map(t => t.txAccount)
  .filter(name => name && name !== 'uncategorized')
);
```

**问题**: 如果 `txAccount` 为空或 'uncategorized'，会被过滤掉

---

### 原因5: 日期范围筛选过滤了交易

**代码** (Line 1732-1755):
```typescript
if (treeDateRangeType !== 'all') {
  realTransactions = realTransactions.filter(transaction => {
    // 根据日期范围类型过滤
    // ...
  });
}
```

**问题**: 如果选择了特定日期范围，可能过滤掉了某些交易

---

## 🔧 诊断步骤

### Step 1: 检查 txAccount 字段

```sql
-- Firestore 查询
SELECT * FROM fin_transactions 
WHERE category = 'event-finance' 
AND txAccount = 'Hope for Nature 6.0'
```

**检查**:
- ✅ `txAccount` 是否正确
- ✅ 是否有额外的空格
- ✅ 大小写是否匹配

### Step 2: 检查 category 字段

```sql
SELECT * FROM fin_transactions 
WHERE txAccount = 'Hope for Nature 6.0'
```

**检查**:
- ✅ 是否所有交易的 `category = 'event-finance'`
- ✅ 是否有其他类别

### Step 3: 检查 isSplit 字段

```sql
SELECT * FROM fin_transactions 
WHERE txAccount = 'Hope for Nature 6.0'
AND isSplit = true
```

**检查**:
- ✅ 是否有交易被错误标记为已拆分
- ✅ `isVirtual` 是否为 true（虚拟交易会被过滤）

### Step 4: 检查日期

**检查**:
- ✅ 交易日期是否在选择的日期范围内
- ✅ 如果选择了 "2024财年"，交易日期是否在 2024-10-01 到 2025-09-30

---

## ✅ 诊断工具

### 在浏览器控制台运行以下代码

```javascript
// 获取所有交易
const allTransactions = await getTransactions({ page: 1, limit: 10000 });

// 筛选出某个活动的交易
const eventName = 'Hope for Nature 6.0';
const eventTransactions = allTransactions.filter(t => t.txAccount === eventName);

console.log('活动交易总数:', eventTransactions.length);
console.log('按类别分组:', eventTransactions.reduce((acc, t) => {
  acc[t.category] = (acc[t.category] || 0) + 1;
  return acc;
}, {}));

console.log('包含已拆分的交易:', eventTransactions.filter(t => t.isSplit === true).length);
console.log('包含虚拟交易:', eventTransactions.filter(t => t.isVirtual === true).length);
```

---

## 🔧 可能的解决方案

### 方案1: 修复 txAccount 不匹配

```typescript
// 在比较时去除空格
const eventItems = boardTransactions.filter(t => {
  const txAccount = t.txAccount?.trim() || '';
  const eventNameTrimmed = eventName.trim();
  return txAccount === eventNameTrimmed;
});
```

### 方案2: 检查 category 字段

确保所有应归类为活动财务的交易都有正确的 category:
```typescript
// 批量修复
await updateDoc(transactionRef, {
  category: 'event-finance'
});
```

### 方案3: 放宽日期筛选

如果需要显示所有日期范围的交易，选择 "全部" 日期范围

---

**文档创建时间**: 2025-01-13  
**状态**: 🔍 待诊断

