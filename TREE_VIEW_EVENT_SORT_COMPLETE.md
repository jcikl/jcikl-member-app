# ✅ 树形视图活动财务排序优化

**修复时间**: 2025-01-13  
**功能**: 活动财务根据活动日期从旧至新，再根据活动名称字母排序  
**状态**: ✅ 已完成

---

## 🎯 需求

### 排序规则

用户要求在交易管理页面的树形视图中，活动财务根据：
1. **活动日期** - 从旧至新（最早的在上面）
2. **活动名称** - 如果日期相同，按名称字母排序（从A到Z）

---

## ✅ 修改方案

### 核心改动

在构建树形数据的 `buildTreeData` 函数中，对活动列表进行排序：

#### 修改前 ❌

```typescript
const eventNames = [...new Set(boardTransactions.map(t => t.txAccount).filter(name => name && name !== 'uncategorized'))] as string[];
const eventCount = eventNames.length;
```

#### 修改后 ✅

```typescript
const eventNamesSet = new Set(boardTransactions.map(t => t.txAccount).filter(name => name && name !== 'uncategorized')) as Set<string>;
let eventNames = Array.from(eventNamesSet);

// 🔧 排序：先按活动日期从旧至新，再按活动名称字母排序
eventNames = eventNames.sort((name1, name2) => {
  const event1 = eventsMap.get(name1);
  const event2 = eventsMap.get(name2);
  
  // 获取活动日期
  const date1 = event1?.startDate ? new Date(event1.startDate).getTime() : 0;
  const date2 = event2?.startDate ? new Date(event2.startDate).getTime() : 0;
  
  // 先按日期排序（从旧到新）
  if (date1 !== date2) {
    return date1 - date2;
  }
  
  // 如果日期相同，按名称字母排序（从A到Z）
  return name1.localeCompare(name2, 'zh-CN');
});

const eventCount = eventNames.length;
```

---

## 📊 排序逻辑

### 排序算法

```typescript
eventNames.sort((name1, name2) => {
  // 1. 获取活动数据
  const event1 = eventsMap.get(name1);
  const event2 = eventsMap.get(name2);
  
  // 2. 转换为时间戳
  const date1 = event1?.startDate ? new Date(event1.startDate).getTime() : 0;
  const date2 = event2?.startDate ? new Date(event2.startDate).getTime() : 0;
  
  // 3. 先按日期排序（从旧到新 = 小到大）
  if (date1 !== date2) {
    return date1 - date2;
  }
  
  // 4. 日期相同时按名称字母排序
  return name1.localeCompare(name2, 'zh-CN');
});
```

### 排序规则

1. **日期优先**：
   - ✅ 如果两个活动的日期不同，按日期从旧到新排序
   - ✅ 日期较早的在上面

2. **名称次之**：
   - ✅ 如果两个活动的日期相同，按名称字母排序
   - ✅ 使用 `localeCompare` 支持中文和英文混合排序

---

## 🎯 排序效果

### 示例数据

假设有以下活动：

| 活动名称 | 活动日期 |
|---------|---------|
| Hope for Nature 6.0 | 2024-08-15 |
| JCI KL Dinner | 2024-06-20 |
| AGM 2024 | 2024-09-10 |
| AGM 2023 | 2023-09-10 |

### 排序后的顺序

```
1. AGM 2023          (2023-09-10) - 最旧
2. JCI KL Dinner     (2024-06-20)
3. Hope for Nature 6.0 (2024-08-15)
4. AGM 2024          (2024-09-10) - 最新
```

### 同一日期的活动

假设有多个活动在同一天：

| 活动名称 | 活动日期 |
|---------|---------|
| Workshop A | 2024-06-20 |
| Workshop B | 2024-06-20 |
| Seminar Z | 2024-06-20 |

### 排序后的顺序

```
1. Seminar Z    (2024-06-20) - 按字母排序（Z最早）
2. Workshop A   (2024-06-20)
3. Workshop B   (2024-06-20)
```

---

## 📋 代码位置

### 文件

**src/modules/finance/pages/TransactionManagementPage/index.tsx**

### 修改位置

**Line 1488-1510**: 添加活动排序逻辑

### 关键逻辑

- ✅ 从 `eventsMap` 获取活动日期
- ✅ 转换为时间戳进行比较
- ✅ 先按日期排序（从旧到新）
- ✅ 再按名称字母排序

---

## ✅ 总结

### 修改内容

1. ✅ 提取活动名称到数组
2. ✅ 按日期排序（从旧到新）
3. ✅ 日期相同时按名称字母排序
4. ✅ 使用中文友好的排序方法

### 修复效果

- ✅ 活动按日期从旧到新显示
- ✅ 同一日期的活动按名称字母排序
- ✅ 树形视图结构更清晰
- ✅ 便于查找和分析

---

**修复完成时间**: 2025-01-13  
**状态**: ✅ 已完成

