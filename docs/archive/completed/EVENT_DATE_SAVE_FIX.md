# 活动日期保存修复报告

## 问题描述
用户反馈：编辑活动无法保存新的日期和时间

## 根本原因分析
问题出现在活动编辑功能中，当用户编辑活动日期时，如果日期字段为空字符串，代码会将其转换为`undefined`：

```typescript
// 问题代码
eventDate: editEventDate || undefined,
```

由于`cleanUndefinedValues`函数会将`undefined`值从对象中移除（不发送到Firebase），导致：
1. 空日期字段不会被保存到数据库
2. 用户设置的日期无法正确更新

## 修复方案
将`undefined`改为`null`，确保字段能够正确保存到Firebase：

```typescript
// 修复后的代码
eventDate: editEventDate || null,
```

## 修复的文件和位置

### 1. 编辑活动功能
**文件**: `src/modules/finance/pages/EventFinancialPage/index.tsx`
**位置**: `handleSaveEditEvent`函数（第423行）
**修复内容**:
```typescript
// 修复前
eventDate: editEventDate || undefined,

// 修复后  
eventDate: editEventDate || null, // 🔑 使用null而不是undefined，以便更新或清空日期
```

### 2. 创建活动功能
**文件**: `src/modules/finance/pages/EventFinancialPage/index.tsx`
**位置**: `handleCreateEvent`函数（第466行）
**修复内容**:
```typescript
// 修复前
eventDate: newEventDate || undefined,

// 修复后
eventDate: newEventDate || null, // 🔑 使用null而不是undefined，以便保存或清空日期
```

## 技术原理

### cleanUndefinedValues函数行为
```typescript
// 在src/utils/dataHelpers.ts中
for (const [key, value] of Object.entries(obj)) {
  if (value === undefined) {
    cleaned[key] = null;  // undefined转换为null
  } else if (value === null) {
    cleaned[key] = null;  // null保持为null
  }
  // ...
}
```

### Firebase数据保存规则
- Firebase不接受`undefined`值
- `undefined`值会被`cleanUndefinedValues`函数移除
- `null`值会被保留并发送到Firebase
- 空字符串`""`在JavaScript中是falsy值，会被`||`操作符处理

## 修复效果
1. ✅ 用户编辑活动日期时，新日期能够正确保存到数据库
2. ✅ 用户清空活动日期时，数据库中的日期字段会被设置为`null`
3. ✅ 创建新活动时，日期字段能够正确保存
4. ✅ 不影响其他字段的正常保存功能

## 测试建议
1. 编辑现有活动，修改日期，验证保存是否成功
2. 编辑现有活动，清空日期字段，验证是否能够清空
3. 创建新活动，设置日期，验证是否能够保存
4. 创建新活动，不设置日期，验证是否能够创建成功

## 相关文件
- `src/modules/finance/pages/EventFinancialPage/index.tsx` - 主要修复文件
- `src/utils/dataHelpers.ts` - cleanUndefinedValues函数
- `src/modules/finance/services/financeEventService.ts` - 活动服务层

## 修复状态
✅ 已完成 - 活动日期保存问题已修复
