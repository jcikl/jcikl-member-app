# 报名管理和活动账户页面修复指南

## 问题诊断

### 主要问题
1. **缺少 Firestore 安全规则**：`eventAccounts` 集合没有定义安全规则，导致所有访问被默认拒绝
2. **缺少 Firestore 索引**：`events` 集合的 `startDate` 单字段索引缺失，导致查询可能失败
3. **数据库可能为空**：如果 `events` 集合中没有数据，页面会显示"活动不存在"

## 已完成的修复

### ✅ 1. 添加 eventAccounts 安全规则
**文件**: `firestore.rules` (第129-132行)

```javascript
match /eventAccounts/{accountId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin() || isActive();
}
```

### ✅ 2. 添加 events 索引
**文件**: `firestore.indexes.json` (第31-40行)

```json
{
  "collectionGroup": "events",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "startDate",
      "order": "DESCENDING"
    }
  ]
}
```

### ✅ 3. 改进错误处理
**文件**: 
- `src/modules/event/pages/EventRegistrationManagementPage/index.tsx`
- `src/modules/event/pages/EventAccountManagementPage/index.tsx`

**改进内容**:
- 添加详细的控制台日志 (`console.log`, `console.error`)
- 显示具体错误信息给用户
- 如果没有活动数据，显示友好提示："暂无活动数据，请先创建活动"

## 需要执行的操作

### 步骤 1: 重新认证 Firebase
```bash
firebase login --reauth
```

### 步骤 2: 部署 Firestore 规则和索引
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

**注意**: 索引创建可能需要几分钟时间。部署完成后，Firebase 控制台会显示索引构建状态。

### 步骤 3: 检查数据库中是否有活动数据

如果数据库中没有活动数据，您需要：

1. 手动在 Firebase 控制台中添加测试活动，或
2. 通过前端"活动管理"页面创建活动

**测试活动数据示例**:
```json
{
  "name": "测试活动",
  "description": "这是一个测试活动",
  "status": "Published",
  "level": "Local",
  "startDate": Timestamp(当前日期),
  "endDate": Timestamp(当前日期 + 7天),
  "location": "吉隆坡",
  "isOnline": false,
  "isFree": true,
  "pricing": {
    "regularPrice": 0,
    "memberPrice": 0,
    "alumniPrice": 0,
    "earlyBirdPrice": 0,
    "committeePrice": 0,
    "currency": "RM"
  },
  "maxParticipants": 100,
  "currentParticipants": 0,
  "organizerId": "your-user-id",
  "organizerName": "组织者名称",
  "createdAt": Timestamp.now(),
  "updatedAt": Timestamp.now()
}
```

## 验证修复

### 1. 检查浏览器控制台
打开报名管理或活动账户页面后，检查浏览器控制台：

**成功情况**:
```
✅ Loaded events: 5
```

**失败情况**:
```
❌ Failed to load events: [错误信息]
```

### 2. 检查 Firebase 控制台

1. 打开 [Firebase 控制台](https://console.firebase.google.com/)
2. 选择项目 `jci-kl-membership-app`
3. 导航到 **Firestore Database** → **索引**
4. 确认索引状态为"已启用"（绿色勾号）

### 3. 检查网络请求

在浏览器开发者工具中：
1. 打开 **Network** 标签
2. 过滤 `firestore.googleapis.com`
3. 查看是否有请求返回 403 (权限拒绝) 或 400 (索引缺失)

## 常见错误及解决方案

### 错误 1: "Missing or insufficient permissions"
**原因**: Firestore 规则未部署
**解决**: 运行 `firebase deploy --only firestore:rules`

### 错误 2: "The query requires an index"
**原因**: Firestore 索引未创建
**解决**: 
1. 运行 `firebase deploy --only firestore:indexes`
2. 等待索引构建完成（通常 1-5 分钟）

### 错误 3: "暂无活动数据"
**原因**: 数据库中没有活动记录
**解决**: 
1. 前往"活动管理"页面
2. 点击"新增活动"按钮
3. 创建至少一个测试活动

## 技术细节

### 为什么需要单字段索引？

Firestore 的复合索引（`status` + `startDate`）不能用于只按 `startDate` 排序的查询。当 `getEvents()` 被调用时没有提供 `status` 筛选条件时，需要单字段 `startDate` 索引。

### eventAccounts 集合的作用

`eventAccounts` 集合用于存储活动的财务账户信息，包括：
- 预算收入/支出
- 实际收入/支出
- 预测收入/支出
- 分类明细（按收入/支出类别）

## 相关文件

- ✅ `firestore.rules` - Firestore 安全规则
- ✅ `firestore.indexes.json` - Firestore 索引配置
- ✅ `src/modules/event/pages/EventRegistrationManagementPage/index.tsx` - 报名管理页面
- ✅ `src/modules/event/pages/EventAccountManagementPage/index.tsx` - 活动账户页面
- ✅ `src/modules/event/services/eventService.ts` - 活动服务层
- ✅ `src/modules/event/services/eventRegistrationService.ts` - 报名服务层
- ✅ `src/modules/event/services/eventAccountService.ts` - 活动账户服务层

---

**最后更新**: 2025-01-13  
**状态**: ✅ 代码修复完成，等待部署验证

