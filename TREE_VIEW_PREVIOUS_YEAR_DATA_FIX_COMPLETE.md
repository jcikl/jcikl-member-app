# ✅ 修复树形视图前一年数据显示为0的问题

**修复时间**: 2025-01-13  
**问题**: 树形表格第3列（前一年）显示为 RM 0.00  
**状态**: ✅ 已修复

---

## 🎯 问题描述

### 问题表现

- 第1列: 账户/项目名称 ✅
- 第2列: 2024 (RM) 或 FY2024 (RM) ✅ 显示正确的数据
- 第3列: 2023 (RM) 或 FY2023 (RM) ❌ **全部显示 RM 0.00**

**根本原因**: 
数据过滤逻辑只保留了当前选择年份的数据，导致前一年的数据被完全过滤掉。

---

## 🔍 问题根源分析

### 原始过滤逻辑（错误）❌

**位置**: Line 1615-1647（修复前）

```typescript
// 🚫 问题代码：只过滤当前年份
if (treeDateRangeType !== 'all') {
  const year = parseInt(treeSelectedYear);
  
  realTransactions = realTransactions.filter(transaction => {
    const txYear = txDate.getFullYear();
    
    if (treeDateRangeType === 'fiscal') {
      return txDate在财年内; // 只保留当前财年
    } else if (treeDateRangeType === 'calendar') {
      return txYear === year; // 只保留当前年 ❌
    }
  });
}
```

**问题**:
- ✅ 第2列：数据存在（当前年数据被保留）
- ❌ 第3列：数据为0（前一年数据被过滤掉）

---

## ✅ 修复方案

### 修复后的过滤逻辑 ✅

**位置**: Line 1614-1655

```typescript
// 🔧 修复：保留当前年和前一年的数据用于统计对比
if (treeDateRangeType !== 'all') {
  const year = parseInt(treeSelectedYear);
  const previousYear = year - 1; // 🆕 前一年
  
  realTransactions = realTransactions.filter(transaction => {
    const txYear = txDate.getFullYear();
    
    if (treeDateRangeType === 'fiscal') {
      // 🆕 保留当前财年和前一个财年的数据
      const inCurrentFiscal = txDate在当前财年内;
      const inPreviousFiscal = txDate在前财年内;
      return inCurrentFiscal || inPreviousFiscal; // ✅ 两个财年都保留
      
    } else if (treeDateRangeType === 'calendar') {
      // 🆕 保留当前年和前一年的数据
      return txYear === year || txYear === previousYear; // ✅ 两个年份都保留
    }
  });
}
```

---

## 🔧 具体实现

### 1. 财年模式 (fiscal)

**修复前** ❌:
```typescript
const fiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(year);
return txDateStr >= fiscalPeriod.startDate && txDateStr <= fiscalPeriod.endDate;
```

**修复后** ✅:
```typescript
const fiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(year);
const inCurrentFiscal = txDateStr >= fiscalPeriod.startDate && txDateStr <= fiscalPeriod.endDate;

// 检查前一个财年
const previousFiscalPeriod = smartFiscalYearService.detectFiscalYearPeriod(previousYear);
const inPreviousFiscal = txDateStr >= previousFiscalPeriod.startDate && txDateStr <= previousFiscalPeriod.endDate;

return inCurrentFiscal || inPreviousFiscal;
```

**效果**:
- ✅ FY2025: 显示当前财年数据
- ✅ FY2024: 显示前一个财年数据（不再为0）

---

### 2. 自然年模式 (calendar)

**修复前** ❌:
```typescript
return txYear === year; // 只保留当前年
```

**修复后** ✅:
```typescript
return txYear === year || txYear === previousYear; // 保留当前年和前一年
```

**效果**:
- ✅ 2025: 显示2025年数据
- ✅ 2024: 显示2024年数据（不再为0）

---

## 📊 数据流程

### 修复后的数据流

```
加载所有交易数据
    ↓
过滤虚拟子交易
    ↓
按日期范围过滤（财年或自然年）
    ├─ 当前年：保留 ✅
    └─ 前一年：也保留 ✅  🆕
    ↓
传递给 buildTreeTableData
    ↓
calculateYearlyStats 计算统计
    ├─ 当前年统计 ✅
    └─ 前一年统计 ✅  🆕
    ↓
显示在表格中
    ├─ 第2列：当前年数据 ✅
    └─ 第3列：前一年数据 ✅（不再是0）
```

---

## 🎯 修复前后对比

### 修复前 ❌

**财年模式（选择 FY2025）**:
```
┌─────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称        │ FY2025 (RM)  │ FY2024 (RM)  │
├─────────────────────┼──────────────┼──────────────┤
│ 收入                │  RM 10000.00 │  RM 0.00     │ ❌ 前一年显示0
│ 活动财务 (10)        │  RM 5000.00  │  RM 0.00     │ ❌ 前一年显示0
│ VP Community        │  RM 2000.00  │  RM 0.00     │ ❌ 前一年显示0
└─────────────────────┴──────────────┴──────────────┘
```

### 修复后 ✅

**财年模式（选择 FY2025）**:
```
┌─────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称        │ FY2025 (RM)  │ FY2024 (RM)  │
├─────────────────────┼──────────────┼──────────────┤
│ 收入                │  RM 10000.00 │  RM 8000.00  │ ✅ 前一年有数据
│ 活动财务 (10)        │  RM 5000.00  │  RM 4000.00  │ ✅ 前一年有数据
│ VP Community        │  RM 2000.00  │  RM 1500.00  │ ✅ 前一年有数据
└─────────────────────┴──────────────┴──────────────┘
```

---

## 🧪 测试场景

### 场景1: 财年模式

**操作**:
1. 选择日期范围: "财年(基于配置)"
2. 选择财年: "FY2025"
3. 查看树形表格

**预期结果**:
- ✅ 第2列: FY2025 显示 2025-07-01 至 2026-06-30 的数据
- ✅ 第3列: FY2024 显示 2024-07-01 至 2025-06-30 的数据
- ✅ 两列都有非0的金额显示

---

### 场景2: 自然年模式

**操作**:
1. 选择日期范围: "自然年(1月-12月)"
2. 选择年份: "2025"
3. 查看树形表格

**预期结果**:
- ✅ 第2列: 2025 (RM) 显示 2025-01-01 至 2025-12-31 的数据
- ✅ 第3列: 2024 (RM) 显示 2024-01-01 至 2024-12-31 的数据
- ✅ 两列都有非0的金额显示

---

## 📝 关键改动

### 修改位置

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`  
**位置**: Line 1614-1655

### 核心改动

1. ✅ 添加 `previousYear` 变量
2. ✅ 财年模式：检查两个财年范围（当前 + 前一个）
3. ✅ 自然年模式：检查两个自然年（当前年 + 前一年）
4. ✅ 使用 `||` 操作符保留两个年份的数据

---

## ✅ 总结

### 问题原因

- ❌ 原始逻辑只过滤当前选择年份
- ❌ 前一年数据被过滤掉
- ❌ 导致第3列显示 RM 0.00

### 修复方案

- ✅ 同时保留当前年和前一年的数据
- ✅ 财年模式保留两个财年
- ✅ 自然年模式保留两个自然年
- ✅ 年度对比功能正常工作

### 修复效果

- ✅ 第3列不再显示 0
- ✅ 可以正确对比两年数据
- ✅ 财年和自然年模式都正常工作

---

**修复完成时间**: 2025-01-13  
**状态**: ✅ 已完成
