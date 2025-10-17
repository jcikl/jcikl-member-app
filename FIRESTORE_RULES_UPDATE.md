# 🔒 Firestore安全规则更新 - financeEvents集合

## 📅 更新日期
**2025-10-17**

---

## 🎯 更新内容

为新创建的`financeEvents`集合添加了Firestore安全规则。

---

## 📋 添加的规则

### financeEvents集合

```javascript
match /financeEvents/{eventId} {
  allow read: if isAuthenticated();          // 已认证用户可读
  allow create: if isActive() || isAdmin();  // 活跃用户或管理员可创建
  allow update, delete: if isAdmin();        // 只有管理员可更新和删除
}
```

---

## 🚀 部署方式

### 方式1: 使用批处理脚本（推荐）

1. **双击运行：** `deploy-financeEvents-rules.bat`
2. **等待部署完成**
3. **刷新浏览器**

---

### 方式2: 手动命令行

```bash
firebase deploy --only firestore:rules
```

---

### 方式3: Firebase控制台

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 选择项目：**jci-kl-membership-app**
3. 进入 **Firestore Database** → **规则**
4. 复制并粘贴更新后的规则
5. 点击"发布"

---

## ✅ 验证部署

部署成功后，在浏览器控制台应该不再看到以下错误：

```
❌ FirebaseError: Missing or insufficient permissions
```

---

## 🔐 权限说明

### 读取权限 (Read)
- **谁可以读取：** 所有已认证用户
- **用途：** 查看活动列表、活动详情
- **条件：** `isAuthenticated()`

---

### 创建权限 (Create)
- **谁可以创建：** 活跃用户 + 管理员
- **用途：** 创建新活动
- **条件：** `isActive() || isAdmin()`

**isActive() 定义：**
```javascript
function isActive() {
  return isAuthenticated() && 
         get(/databases/$(database)/documents/members/$(request.auth.uid)).data.status == 'active';
}
```

---

### 更新权限 (Update)
- **谁可以更新：** 只有管理员
- **用途：** 修改活动信息、状态
- **条件：** `isAdmin()`

---

### 删除权限 (Delete)
- **谁可以删除：** 只有管理员
- **用途：** 删除活动
- **条件：** `isAdmin()`

---

## 📊 完整的Finance Collections规则

```javascript
// ====================================
// Finance Collections
// 财务集合
// ====================================

match /transactions/{transactionId} {
  allow read: if isAuthenticated();
  allow create: if isActive() || isAdmin();
  allow update, delete: if isAdmin();
}

match /bankAccounts/{accountId} {
  allow read: if isAuthenticated();
  allow create, delete: if isAdmin();
  allow update: if isAdmin() || 
                  (isAuthenticated() && 
                   onlyUpdatingFields(['balance', 'lastTransactionDate', 'updatedAt']));
}

match /transactionPurposes/{purposeId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /billPayments/{billId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /budgets/{budgetId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /fiscalYears/{fiscalYearId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /financeEvents/{eventId} {
  allow read: if isAuthenticated();
  allow create: if isActive() || isAdmin();  // 🆕 新增
  allow update, delete: if isAdmin();
}

match /financialRecords/{recordId} {
  allow read: if isAuthenticated();
  allow create: if isActive() || isAdmin();
  allow update, delete: if isAdmin();
}

match /projectAccounts/{accountId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

---

## ⚠️ 安全注意事项

### 1️⃣ 用户状态检查

创建活动需要用户状态为 `active`：
- ✅ 活跃会员可以创建活动
- ❌ `pending`、`suspended` 状态的用户不能创建
- ✅ 管理员不受状态限制

---

### 2️⃣ 数据验证

建议在客户端添加额外验证：
```typescript
// 创建前检查用户状态
if (user.status !== 'active' && user.role !== 'admin') {
  message.error('只有活跃会员可以创建活动');
  return;
}
```

---

### 3️⃣ 审计日志

所有活动创建/修改/删除操作都会被记录到：
- `auditLogs` 集合
- `userOperationLogs` 集合

---

## 🔍 常见问题

### Q1: 部署后仍然报权限错误？

**解决方案：**
1. 清除浏览器缓存
2. 刷新页面（Ctrl + F5）
3. 检查Firebase控制台确认规则已更新
4. 查看规则生效时间（通常1-2分钟）

---

### Q2: 如何验证规则是否生效？

**验证步骤：**
1. 打开Firebase Console
2. 进入Firestore Database → 规则
3. 确认看到`match /financeEvents/{eventId}`规则
4. 检查"发布时间"是否是最新的

---

### Q3: 测试环境如何配置？

**开发/测试环境建议：**
```javascript
// 开发环境 - 更宽松的规则
match /financeEvents/{eventId} {
  allow read, write: if isAuthenticated();
}
```

**生产环境 - 严格规则：**
```javascript
// 生产环境 - 当前配置
match /financeEvents/{eventId} {
  allow read: if isAuthenticated();
  allow create: if isActive() || isAdmin();
  allow update, delete: if isAdmin();
}
```

---

## 📝 修改记录

| 日期 | 修改内容 | 修改人 |
|------|---------|--------|
| 2025-10-17 | 添加financeEvents集合规则 | AI Assistant |

---

## 🔗 相关文档

- [Firebase Security Rules 文档](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore权限最佳实践](https://firebase.google.com/docs/firestore/security/rules-structure)
- `EVENT_FINANCE_CLASSIFICATION_FEATURE.md` - 活动财务分类功能

---

## ✅ 部署清单

- [x] 更新 `firestore.rules` 文件
- [ ] 运行 `firebase deploy --only firestore:rules`
- [ ] 验证规则已生效
- [ ] 测试创建活动功能
- [ ] 确认不再有权限错误

---

**请立即部署规则以解决权限错误！** 🚀

