# 树形视图动态年份显示功能

## 🎯 修改概述

修改了交易管理页面的树形视图标签页，使其能够根据当前筛选的年份动态显示统计，而不是固定的2025和2024年。

## 🔧 技术实现

### 1. 接口修改

#### TreeTableItem接口更新
```typescript
interface TreeTableItem {
  key: string;
  name: string;
  level: number;
  isLastChild: boolean;
  count: number;
  totalAmount: number;
  currentYear: number; // 🆕 当前年份金额（替代year2025）
  pastYear: number;    // 🆕 过去年份金额（替代year2024）
  transactions: Transaction[];
  category?: string;
  txAccount?: string;
  boardMember?: string;
  eventName?: string;
}
```

### 2. 函数修改

#### calculateYearlyStats函数增强
```typescript
const calculateYearlyStats = (transactions: Transaction[], targetYear?: string) => {
  // 确定当前年份和过去年份
  const currentYear = targetYear ? parseInt(targetYear) : new Date().getFullYear();
  const pastYear = currentYear - 1;
  
  const stats = {
    [currentYear]: { income: 0, expense: 0, net: 0 },
    [pastYear]: { income: 0, expense: 0, net: 0 }
  };
  
  // ... 统计计算逻辑
};
```

#### buildTreeTableData函数增强
```typescript
const buildTreeTableData = (transactions: Transaction[], events: EventType[], targetYear?: string): TreeTableItem[] => {
  // 确定当前年份和过去年份
  const currentYear = targetYear ? parseInt(targetYear) : new Date().getFullYear();
  const pastYear = currentYear - 1;
  
  // ... 数据构建逻辑
};
```

### 3. UI组件修改

#### 树形表格列配置动态化
```typescript
const treeTableColumns: ColumnsType<TreeTableItem> = [
  {
    title: '账户/项目名称',
    dataIndex: 'name',
    key: 'name',
    align: 'left',
    // ... 渲染逻辑
  },
  {
    title: `${treeSelectedYear} (RM)`,        // 🆕 动态显示当前年份
    dataIndex: 'currentYear',
    key: 'currentYear',
    align: 'right',
    width: 120,
    // ... 渲染逻辑
  },
  {
    title: `${parseInt(treeSelectedYear) - 1} (RM)`, // 🆕 动态显示过去年份
    dataIndex: 'pastYear',
    key: 'pastYear',
    align: 'right',
    width: 120,
    // ... 渲染逻辑
  }
];
```

## 🎨 功能特性

### 1. 动态年份显示

#### 筛选年份为2023时
- 第一列：`2023 (RM)` - 显示2023年的统计
- 第二列：`2022 (RM)` - 显示2022年的统计

#### 筛选年份为2025时
- 第一列：`2025 (RM)` - 显示2025年的统计
- 第二列：`2024 (RM)` - 显示2024年的统计

### 2. 统计计算逻辑

#### 年份确定逻辑
```typescript
// 当前年份 = 筛选年份（如果指定）或当前系统年份
const currentYear = targetYear ? parseInt(targetYear) : new Date().getFullYear();

// 过去年份 = 当前年份 - 1
const pastYear = currentYear - 1;
```

#### 数据过滤逻辑
- 只统计当前年份和过去年份的交易数据
- 排除已拆分的父交易
- 按收入和支出类型分别计算

### 3. 数据传递链

#### 调用链
```
buildTreeData() 
  ↓
buildTreeTableData(transactions, events, treeSelectedYear)
  ↓
calculateYearlyStats(transactions, targetYear)
```

#### 参数传递
- `treeSelectedYear`: 用户选择的年份
- `targetYear`: 传递给统计函数的年份参数
- `currentYear`: 计算得出的当前年份
- `pastYear`: 计算得出的过去年份

## 📊 使用场景

### 1. 财年分析
- 选择财年筛选器
- 选择具体年份（如2023）
- 显示2023年和2022年的对比数据

### 2. 自然年分析
- 选择自然年筛选器
- 选择具体年份（如2024）
- 显示2024年和2023年的对比数据

### 3. 全部数据查看
- 选择"全部"筛选器
- 显示当前年份和过去年份的对比数据

## 🔍 调试信息

### 控制台日志
```typescript
console.log('🔍 [calculateYearlyStats] Calculating stats for:', {
  transactionsCount: transactions.length,
  currentYear,
  pastYear,
  targetYear,
  transactions: transactions.slice(0, 3)
});
```

### 数据验证
- 显示年份计算过程
- 显示统计计算结果
- 显示最终表格数据

## ✅ 修改完成

### 修改文件
- `src/modules/finance/pages/TransactionManagementPage/index.tsx`

### 修改内容
1. ✅ 更新`TreeTableItem`接口
2. ✅ 增强`calculateYearlyStats`函数
3. ✅ 增强`buildTreeTableData`函数
4. ✅ 动态化`treeTableColumns`配置
5. ✅ 更新所有统计计算调用
6. ✅ 修复编译错误

### 功能验证
- ✅ 年份显示动态化
- ✅ 统计计算正确
- ✅ 数据传递完整
- ✅ 编译无错误

## 🎯 效果展示

### 筛选2023年时
```
账户/项目名称         2023 (RM)    2022 (RM)
├── 收入              RM 1000.00   RM 800.00
├── 活动财务          RM 500.00    RM 400.00
└── 会员费用          RM 500.00    RM 400.00
```

### 筛选2025年时
```
账户/项目名称         2025 (RM)    2024 (RM)
├── 收入              RM 1200.00   RM 1000.00
├── 活动财务          RM 600.00    RM 500.00
└── 会员费用          RM 600.00    RM 500.00
```

---

**修改日期**: 2025-01-22  
**修改类型**: 功能增强  
**影响范围**: 树形视图标签页  
**测试状态**: ✅ 已完成
