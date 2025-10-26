# 审计报告要求 - 活动财务支出合并功能

## 🎯 需求背景

根据**审计报告要求**，需要将**活动财务的支出也合计在该活动的收入中**，以显示每个活动的**净收入**（收入 - 支出），符合财务审计的报表标准。

## 📊 实现逻辑

### 修改前（原逻辑）
```
收入 Incomes
├── 活动财务 (3) RM 90.00
│   ├── 2025 Money Matter (2) RM 60.00
│   └── 未分类 (1) RM 30.00

支出 Expenses  
├── 活动财务 (8) RM 3,463.27
│   ├── HOPE FOR NATURE 6.0 (3) RM 511.67
│   ├── 2024 JCIM NATCON (1) RM 50.00
│   └── 2024 JCI KL Mid Year Awards Dinner (4) RM 2,901.60
```

### 修改后（审计报告要求）
```
收入 Incomes (含活动净收入)
├── 活动财务 (11) RM -3,373.27
│   ├── 2025 Money Matter (2) 净收入: RM 60.00
│   │   (收入: RM 60.00 - 支出: RM 0.00)
│   ├── HOPE FOR NATURE 6.0 (3) 净收入: RM -511.67
│   │   (收入: RM 0.00 - 支出: RM 511.67)
│   ├── 2024 JCIM NATCON (1) 净收入: RM -50.00
│   │   (收入: RM 0.00 - 支出: RM 50.00)
│   └── 2024 JCI KL Mid Year Awards Dinner (4) 净收入: RM -2,901.60
│       (收入: RM 0.00 - 支出: RM 2,901.60)

支出 Expenses (不含活动支出)
├── 未分类 (4) RM 2,700.00
```

## 🔧 技术实现

### 1. 数据分组逻辑修改

```typescript
// 遍历交易记录并分组
realTransactions.forEach(transaction => {
  const category = transaction.category || 'uncategorized';
  const txAccount = transaction.txAccount || 'uncategorized';
  const isIncome = transaction.transactionType === 'income';

  if (isIncome) {
    // 收入：所有收入交易
    if (!incomeGroups[category]) incomeGroups[category] = {};
    if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
    incomeGroups[category][txAccount].push(transaction);
  } else {
    // 支出：只有非活动财务的支出交易
    if (category === 'event-finance') {
      // 活动财务支出：合并到对应的活动收入中
      if (!incomeGroups[category]) incomeGroups[category] = {};
      if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
      incomeGroups[category][txAccount].push(transaction);
    } else {
      // 其他类别支出：正常归类到支出
      if (!expenseGroups[category]) expenseGroups[category] = {};
      if (!expenseGroups[category][txAccount]) expenseGroups[category][txAccount] = [];
      expenseGroups[category][txAccount].push(transaction);
    }
  }
});
```

### 2. 净收入计算逻辑

```typescript
if (category === 'event-finance') {
  // 活动财务：分别计算收入和支出，然后计算净收入
  Object.values(subGroups).flat().forEach(transaction => {
    categoryCount++;
    if (transaction.transactionType === 'income') {
      categoryTotal += transaction.amount || 0;  // 收入为正数
    } else {
      categoryTotal -= transaction.amount || 0;  // 支出为负数（减少净收入）
    }
  });
}
```

### 3. 活动财务显示格式

```typescript
// 对于活动财务，分别显示收入和支出
const incomeItems = items.filter(t => t.transactionType === 'income');
const expenseItems = items.filter(t => t.transactionType === 'expense');

const incomeTotal = incomeItems.reduce((sum, t) => sum + (t.amount || 0), 0);
const expenseTotal = expenseItems.reduce((sum, t) => sum + (t.amount || 0), 0);
const netTotal = incomeTotal - expenseTotal;

// 显示格式
title: (
  <span>
    活动名称
    <Text type="secondary">
      ({items.length}) 净收入: RM {netTotal.toFixed(2)}
    </Text>
    <Text type="secondary" style={{ fontSize: 10 }}>
      (收入: RM {incomeTotal.toFixed(2)} - 支出: RM {expenseTotal.toFixed(2)})
    </Text>
  </span>
)
```

## 📋 显示效果

### 活动财务节点显示
```
活动财务 (11) RM -3,373.27
├── 2025 Money Matter (2) 净收入: RM 60.00
│   (收入: RM 60.00 - 支出: RM 0.00)
├── HOPE FOR NATURE 6.0 (3) 净收入: RM -511.67
│   (收入: RM 0.00 - 支出: RM 511.67)
└── 2024 JCI KL Mid Year Awards Dinner (4) 净收入: RM -2,901.60
    (收入: RM 0.00 - 支出: RM 2,901.60)
```

### 净亏损标识
```typescript
{category === 'event-finance' && categoryTotal < 0 && (
  <Text type="danger" style={{ marginLeft: 8, fontSize: 12 }}>
    (净亏损)
  </Text>
)}
```

## 🎨 UI变化

### 标题更新
```typescript
// 收入节点标题
title: "收入 Incomes (含活动净收入)"

// 支出节点标题  
title: "支出 Expenses (不含活动支出)"
```

### 说明文档更新
```typescript
description: "交易按收入/支出 → 类别 → 二次分类层级组织。根据审计报告要求，活动财务的支出已合并到收入中显示净收入。点击叶子节点可切换到表格视图查看详细记录。"
```

## 📊 审计报告优势

### 1. 符合审计标准
- ✅ 活动收支合并显示，符合审计报告要求
- ✅ 清晰显示每个活动的净收入/净亏损
- ✅ 便于审计师快速了解活动财务状况

### 2. 财务分析便利
- ✅ 一目了然看到活动的盈利能力
- ✅ 净亏损活动会特别标识
- ✅ 收入和支出明细分别显示

### 3. 数据完整性
- ✅ 所有活动财务交易都在收入树中显示
- ✅ 非活动支出仍在支出树中显示
- ✅ 点击节点可查看所有相关交易详情

## 🔍 示例场景

### 场景1: 盈利活动
```
2025 Money Matter
├── 收入: RM 60.00 (2笔交易)
├── 支出: RM 0.00 (0笔交易)
└── 净收入: RM 60.00 ✅ 盈利
```

### 场景2: 亏损活动
```
HOPE FOR NATURE 6.0
├── 收入: RM 0.00 (0笔交易)
├── 支出: RM 511.67 (3笔交易)
└── 净收入: RM -511.67 ❌ 净亏损
```

### 场景3: 收支平衡活动
```
某活动
├── 收入: RM 1,000.00 (5笔交易)
├── 支出: RM 1,000.00 (3笔交易)
└── 净收入: RM 0.00 ⚖️ 收支平衡
```

## ⚠️ 注意事项

### 1. 数据准确性
- 确保所有活动财务交易都有正确的`category: 'event-finance'`
- 确保`txAccount`字段正确标识活动名称

### 2. 显示逻辑
- 只有活动财务的支出会合并到收入中
- 其他类别（会员费用、日常账户）的支出仍在支出树中
- 活动财务的净收入可能为负数（净亏损）

### 3. 审计合规
- 这种显示方式符合审计报告要求
- 便于审计师快速了解每个活动的财务状况
- 提供完整的收入和支出明细

## 🚀 未来扩展

### 1. 审计报告导出
- 可以添加"导出审计报告"功能
- 按活动生成详细的收支报表

### 2. 活动盈利分析
- 添加活动盈利能力分析图表
- 显示盈利/亏损活动的分布

### 3. 预算对比
- 如果有活动预算数据，可以对比实际收支与预算

## 📚 相关文件

- **主文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`
- **树形视图文档**: `TRANSACTION_TREE_VIEW_FEATURE.md`
- **日期范围筛选**: `TREE_VIEW_DATE_RANGE_FILTER.md`

## 总结

✅ **已实现**:
- 活动财务支出合并到收入中
- 净收入计算和显示
- 净亏损标识
- 详细的收支明细显示
- 符合审计报告要求

🎉 **审计价值**:
- 符合财务审计标准
- 清晰显示活动盈利能力
- 便于审计师审查
- 提供完整的财务数据视图

---

**实现日期**: 2025-01-22
**审计要求**: 活动财务支出合并显示
**状态**: ✅ 已完成
