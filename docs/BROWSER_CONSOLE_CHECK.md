# 🌐 浏览器控制台检查指南

由于Firestore配额限制，无法在Node.js脚本中运行完整检查。请按照以下步骤在浏览器控制台中进行检查。

---

## 🔍 检查交易记录关联状态

### 步骤1: 打开浏览器控制台

1. 启动开发服务器: `npm run dev`
2. 打开应用并登录
3. 按 `F12` 打开开发者工具
4. 切换到 "Console" 标签

### 步骤2: 运行检查代码

复制以下代码到控制台运行:

```javascript
(async () => {
  console.log('🔍 Starting transaction-event link check...\n');
  
  // 导入Firestore
  const { getDocs, collection } = await import('firebase/firestore');
  const { db } = await import('/src/services/firebase');
  
  // 1. 获取活动的 financialAccount 列表
  const eventsSnapshot = await getDocs(collection(db, 'projects'));
  const financialAccounts = new Set();
  const eventMap = new Map();
  
  eventsSnapshot.forEach(doc => {
    const event = doc.data();
    if (event.financialAccount) {
      financialAccounts.add(event.financialAccount);
      eventMap.set(event.financialAccount, event.name);
    }
  });
  
  console.log(`✅ Found ${financialAccounts.size} events with financialAccount\n`);
  
  // 2. 检查交易记录
  const transactionsSnapshot = await getDocs(collection(db, 'fin_transactions'));
  
  let linked = 0;
  let unlinked = 0;
  const linkedTransactions = [];
  const unlinkedTransactions = [];
  const linkedByEvent = new Map();
  
  transactionsSnapshot.forEach(doc => {
    const txn = doc.data();
    const relatedEventId = txn.relatedEventId;
    
    if (relatedEventId && financialAccounts.has(relatedEventId)) {
      linked++;
      const eventName = eventMap.get(relatedEventId);
      linkedByEvent.set(eventName, (linkedByEvent.get(eventName) || 0) + 1);
      
      if (linkedTransactions.length < 10) {
        linkedTransactions.push({ name: eventName, description: txn.mainDescription, amount: txn.amount });
      }
    } else if (!relatedEventId) {
      unlinked++;
      if (unlinkedTransactions.length < 10) {
        unlinkedTransactions.push({ description: txn.mainDescription, amount: txn.amount });
      }
    }
  });
  
  // 打印统计
  console.log('📊 Statistics:');
  console.log(`  ✅ Linked to events: ${linked}`);
  console.log(`  ❌ Not linked: ${unlinked}`);
  console.log(`  📈 Link rate: ${((linked / transactionsSnapshot.size) * 100).toFixed(1)}%\n`);
  
  // 打印按活动分组的统计
  console.log('📋 Top 10 events by transaction count:');
  const sortedEvents = Array.from(linkedByEvent.entries()).sort((a, b) => b[1] - a[1]);
  sortedEvents.slice(0, 10).forEach(([eventName, count]) => {
    console.log(`  ${count.toString().padStart(3)} transactions - ${eventName}`);
  });
  
  console.log('\n📋 Sample linked transactions:');
  linkedTransactions.slice(0, 5).forEach((txn, i) => {
    console.log(`  ${i+1}. [${txn.name}] ${txn.description} - RM ${txn.amount}`);
  });
  
  console.log('\n📋 Sample unlinked transactions:');
  unlinkedTransactions.slice(0, 5).forEach((txn, i) => {
    console.log(`  ${i+1}. ${txn.description} - RM ${txn.amount}`);
  });
  
  console.log('\n✅ Check complete');
})();
```

### 步骤3: 查看结果

控制台会显示:
- 总的关联率
- 按活动分组的交易数量
- 已关联和未关联的交易样本

---

## 🔧 修复未关联的交易

### 方法1: 使用界面批量关联（推荐）

1. 打开"交易管理"页面
2. 选择未关联的交易（可以搜索相关关键词）
3. 点击"批量设置类别"
4. 选择"活动财务" → 选择对应的活动
5. 确认

**系统现在会自动设置根级别的 `relatedEventId`** ✅

### 方法2: 手动在Firestore中设置

如果需要手动设置少量交易：

1. 打开 Firebase Console
2. 进入 `fin_transactions` 集合
3. 找到要关联的交易
4. 添加 `relatedEventId` 字段
5. 设置为对应活动的 `financialAccount` 值

---

## 📊 预期结果

### 检查 Hope for Nature 6.0

运行上述代码后，应该能看到：
```
📋 Top 10 events by transaction count:
    10 transactions - Hope for Nature 6.0
  ...
```

### 检查其他活动

如果其他活动显示 0 transactions，说明：
- 要么没有相关交易记录
- 要么交易记录的 relatedEventId 未设置

**解决方案**: 使用"批量设置类别"功能为这些活动的交易设置 `relatedEventId`

---

**提示**: 修复批量设置类别的代码后，现在使用该功能会自动设置 `relatedEventId`。只需在界面上操作即可！
