# 树形视图列表点击行为说明

**创建时间**: 2025-01-13  
**主题**: 点击树形视图列表项会发生什么  
**状态**: 📖 说明文档

---

## 🎯 点击行为概览

当用户点击树形视图列表中的某个节点时，会触发以下行为：

### 核心行为

```typescript
// Line 2212-2216
const handleTreeNodeClick = (items: Transaction[]) => {
  // 切换到表格视图并筛选这些交易
  setViewMode('table');
  setFilteredTransactions(items);
};
```

---

## 📊 点击条件

### 可点击的节点

```typescript
// Line 2241-2244
onClick={() => {
  if (record.level > 0 && record.transactions.length > 0) {
    handleTreeNodeClick(record.transactions);
  }
}}
```

**条件**:
- ✅ `record.level > 0` - 必须是子节点（不是根节点）
- ✅ `record.transactions.length > 0` - 必须有相关的交易

**视觉效果**:
```typescript
cursor: record.level > 0 ? 'pointer' : 'default'
```
- ✅ 子节点显示为手型光标（可点击）
- ✅ 根节点显示为默认光标（不可点击）

---

## 🔄 点击后的操作

### 1. 切换到表格视图

```typescript
setViewMode('table');
```

**行为**:
- ✅ 从"树形视图"切换到"表格视图"
- ✅ 用户可以看到该节点的详细交易记录

### 2. 筛选相关交易

```typescript
setFilteredTransactions(items);
```

**行为**:
- ✅ 显示该节点包含的所有交易
- ✅ 在表格视图中只显示这些交易

---

## 📋 树形节点类型

### Level 0: 根节点（不可点击）

```typescript
{
  name: '收入',
  level: 0,
  transactions: [], // 空的或包含所有子节点的交易
}
```

**特点**:
- ❌ 不可点击
- ❌ 光标为默认样式
- 没有单独的交易列表

**示例**:
```
收入
```

---

### Level 1: 类别节点（可能可点击）

```typescript
{
  name: '活动财务 (100)',
  level: 1,
  transactions: [该类别的所有交易]
}
```

**特点**:
- ✅ 如果 `transactions.length > 0` 则**可点击**
- ✅ 光标为手型
- 点击后显示该类别的所有交易

**示例**:
```
├── 活动财务 (100)
```

---

### Level 2: 负责理事节点（可点击）

```typescript
{
  name: 'Treasurer（财政） (5个活动) 净收入: RM 12500.00',
  level: 2,
  transactions: [该理事负责的所有交易]
}
```

**特点**:
- ✅ 可点击（`level > 0` 且有交易）
- ✅ 光标为手型
- 点击后显示该理事负责的所有活动交易

**示例**:
```
├── Treasurer（财政） (5个活动) 净收入: RM 12500.00
```

---

### Level 3: 活动节点（可点击）

```typescript
{
  name: 'Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00',
  level: 3,
  transactions: [该活动的所有交易]
}
```

**特点**:
- ✅ 可点击（`level > 0` 且有交易）
- ✅ 光标为手型
- 点击后显示该活动的所有交易记录

**示例**:
```
└── Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00
```

---

## 🎯 完整点击流程

### 示例：点击活动节点

```
用户操作: 点击 "Hope for Nature 6.0" 节点
    ↓
系统响应:
    1. 检查条件
       - level = 3 > 0 ✅
       - transactions.length > 0 ✅
    
    2. 调用 handleTreeNodeClick
       ↓
    3. 切换到表格视图
       setViewMode('table')
       ↓
    4. 筛选该活动的所有交易
       setFilteredTransactions(items)
       ↓
    5. 显示结果
       - 切换视图模式：树形 → 表格
       - 筛选交易：只显示 "Hope for Nature 6.0" 的交易
```

---

## 📊 视觉效果

### 点击前的树形视图

```
收入
├── 活动财务 (100)
│   ├── Treasurer（财政） (5个活动) 净收入: RM 12500.00
│   │   └── Hope for Nature 6.0 (15-AUG-2024) 净收入: RM 2500.00 ← 点击这里
```

### 点击后的表格视图

```
视图模式: 表格视图 ✅

筛选后的交易（只显示 Hope for Nature 6.0 的交易）:
┌────┬─────┬───────────┬──────┬──────┐
│日期│描述 │  金额     │ 类别 │ 状态 │
├────┼─────┼───────────┼──────┼──────┤
│... │...  │  +5000.00 │ 活动 │ 已审核│
│... │...  │  -2000.00 │ 活动 │ 已审核│
│... │...  │  -500.00  │ 活动 │ 已审核│
└────┴─────┴───────────┴──────┴──────┘
```

---

## ✅ 总结

### 点击行为

1. ✅ **自动切换到表格视图**
2. ✅ **只显示该节点的相关交易**
3. ✅ **便于查看详细信息**

### 可点击条件

1. ✅ **Level > 0**（子节点）
2. ✅ **有相关的交易**（`transactions.length > 0`）

### 用户体验

- ✅ 从树形视图快速钻取到详细交易
- ✅ 一键切换视图模式
- ✅ 自动筛选相关数据
- ✅ 操作简单直观

---

**文档创建时间**: 2025-01-13  
**状态**: ✅ 已完成

