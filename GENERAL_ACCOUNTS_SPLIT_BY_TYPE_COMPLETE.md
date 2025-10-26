# ✅ 修复日常账户按交易类型分开显示

**修复时间**: 2025-01-13  
**问题**: 日常账户的收支混在一起显示  
**状态**: ✅ 已修复

---

## 🎯 问题描述

### 问题表现

树形视图中，**日常账户 (general-accounts)** 的分类显示不正确：

❌ **修复前**:
```
收入
├── 活动财务
├── 会员费用
└── 日常账户 (10) ← 包含所有日常账户交易（收入和支出混在一起）

支出
└── 未分类 (5)
```

### 问题原因

原代码中，日常账户同时出现在 `incomeCategories` 和 `expenseCategories` 列表中，导致：
- 收入部分显示所有日常账户交易（包括支出）
- 支出部分也显示所有日常账户交易（包括收入）
- 数据重复且不准确

---

## ✅ 修复方案

### 核心改动

#### 1. 修改类别分类 (Line 1347-1350)

**修复前** ❌:
```typescript
const incomeCategories = ['event-finance', 'member-fees', 'general-accounts', 'uncategorized'];
const expenseCategories = ['general-accounts', 'uncategorized'];
```

**修复后** ✅:
```typescript
const incomeCategories = ['event-finance', 'member-fees', 'uncategorized'];
const expenseCategories = ['uncategorized'];
```

#### 2. 按交易类型动态添加到类别列表 (Line 1379-1386, 1572-1579)

**收入部分**:
```typescript
// 🔧 处理日常账户的收入子类别（添加到收入部分）
if (groupedTransactions['general-accounts']) {
  const generalAccountIncome = groupedTransactions['general-accounts']
    .filter(t => t.transactionType === 'income');
  if (generalAccountIncome.length > 0) {
    incomeCategories.push('general-accounts'); // 🆕 动态添加
  }
}
```

**支出部分**:
```typescript
// 🔧 处理日常账户的支出子类别（添加到支出部分）
if (groupedTransactions['general-accounts']) {
  const generalAccountExpense = groupedTransactions['general-accounts']
    .filter(t => t.transactionType === 'expense');
  if (generalAccountExpense.length > 0) {
    expenseCategories.push('general-accounts'); // 🆕 动态添加
  }
}
```

#### 3. 按交易类型过滤交易 (Line 1389-1400, 1582-1593)

**收入部分**:
```typescript
incomeCategories.forEach((category, categoryIndex) => {
  let categoryTransactions: Transaction[] = [];
  
  // 🔧 日常账户：按交易类型过滤
  if (category === 'general-accounts') {
    categoryTransactions = (groupedTransactions[category] || [])
      .filter(t => t.transactionType === 'income'); // 🆕 只取收入
  } else {
    categoryTransactions = groupedTransactions[category] || [];
  }
  
  // ... 构建树形节点
});
```

**支出部分**:
```typescript
expenseCategories.forEach((category, categoryIndex) => {
  let categoryTransactions: Transaction[] = [];
  
  // 🔧 日常账户：按交易类型过滤
  if (category === 'general-accounts') {
    categoryTransactions = (groupedTransactions[category] || [])
      .filter(t => t.transactionType === 'expense'); // 🆕 只取支出
  } else {
    categoryTransactions = groupedTransactions[category] || [];
  }
  
  // ... 构建树形节点
});
```

#### 4. 统计标题的数据也需要过滤 (Line 1361-1367, 1555-1560)

**收入标题**:
```typescript
const incomeTransactions = incomeCategories.flatMap(cat => {
  if (cat === 'general-accounts') {
    return groupedTransactions[cat]?.filter(t => t.transactionType === 'income') || [];
  }
  return groupedTransactions[cat] || [];
});
```

**支出标题**:
```typescript
const expenseTransactions = expenseCategories.flatMap(cat => {
  if (cat === 'general-accounts') {
    return groupedTransactions[cat]?.filter(t => t.transactionType === 'expense') || [];
  }
  return groupedTransactions[cat] || [];
});
```

---

## 📊 修复效果对比

### 修复前 ❌

```
收入
├── 活动财务 (100)
├── 会员费用 (50)
└── 日常账户 (15) ← 包含收入和支出

支出
└── 未分类 (5)
```

**问题**:
- ❌ 日常账户在收入部分显示所有15笔交易（包括支出）
- ❌ 统计不准确

---

### 修复后 ✅

```
收入
├── 活动财务 (100)
├── 会员费用 (50)
└── 日常账户 (10) ← 只显示收入类型

支出
├── 未分类 (5)
└── 日常账户 (5) ← 只显示支出类型
```

**修复**:
- ✅ 日常账户在收入部分只显示收入类型的交易
- ✅ 日常账户在支出部分只显示支出类型的交易
- ✅ 统计准确，不重复

---

## 🔄 数据流程

### 修复后的处理流程

```
日常账户交易集合
    ├─ transactionType: 'income' → 10笔
    └─ transactionType: 'expense' → 5笔
         │
         ├─ 收入部分
         │  └─> 过滤: t.transactionType === 'income'
         │      └─> 显示: 日常账户 (10笔收入)
         │
         └─ 支出部分
            └─> 过滤: t.transactionType === 'expense'
                └─> 显示: 日常账户 (5笔支出)
```

---

## 🎯 关键逻辑

### 收入部分

```typescript
// 1. 检查是否有日常账户的收入交易
if (groupedTransactions['general-accounts']) {
  const income = groupedTransactions['general-accounts']
    .filter(t => t.transactionType === 'income');
  
  if (income.length > 0) {
    // 2. 动态添加到收入类别列表
    incomeCategories.push('general-accounts');
  }
}

// 3. 处理时只取收入类型的交易
if (category === 'general-accounts') {
  categoryTransactions = groupedTransactions[category]
    .filter(t => t.transactionType === 'income');
}
```

### 支出部分

```typescript
// 1. 检查是否有日常账户的支出交易
if (groupedTransactions['general-accounts']) {
  const expense = groupedTransactions['general-accounts']
    .filter(t => t.transactionType === 'expense');
  
  if (expense.length > 0) {
    // 2. 动态添加到支出类别列表
    expenseCategories.push('general-accounts');
  }
}

// 3. 处理时只取支出类型的交易
if (category === 'general-accounts') {
  categoryTransactions = groupedTransactions[category]
    .filter(t => t.transactionType === 'expense');
}
```

---

## 📋 修改总结

### 文件

**src/modules/finance/pages/TransactionManagementPage/index.tsx**

### 修改位置

1. **Line 1347-1350**: 修改初始类别列表，移除 `general-accounts`
2. **Line 1352-1377**: 添加日常账户收入部分处理
3. **Line 1379-1400**: 修改收入子类别处理逻辑
4. **Line 1545-1593**: 添加日常账户支出部分处理

### 核心逻辑

- ✅ 动态检测：检查是否有日常账户收入/支出交易
- ✅ 动态添加：有数据时才添加到类别列表
- ✅ 类型过滤：只显示对应类型的交易
- ✅ 统计准确：收入和支出分开统计

---

## ✅ 总结

### 修复内容

1. ✅ 从初始类别列表移除 `general-accounts`
2. ✅ 动态检测日常账户收入交易，有则添加到收入列表
3. ✅ 动态检测日常账户支出交易，有则添加到支出列表
4. ✅ 处理时按交易类型过滤日常账户交易

### 修复效果

- ✅ 收入部分只显示收入类型的日常账户交易
- ✅ 支出部分只显示支出类型的日常账户交易
- ✅ 统计准确，不再重复
- ✅ 树形结构清晰

---

**修复完成时间**: 2025-01-13  
**状态**: ✅ 已完成

