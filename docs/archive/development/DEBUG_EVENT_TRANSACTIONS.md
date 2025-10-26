# 🔍 调试活动账户管理页面银行交易记录

**调试目标**: 检查为什么只有 "hope for nature 6.0" 显示银行交易记录

---

## 🎯 调试步骤

### 1. 打开浏览器控制台

打开活动账户管理页面后，按 `F12` 打开浏览器开发者工具

### 2. 查看调试日志

当选择不同活动时，控制台会输出详细的调试信息：

```
========================================
🔍 [loadBankTransactions] Starting... { selectedEventId: "event-123" }
📋 [DEBUG] Total events loaded: 10

📋 [DEBUG] Selected event: {
  eventId: "event-123",
  eventName: "Hope for Nature 6.0",
  eventStatus: "Published",
  financialAccount: "finance-event-456",
  financialAccountName: "Hope for Nature财务账户"
}

📋 [DEBUG] All events and their financialAccounts:
  - Hope for Nature 6.0: financialAccount="finance-event-456"
  - 年会: financialAccount=""
  - 培训课程: financialAccount=undefined
  ...
```

---

## 🔍 关键检查点

### 检查1: 活动的financialAccount字段

**预期输出**:
```javascript
📋 [DEBUG] All events and their financialAccounts:
  - Hope for Nature 6.0: financialAccount="finance-event-456"  ✅ 有值
  - 年会: financialAccount=""                                    ❌ 空字符串
  - 培训课程: financialAccount=undefined                        ❌ 未定义
```

**可能的问题**:
- ❌ 其他活动的 `financialAccount` 字段未设置
- ❌ 设置为空字符串 ""
- ❌ 字段为 undefined

### 检查2: 查询参数

**预期输出**:
```javascript
🔍 [DEBUG] About to query with: {
  collection: "fin_transactions",
  queryField: "relatedEventId",
  queryValue: "finance-event-456"  // ← 这里应该是活动的financialAccount值
}
```

**可能的问题**:
- ❌ queryValue 为 undefined
- ❌ queryValue 为空字符串
- ❌ queryValue 与交易记录的 relatedEventId 不匹配

### 检查3: 查询结果

**预期输出**:
```javascript
✅ [loadBankTransactions] Loaded transactions: {
  count: 5,
  queryField: "relatedEventId",
  queryValue: "finance-event-456"
}

📋 [DEBUG] Transaction details (first 3):
  Transaction 1: {
    id: "txn-123",
    transactionNumber: "TXN-2024-1234-0001",
    relatedEventId: "finance-event-456",  // ← 必须与活动的financialAccount匹配
    amount: 5000.00,
    description: "活动收入"
  }
```

**如果看到**:
```javascript
✅ [loadBankTransactions] Loaded transactions: {
  count: 0,  // ← 0表示没有找到匹配的交易
  ...
}
```

**原因**:
- 交易记录的 `relatedEventId` 与活动的 `financialAccount` 不匹配
- 或者交易记录根本没有设置 `relatedEventId`

---

## 🛠️ 解决方案

### 方案1: 为活动设置financialAccount

如果活动的 `financialAccount` 为空：

```typescript
// 1. 创建或选择一个财务账户ID
const financialAccountId = "finance-event-" + Date.now();

// 2. 更新活动记录
await updateDoc(doc(db, GLOBAL_COLLECTIONS.EVENTS, eventId), {
  financialAccount: financialAccountId,
  financialAccountName: "活动财务账户"
});
```

### 方案2: 确保交易记录的relatedEventId正确

检查交易记录是否设置了正确的 `relatedEventId`:

```typescript
// 在 Firestore Console 或使用代码检查
const transactions = await getDocs(
  query(
    collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
    where('relatedEventId', '==', financialAccountId)
  )
);

console.log('Matching transactions:', transactions.size);
```

### 方案3: 批量匹配交易记录

如果需要将现有交易记录关联到活动：

```typescript
// 通过关键词或其他规则匹配交易
const transactionsToMatch = await getDocs(
  query(
    collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
    where('mainDescription', 'array-contains', 'Hope for Nature')
  )
);

// 批量更新
transactionsToMatch.forEach(async (doc) => {
  await updateDoc(doc.ref, {
    relatedEventId: financialAccountId
  });
});
```

---

## 📊 数据模型检查清单

### ✅ 活动数据 (projects collection)
- [ ] `financialAccount` 字段已设置
- [ ] 值不为空字符串 ""
- [ ] 值不为 undefined
- [ ] 值格式正确 (如: "finance-event-456")

### ✅ 交易记录 (fin_transactions collection)
- [ ] `relatedEventId` 字段已设置
- [ ] 值与活动的 `financialAccount` 匹配
- [ ] 交易记录存在且数据完整

### ✅ Firestore 索引
- [ ] 为 `relatedEventId` 创建了单字段索引
- [ ] 为 `relatedEventId + transactionDate` 创建了复合索引

---

## 🔧 快速修复脚本

如果需要批量修复数据，可以使用以下脚本：

```typescript
// src/scripts/fixEventFinancialAccounts.ts
import { getDocs, updateDoc, query, collection, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';

/**
 * 为所有活动设置默认的financialAccount
 */
async function fixEventFinancialAccounts() {
  console.log('🔧 Starting to fix event financial accounts...');
  
  // 获取所有活动
  const eventsSnapshot = await getDocs(
    collection(db, GLOBAL_COLLECTIONS.EVENTS)
  );
  
  let fixed = 0;
  
  for (const doc of eventsSnapshot.docs) {
    const data = doc.data();
    
    // 如果 financialAccount 未设置或为空
    if (!data.financialAccount) {
      const financialAccountId = `finance-event-${doc.id}`;
      
      console.log(`Fixing: ${data.name} -> ${financialAccountId}`);
      
      await updateDoc(doc.ref, {
        financialAccount: financialAccountId,
        financialAccountName: `${data.name}财务账户`
      });
      
      fixed++;
    }
  }
  
  console.log(`✅ Fixed ${fixed} events`);
}

// 运行脚本
fixEventFinancialAccounts().then(() => {
  console.log('✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
```

运行脚本：
```bash
npm run fix:event-financial-accounts
```

---

## 📝 调试报告模板

复制此模板，记录调试结果：

```markdown
# 调试报告 - [活动名称]

## 基本信息
- 活动ID: [填写]
- 活动名称: [填写]
- 调试时间: [填写]

## 检查结果

### 1. financialAccount字段
- 值: [填写]
- 是否为空: [是/否]
- 是否正确: [是/否]

### 2. 查询参数
- queryValue: [填写]
- collection: [填写]

### 3. 查询结果
- 找到交易数量: [填写]
- 交易ID列表: [填写]

## 问题分析
[描述发现的问题]

## 解决方案
[记录执行的解决方案]
```

---

**现在可以刷新页面，切换到不同活动，查看控制台输出来诊断问题！**

**调试完成后，记得移除或注释掉额外的 console.log 语句。**
