# ✅ 修复树形表格日期范围显示问题

**修复时间**: 2025-01-13  
**问题**: 树形表格第3列（前一年）标题显示不正确  
**状态**: ✅ 已修复

---

## 🎯 问题描述

### 修复前的问题 ❌

树形表格第3列的前一年标题显示不正确：

| 日期范围类型 | 选择年份 | 第3列标题 | 问题 |
|------------|---------|---------|------|
| 财年 (fiscal) | 2024 | "2023 (RM)" | ❌ 应显示 "FY2023 (RM)" |
| 自然年 (calendar) | 2024 | "2023 (RM)" | ✅ 正确 |
| 全部 (all) | 2024 | "2023 (RM)" | ✅ 正确 |

### 修复后的效果 ✅

| 日期范围类型 | 选择年份 | 第3列标题 | 状态 |
|------------|---------|---------|------|
| 财年 (fiscal) | 2024 | "FY2023 (RM)" | ✅ 正确 |
| 自然年 (calendar) | 2024 | "2023 (RM)" | ✅ 正确 |
| 全部 (all) | 2024 | "2023 (RM)" | ✅ 正确 |

---

## 🔧 修复方案

### 修复代码位置

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`  
**位置**: Line 2126-2177

### 修复内容

#### 1. 添加 useMemo import (Line 8)

```typescript
import React, { useState, useEffect, useMemo } from 'react';
```

#### 2. 修改第2列标题（当前年份）- Line 2126-2149

```typescript
{
  title: (() => {
    // 动态生成第2列标题（当前选择的年份）
    if (treeDateRangeType === 'fiscal') {
      return `FY${treeSelectedYear} (RM)`;
    } else if (treeDateRangeType === 'calendar') {
      return `${treeSelectedYear} (RM)`;
    } else {
      return `${treeSelectedYear} (RM)`;
    }
  })(),
  dataIndex: 'year2025',
  key: 'year2025',
  // ...
}
```

#### 3. 修改第3列标题（前一年）- Line 2150-2177

```typescript
{
  title: (() => {
    // 🔧 动态生成第3列标题（前一年，根据日期范围类型）
    const selectedYear = parseInt(treeSelectedYear);
    const previousYear = selectedYear - 1;
    
    if (treeDateRangeType === 'fiscal') {
      return `FY${previousYear} (RM)`;
    } else if (treeDateRangeType === 'calendar') {
      return `${previousYear} (RM)`;
    } else {
      return `${previousYear} (RM)`;
    }
  })(),
  dataIndex: 'year2024',
  key: 'year2024',
  // ...
}
```

#### 4. 使用 useMemo 包裹列配置 - Line 2100, 2177

```typescript
const treeTableColumns: ColumnsType<TreeTableItem> = useMemo(() => [
  // ... 列配置
], [treeDateRangeType, treeSelectedYear]);
```

---

## 📊 显示效果对比

### 财年模式 (fiscal)

**修复前**:
```
┌─────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称        │ FY2024 (RM)  │ 2023 (RM)    │  ❌ 格式不一致
└─────────────────────┴──────────────┴──────────────┘
```

**修复后**:
```
┌─────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称        │ FY2024 (RM)  │ FY2023 (RM)  │  ✅ 格式一致
└─────────────────────┴──────────────┴──────────────┘
```

### 自然年模式 (calendar)

**修复后**:
```
┌─────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称        │ 2024 (RM)    │ 2023 (RM)    │  ✅ 正确
└─────────────────────┴──────────────┴──────────────┘
```

### 全部模式 (all)

**修复后**:
```
┌─────────────────────┬──────────────┬──────────────┐
│ 账户/项目名称        │ 2024 (RM)    │ 2023 (RM)    │  ✅ 正确
└─────────────────────┴──────────────┴──────────────┘
```

---

## 🔄 自动更新机制

### useMemo 依赖

```typescript
const treeTableColumns = useMemo(() => [
  // 列配置
], [treeDateRangeType, treeSelectedYear]);
```

**依赖项**:
- `treeDateRangeType`: 日期范围类型（fiscal | calendar | all）
- `treeSelectedYear`: 选择的年份

**效果**:
- ✅ 当 `treeDateRangeType` 变化时，列标题自动更新
- ✅ 当 `treeSelectedYear` 变化时，列标题自动更新
- ✅ 财年模式显示 "FY2024" 格式
- ✅ 自然年模式显示 "2024" 格式

---

## 🎯 关键逻辑

### 标题生成逻辑

```
treeDateRangeType
    │
    ├─> 'fiscal'
    │   └─> FY${year} (RM)
    │
    ├─> 'calendar'
    │   └─> ${year} (RM)
    │
    └─> 'all'
        └─> ${year} (RM)
```

**示例**:
- 财年模式 + 选择 2024:
  - 第2列: `FY2024 (RM)` ✅
  - 第3列: `FY2023 (RM)` ✅
- 自然年模式 + 选择 2024:
  - 第2列: `2024 (RM)` ✅
  - 第3列: `2023 (RM)` ✅

---

## ✅ 总结

### 修复内容

1. ✅ 添加 `useMemo` import
2. ✅ 第2列标题根据日期范围类型动态生成
3. ✅ 第3列标题根据日期范围类型和前一年动态生成
4. ✅ 使用 `useMemo` 包裹列配置，添加依赖项

### 修复效果

- ✅ 财年模式统一显示 FY 前缀
- ✅ 自然年模式显示普通年份
- ✅ 标题随日期范围变化自动更新
- ✅ 前后一年的对比显示正确

**修复完成时间**: 2025-01-13  
**状态**: ✅ 已完成

