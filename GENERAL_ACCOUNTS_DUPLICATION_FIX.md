# ✅ 修复日常账户重复显示问题

**修复时间**: 2025-01-13  
**问题**: 日常账户在收入和支出部分各出现2次  
**状态**: ✅ 已修复

---

## 🎯 问题描述

### 问题表现

树形视图中，**日常账户 (general-accounts)** 在收入和支出部分各显示2次：

❌ **修复前**:
```
收入
├── 活动财务
├── 会员费用
├── 日常账户 (10) ← 第一次
└── 日常账户 (10) ← 重复

支出
├── 未分类
├── 日常账户 (5) ← 第一次
└── 日常账户 (5) ← 重复
```

### 问题原因

由于使用了 `push` 方法动态添加类别，在 `forEach` 循环中导致：
- 数组在循环过程中被修改
- `general-accounts` 被重复添加到同一个数组
- 或者在多个地方添加了同一个类别

---

## ✅ 修复方案

### 核心改动

#### 1. 预先确定类别列表 (Line 1347-1369)

**修复前** ❌:
```typescript
const incomeCategories = ['event-finance', 'member-fees', 'uncategorized'];
const expenseCategories = ['uncategorized'];

// 在某个地方动态添加
incomeCategories.push('general-accounts');
expenseCategories.push('general-accounts');
```

**修复后** ✅:
```typescript
const baseIncomeCategories = ['event-finance', 'member-fees', 'uncategorized'];
const incomeCategories: string[] = [...baseIncomeCategories]; // 使用副本
const expenseCategories = ['uncategorized'];

// 🔧 预先检查是否应该有日常账户
if (groupedTransactions['general-accounts']) {
  const generalAccountIncome = groupedTransactions['general-accounts']
    .filter(t => t.transactionType === 'income');
  if (generalAccountIncome.length > 0) {
    incomeCategories.push('general-accounts');
  }
}

if (groupedTransactions['general-accounts']) {
  const generalAccountExpense = groupedTransactions['general-accounts']
    .filter(t => t.transactionType === 'expense');
  if (generalAccountExpense.length > 0) {
    expenseCategories.push('general-accounts');
  }
}
```

#### 2. 关键改进

- ✅ 使用 `[...baseIncomeCategories]` 创建副本，避免修改原数组
- ✅ 在 `forEach` 循环之前就确定好所有类别
- ✅ 只添加一次，不会重复添加
- ✅ 有数据才添加，避免空类别

#### 3. 在 forEach 中按类型过滤 (Line 1380-1401, 1568-1589)

**收入部分**:
```typescript
incomeCategories.forEach((category, categoryIndex) => {
  let categoryTransactions: Transaction[] = [];
  
  // 🔧 日常账户：按交易类型过滤
  if (category === 'general-accounts') {
    categoryTransactions = (groupedTransactions[category] || [])
      .filter(t => t.transactionType === 'income'); // 只取收入
  } else {
    categoryTransactions = groupedTransactions[category] || [];
  }
  
  if (categoryTransactions.length === 0) return; // 没有数据就跳过
  
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
      .filter(t => t.transactionType === 'expense'); // 只取支出
  } else {
    categoryTransactions = groupedTransactions[category] || [];
  }
  
  if (categoryTransactions.length === 0) return; // 没有数据就跳过
  
  // ... 构建树形节点
});
```

---

## 📊 修复效果对比

### 修复前 ❌

```
收入
├── 活动财务 (100)
├── 会员费用 (50)
├── 日常账户 (132) RM 85688.64 ← 第一次
│   ├── FD Interest (8) RM 2081.84
│   ├── Merchandise Pink Shirt (24) RM 1690.00
│   └── ...
└── 日常账户 (132) RM 85688.64 ← 重复

支出
├── 未分类 (8)
├── 日常账户 (80) RM -151735.59 ← 第一次
│   ├── Internal Transfer (56) RM 189624.69
│   ├── Miscellaneous (14) RM 7531.20
│   └── ...
└── 日常账户 (80) RM -151735.59 ← 重复
```

### 修复后 ✅

```
收入
├── 活动财务 (100)
├── 会员费用 (50)
└── 日常账户 (132) RM 85688.64 ← 只显示一次

支出
├── 未分类 (8)
└── 日常账户 (80) RM -151735.59 ← 只显示一次
```

---

## 🔄 数据流程

### 修复后的处理流程

```
1. 初始化
   ├─ incomeCategories = ['event-finance', 'member-fees', 'uncategorized']
   └─ expenseCategories = ['uncategorized']

2. 检查日常账户数据
   ├─ 有收入数据? → 添加到 incomeCategories
   └─ 有支出数据? → 添加到 expenseCategories

3. forEach 循环处理
   ├─ 如果是 general-accounts → 按类型过滤
   └─ 其他类别 → 全部显示

4. 结果
   └─ 日常账户在收入/支出各只出现1次 ✅
```

---

## 🎯 关键逻辑

### 1. 预先确定类别列表

```typescript
// 使用副本，避免修改原数组
const incomeCategories: string[] = [...baseIncomeCategories];

// 有收入数据才添加
if (generalAccountIncome.length > 0) {
  incomeCategories.push('general-accounts');
}
```

### 2. 在 forEach 中过滤

```typescript
incomeCategories.forEach((category) => {
  // 日常账户：只取收入类型
  if (category === 'general-accounts') {
    categoryTransactions = groupedTransactions[category]
      .filter(t => t.transactionType === 'income');
  }
  
  // ... 处理
});
```

---

## 📋 修改总结

### 文件

**src/modules/finance/pages/TransactionManagementPage/index.tsx**

### 修改位置

1. **Line 1347-1369**: 预先确定类别列表，避免重复添加
2. **Line 1380-1401**: 处理收入子类别，按类型过滤
3. **Line 1568-1589**: 处理支出子类别，按类型过滤

### 核心改进

- ✅ 使用数组副本避免修改原数组
- ✅ 在循环前确定所有类别
- ✅ 只添加一次，不会重复
- ✅ 有数据才添加，避免空类别

---

## ✅ 总结

### 修复内容

1. ✅ 使用 `[...baseIncomeCategories]` 创建副本
2. ✅ 在 `forEach` 之前就确定所有类别
3. ✅ 有数据才添加，不会重复添加
4. ✅ 按交易类型过滤，收入/支出分开显示

### 修复效果

- ✅ 日常账户在收入部分只显示1次
- ✅ 日常账户在支出部分只显示1次
- ✅ 数据准确，不再重复
- ✅ 逻辑清晰，易于维护

---

**修复完成时间**: 2025-01-13  
**状态**: ✅ 已完成

