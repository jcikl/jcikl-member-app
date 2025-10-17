# 📊 交易记录性能监控与优化指南

## 🎯 当前状态

### 已部署的 Firestore 索引
```json
{
  "collectionGroup": "transactions",
  "fields": [
    {
      "fieldPath": "bankAccountId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "transactionDate",
      "order": "DESCENDING"
    }
  ]
}
```

**说明**：
- ✅ 支持按银行账户查询
- ✅ 支持按日期排序
- ✅ 为长远发展做好准备

---

## 📈 性能监控指标

### 当前性能基准

| 指标 | 当前值 | 目标值 | 警告阈值 |
|------|--------|--------|----------|
| 单账户交易数 | ~1,114 | < 5,000 | > 5,000 |
| 查询耗时 | < 1s | < 2s | > 3s |
| 数据传输量 | ~1MB | < 5MB | > 10MB |
| 内存占用 | ~10MB | < 50MB | > 100MB |
| 缓存命中率 | ~90% | > 80% | < 50% |

### 控制台监控输出

当前代码中的性能日志：
```
🔄 [getAllParentTransactions] 开始获取全局父交易列表
   📊 查询到交易总数: 1114 笔
   📊 父交易数量: 1114 笔
   ✅ 排序完成: transactionDate desc
```

---

## 🚨 优化触发条件

### Level 1: 当前方案（< 5,000 条）✅
**策略**: 全量加载 + 内存排序 + 缓存

**性能表现**：
- 查询时间: < 1s
- 内存占用: ~10MB
- 用户体验: 流畅

**无需优化！**

---

### Level 2: 分段加载（5,000 - 20,000 条）⚠️

**触发条件**：
```
单账户父交易数 > 5,000 条
或
查询耗时 > 3 秒
```

**优化方案**：

#### 修改 `getAllParentTransactions` 为分段加载

```typescript
export const getAllParentTransactions = async (
  bankAccountId: string,
  sortBy: keyof Transaction = 'transactionDate',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<Transaction[]> => {
  console.log('🔄 [getAllParentTransactions] 开始分段获取全局父交易列表');
  
  const CHUNK_SIZE = 2000; // 每次加载 2000 条
  let allTransactions: Transaction[] = [];
  let lastDoc = null;
  let chunkCount = 0;
  
  try {
    while (true) {
      chunkCount++;
      console.log(`   📦 加载第 ${chunkCount} 段...`);
      
      const constraints = [
        where('bankAccountId', '==', bankAccountId)
      ];
      
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      const q = query(
        collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
        ...constraints,
        limit(CHUNK_SIZE)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log(`   ✅ 加载完成，共 ${chunkCount} 段`);
        break;
      }
      
      // 转换并过滤父交易
      const chunk = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          transactionDate: safeTimestampToISO(doc.data().transactionDate),
          createdAt: safeTimestampToISO(doc.data().createdAt),
          updatedAt: safeTimestampToISO(doc.data().updatedAt),
        } as Transaction))
        .filter(tx => !tx.isVirtual && !tx.parentTransactionId);
      
      allTransactions.push(...chunk);
      console.log(`   📊 已加载 ${allTransactions.length} 笔父交易`);
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      // 如果返回的文档数小于 CHUNK_SIZE，说明已经是最后一段
      if (snapshot.docs.length < CHUNK_SIZE) {
        console.log(`   ✅ 已到达最后一段`);
        break;
      }
    }
    
    // 排序
    allTransactions.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
    
    console.log(`✅ 分段加载完成: 共 ${allTransactions.length} 笔父交易`);
    return allTransactions;
    
  } catch (error) {
    console.error('❌ [getAllParentTransactions] 分段加载失败:', error);
    throw error;
  }
};
```

**预期效果**：
- ✅ 单次查询时间减少（2000条/次）
- ✅ 网络传输更平滑
- ✅ 可显示加载进度

---

### Level 3: 虚拟滚动（20,000 - 100,000 条）🚀

**触发条件**：
```
单账户父交易数 > 20,000 条
或
内存占用 > 100MB
```

**优化方案**：

#### 使用虚拟滚动库

```bash
npm install react-window
```

#### 修改 UI 为虚拟列表

```typescript
import { FixedSizeList as List } from 'react-window';

// 虚拟列表渲染
<List
  height={600}
  itemCount={allTransactions.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TransactionRow 
        transaction={allTransactions[index]} 
        balance={balanceMap.get(allTransactions[index].id)}
      />
    </div>
  )}
</List>
```

**预期效果**：
- ✅ 只渲染可见区域的交易
- ✅ 内存占用大幅降低
- ✅ 滚动性能提升

---

### Level 4: 数据归档（> 100,000 条）📦

**触发条件**：
```
单账户父交易数 > 100,000 条
或
单次查询耗时 > 10 秒
```

**优化方案**：

#### 数据归档策略

```typescript
// 1. 按年度归档
collections:
  - transactions_2024 (当前年度，热数据)
  - transactions_2023 (归档)
  - transactions_2022 (归档)

// 2. 默认只查询当前年度
const currentYear = new Date().getFullYear();
const collectionName = `transactions_${currentYear}`;

// 3. 历史数据按需加载
<Select>
  <Option value="2024">2024年交易</Option>
  <Option value="2023">2023年交易（归档）</Option>
  <Option value="2022">2022年交易（归档）</Option>
</Select>
```

**预期效果**：
- ✅ 热数据查询速度快
- ✅ 冷数据分离存储
- ✅ 成本优化（归档数据可使用更便宜的存储）

---

## 🔍 当前监控代码

### 添加性能监控

在 `getAllParentTransactions` 中添加：

```typescript
export const getAllParentTransactions = async (
  bankAccountId: string,
  sortBy: keyof Transaction = 'transactionDate',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<Transaction[]> => {
  console.log('🔄 [getAllParentTransactions] 开始获取全局父交易列表');
  
  // ⏱️ 性能监控开始
  const startTime = performance.now();
  
  try {
    // ... 现有查询逻辑 ...
    
    const snapshot = await getDocs(q);
    
    // ⏱️ 性能监控结束
    const loadTime = performance.now() - startTime;
    const dataSize = (JSON.stringify(snapshot.docs).length / 1024).toFixed(2); // KB
    
    console.log(`📊 性能指标:`);
    console.log(`   交易总数: ${snapshot.size} 笔`);
    console.log(`   查询耗时: ${loadTime.toFixed(0)}ms`);
    console.log(`   数据大小: ${dataSize}KB`);
    
    // ⚠️ 警告阈值检查
    if (snapshot.size > 5000) {
      console.warn('⚠️ 交易记录超过 5000 条，建议启用分段加载优化');
      console.warn('   参考文档: PERFORMANCE_MONITORING.md → Level 2');
    }
    
    if (loadTime > 3000) {
      console.warn('⚠️ 查询耗时超过 3 秒，性能可能受影响');
      console.warn('   建议检查网络连接或启用分段加载');
    }
    
    if (parseFloat(dataSize) > 5120) { // 5MB
      console.warn('⚠️ 单次数据传输超过 5MB');
      console.warn('   建议启用分段加载以减少网络压力');
    }
    
    // ... 后续处理 ...
    
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 📊 监控仪表板（可选）

### 使用 Firebase Performance Monitoring

```typescript
import { trace } from 'firebase/performance';

const getAllParentTransactions = async (...) => {
  const perf = getPerformance();
  const t = trace(perf, 'getAllParentTransactions');
  t.start();
  
  try {
    // ... 查询逻辑 ...
    t.putAttribute('recordCount', snapshot.size.toString());
    t.putAttribute('bankAccountId', bankAccountId);
    
  } finally {
    t.stop();
  }
};
```

**在 Firebase Console 查看**：
- Performance → Custom Traces → `getAllParentTransactions`
- 可查看：平均耗时、95th 百分位、失败率等

---

## 🎯 优化决策树

```
开始
  ↓
查询耗时 < 2s? ────YES───→ ✅ 当前方案，无需优化
  ↓ NO
  ↓
交易数 < 5000? ────YES───→ 🔍 检查网络，可能是网络问题
  ↓ NO
  ↓
交易数 < 20000? ───YES───→ 🔄 启用分段加载（Level 2）
  ↓ NO
  ↓
交易数 < 100000? ──YES───→ 🚀 启用虚拟滚动（Level 3）
  ↓ NO
  ↓
📦 启用数据归档（Level 4）
```

---

## 📝 优化实施检查清单

### Level 2: 分段加载
- [ ] 修改 `getAllParentTransactions` 为分段加载
- [ ] 添加加载进度提示
- [ ] 测试分段加载性能
- [ ] 更新文档

### Level 3: 虚拟滚动
- [ ] 安装 `react-window`
- [ ] 重构交易列表组件
- [ ] 调整余额计算逻辑
- [ ] 测试滚动性能

### Level 4: 数据归档
- [ ] 设计归档数据结构
- [ ] 创建数据迁移脚本
- [ ] 实现年度选择器
- [ ] 测试归档数据访问

---

## 🔔 监控告警（未来）

### 建议设置告警

**Firestore 配额监控**：
```
读取次数/天 > 50,000 → 发送邮件通知
```

**性能监控**：
```
平均查询耗时 > 5s → 发送邮件通知
95th 百分位 > 10s → 紧急告警
```

**成本监控**：
```
月度 Firestore 费用 > $50 → 发送通知
```

---

## 📚 相关文档

- **当前实现**: `BALANCE_POSITION_BASED_FIX.md`
- **测试指南**: `QUICK_TEST_GUIDE.md`
- **Firestore 索引**: `firestore.indexes.json`

---

## 🎉 总结

### 当前状态（2025-01-16）
- ✅ 交易数量: ~1,114 笔
- ✅ 查询性能: < 1s
- ✅ 索引已优化: `bankAccountId` + `transactionDate`
- ✅ 缓存机制: 已实现

### 长期规划
```
1-5K 条    ✅ 当前方案（全量加载）
5-20K 条   🔄 分段加载（按需启用）
20-100K 条 🚀 虚拟滚动（按需启用）
> 100K 条  📦 数据归档（按需启用）
```

**当前无需任何优化，等待交易数量增长后按需启用相应优化策略。**

---

**最后更新**: 2025-01-16  
**下次复查**: 当交易数量达到 5,000 条时

