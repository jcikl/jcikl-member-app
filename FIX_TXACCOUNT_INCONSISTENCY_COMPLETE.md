# ✅ 修复二次分类显示不一致问题

**修复时间**: 2025-01-13  
**问题**: 二次分类（txAccount）字段显示不一致  
**状态**: ✅ 已修复

---

## 🎯 问题描述

在交易管理页面中，"二次分类"字段显示不一致：

| 方式 | 显示内容 | 问题 |
|------|---------|------|
| **批量设置类别** | 活动名称（如 "2025 APBN"） | ✅ 正确 |
| **独立编辑交易** | 活动ID（如 "w6CFrVcUqNGd2..."） | ❌ 错误 |

**用户界面表现**:
```
批量设置类别:
  二次分类: "2025 APBN" ✅ 可读的活动名称

独立编辑:
  二次分类: "w6CFrVcUqNGd2..." ❌ 不可读的活动ID
```

---

## 🔍 问题根源

### 代码分析

#### 1. 批量设置类别（正确 ✅）

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`  
**位置**: Line 875-876

```typescript
if (data.eventId && eventName) {
  updates.txAccount = eventName; // ✅ 活动名称保存到txAccount
  metadata.eventId = data.eventId;
  metadata.eventName = eventName;
}
```

**逻辑**:
- 从 `data.eventId` 加载活动数据
- 获取 `eventName`
- **保存活动名称**到 `txAccount`

---

#### 2. 独立编辑交易（错误 ❌）

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`  
**位置**: Line 545-549（修复前）

```typescript
if (formData.category === 'event-finance' && values.txAccount) {
  // values.txAccount 已经是 financialAccount（因为 Option 的 value 使用了 financialAccount）
  (formData as any).relatedEventId = values.txAccount;
  
  // ❌ 问题：没有设置活动名称，txAccount 仍然是 financialAccount（ID）
}
```

**问题**:
- 只设置了 `relatedEventId = financialAccount`
- **没有设置活动名称到 txAccount**
- 导致 `txAccount` 仍然是 financialAccount（ID）

---

## ✅ 修复方案

### 修复代码

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`  
**位置**: Line 545-560

```typescript
// 🆕 如果是活动财务类别，设置根级别的 relatedEventId 和活动名称
if (formData.category === 'event-finance' && values.txAccount) {
  // values.txAccount 已经是 financialAccount（因为 Option 的 value 使用了 financialAccount）
  (formData as any).relatedEventId = values.txAccount;
  
  // 🔧 查找活动名称并保存到 txAccount
  try {
    const eventsResult = await getEvents({ page: 1, limit: 1000 });
    const selectedEvent = eventsResult.data.find(
      e => e.financialAccount === values.txAccount || e.id === values.txAccount
    );
    if (selectedEvent) {
      formData.txAccount = selectedEvent.name; // ✅ 保存活动名称而不是ID
    }
  } catch (error) {
    console.error('❌ [handleSubmit] 加载活动数据失败:', error);
  }
}
```

---

## 🔧 修复逻辑

### 修复流程图

```
用户选择活动
    ↓
values.txAccount = financialAccount (ID)
    ↓
查找活动数据
    ↓
获取活动名称
    ↓
设置 formData:
  - relatedEventId = financialAccount (ID) ✅
  - txAccount = 活动名称 ✅
    ↓
保存到 Firestore
    ↓
显示: 活动名称而不是ID ✅
```

### 关键改动

1. **加载活动数据**: 在保存前加载活动列表
2. **查找活动**: 根据 financialAccount 或 id 查找活动
3. **保存名称**: 将活动名称保存到 `txAccount`

---

## 📊 修复效果对比

### 修复前 ❌

```
批量设置类别:
  二次分类: "2025 APBN" ✅

独立编辑:
  二次分类: "w6CFrVcUqNGd2..." ❌
```

### 修复后 ✅

```
批量设置类别:
  二次分类: "2025 APBN" ✅

独立编辑:
  二次分类: "2025 APBN" ✅
```

---

## 🎯 数据存储结构

### 活动财务类别交易记录

```typescript
{
  // ... 其他字段
  category: 'event-finance',
  txAccount: '2025 APBN',              // ✅ 显示活动名称
  relatedEventId: 'w6CFrVcUqNGd2...',  // ✅ 用于查询的ID
  metadata: {
    eventId: 'w6CFrVcUqNGd2...',
    eventName: '2025 APBN',             // ✅ 备用名称
  }
}
```

---

## 🧪 测试场景

### 场景1: 批量设置类别

1. 选择多条交易
2. 点击"批量设置类别"
3. 选择类别: "活动财务"
4. 选择活动: "2025 APBN"
5. 确认设置

**预期结果**:
- ✅ txAccount = "2025 APBN"
- ✅ relatedEventId = financialAccount

---

### 场景2: 独立编辑交易

1. 点击交易的"编辑"按钮
2. 选择类别: "活动财务"
3. 选择活动: "2025 APBN"
4. 保存

**预期结果**:
- ✅ txAccount = "2025 APBN"（之前是ID，现在修复了）
- ✅ relatedEventId = financialAccount

---

## 📋 相关文件

### 修改的文件

1. **src/modules/finance/pages/TransactionManagementPage/index.tsx**
   - Line 545-560: 修改 `handleSubmit` 函数
   - 添加活动数据加载逻辑
   - 添加活动名称保存逻辑

### 无修改的文件（参考）

2. **src/modules/finance/pages/TransactionManagementPage/index.tsx**
   - Line 875-876: 批量设置类别的逻辑（已正确）

3. **src/modules/finance/components/EditTransactionModal.tsx**
   - 编辑交易的模态框（无需修改）

4. **src/modules/finance/components/BatchSetCategoryModal.tsx**
   - 批量设置类别的模态框（无需修改）

---

## ✅ 总结

### 问题原因

- 批量设置类别时正确保存活动名称到 `txAccount`
- 独立编辑交易时只保存了 `relatedEventId`，没有保存活动名称
- 导致 `txAccount` 显示的是 ID 而不是名称

### 修复方案

- 在独立编辑时也加载活动数据
- 查找活动并获取活动名称
- 将活动名称保存到 `txAccount`
- 保持与批量设置一致的行为

### 修复效果

- ✅ 二次分类统一显示活动名称
- ✅ 批量设置和独立编辑行为一致
- ✅ 用户界面更加友好
- ✅ 数据存储更加完整

---

**修复时间**: 2025-01-13  
**状态**: ✅ 已完成  
**影响范围**: 交易管理页面的独立编辑功能
