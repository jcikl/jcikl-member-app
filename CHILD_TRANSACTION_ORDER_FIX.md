# 🔧 子交易排序修复说明

## 问题描述
子交易没有紧跟在父交易下方显示，可能分散在列表的不同位置。

---

## ✅ 解决方案

### 新的排序逻辑

#### Step 1: 分离父子交易
```typescript
const parentTransactions = transactions.filter(t => !t.parentTransactionId);
const childTransactions = transactions.filter(t => t.parentTransactionId);
```

#### Step 2: 排序父交易
```typescript
// 按日期降序排序（最新在前）
parentTransactions.sort((a, b) => {
  return a.transactionDate < b.transactionDate ? 1 : -1;
});
```

#### Step 3: 关联子交易
```typescript
// 为每个父交易收集其子交易
const childMap = new Map<string, Transaction[]>();

childTransactions.forEach(child => {
  const parentId = child.parentTransactionId!;
  if (!childMap.has(parentId)) {
    childMap.set(parentId, []);
  }
  childMap.get(parentId)!.push(child);
});

// 子交易按创建时间排序
childMap.forEach(children => {
  children.sort((a, b) => a.createdAt > b.createdAt ? 1 : -1);
});
```

#### Step 4: 重新组合
```typescript
const sortedTransactions: Transaction[] = [];

parentTransactions.forEach(parent => {
  sortedTransactions.push(parent);              // 添加父交易
  const children = childMap.get(parent.id) || [];
  sortedTransactions.push(...children);         // 紧接着添加其所有子交易
});
```

---

## 📊 显示效果

### 修复前（错误）
```
19-Jul  父交易A [已拆分 3]  +1000
12-Jul  父交易B            -2200
09-Jul  父交易C            +350
...
[其他交易]
...
└─ 子交易A1 [子项]         300   ← 错误：远离父交易A
└─ 子交易A2 [子项]         500
└─ 子交易A3 [子项]         200
```

### 修复后（正确）✅
```
19-Jul  父交易A [已拆分 3]  +1000
  └─ 子交易A1 [子项]         300   ✅ 紧跟在父交易A下方
  └─ 子交易A2 [子项]         500   ✅
  └─ 子交易A3 [子项]         200   ✅
12-Jul  父交易B            -2200
09-Jul  父交易C            +350
```

---

## 🎯 排序规则总结

### 主排序
- 父交易按 **交易日期降序**（最新在前）

### 次排序
- 子交易按 **创建时间升序**（先创建的在前）

### 组织结构
```
父交易1 (最新)
  └─ 子交易1-1
  └─ 子交易1-2
  └─ 子交易1-3
父交易2
  └─ 子交易2-1
  └─ 子交易2-2
父交易3
  └─ 子交易3-1
父交易4 (无子交易)
...
```

---

## 🔍 验证方法

### 测试步骤
1. 创建一笔交易并拆分为3个子交易
2. 刷新页面
3. 在交易列表中查找该父交易
4. **验证**：子交易紧跟在父交易下方

### 预期结果
```
✅ 父交易显示
✅ 第1个子交易紧跟在父交易下方
✅ 第2个子交易紧跟在第1个子交易下方
✅ 第3个子交易紧跟在第2个子交易下方
✅ 下一个父交易在所有子交易之后
```

---

## 💡 技术细节

### 关键代码位置
- 文件：`src/modules/finance/services/transactionService.ts`
- 函数：`getTransactions()`
- 行数：约 574-614 行

### 核心逻辑
```typescript
// 1. 分离
parents = 父交易
children = 子交易

// 2. 排序父交易
parents.sort(by date desc)

// 3. 建立父子映射
childMap = { 父ID: [子1, 子2, ...] }

// 4. 组合
result = []
for parent in parents:
  result.push(parent)
  result.push(...childMap[parent.id])
```

---

## 🎨 视觉效果

### 层级显示
- **父交易**：正常显示
- **子交易**：
  - 前缀：`└─` 缩进符号
  - 字体：灰色斜体
  - 标签：`[子项]`

### 示例显示
```
01-Jan  银行转账收入 [已拆分 3]    +RM 1000.00  RM 51000
  └─ 会员费 - RM 300.00 [子项]     RM 300.00    -
  └─ 活动财务 - RM 500.00 [子项]   RM 500.00    -
  └─ 未分配金额 [子项] [未分配]     RM 200.00    -
31-Dec  活动收入                   +RM 500.00   RM 50000
```

---

## ⚠️ 注意事项

### 分页行为
- 父交易和其所有子交易作为一个组
- 分页时保持组的完整性
- 可能导致某些页面显示数量 > 设定值

### 示例
```
设置: 每页 20 条

实际显示:
  - 页面1: 23条（19个父交易 + 4个子交易）
  - 页面2: 21条（18个父交易 + 3个子交易）
  
原因: 保持父子交易组完整性
```

---

## 🚀 相关功能

- [交易拆分功能](./TRANSACTION_SPLIT_FEATURE.md)
- [子交易显示指南](./CHILD_TRANSACTION_DISPLAY_GUIDE.md)
- [完整功能指南](./TRANSACTION_MANAGEMENT_COMPLETE_GUIDE.md)

---

**修复完成时间**: 2025-01-16  
**状态**: ✅ 已修复并测试

