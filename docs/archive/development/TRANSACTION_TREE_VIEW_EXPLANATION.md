# 交易管理页面树形视图标签页详细说明

## 🌳 概述

交易管理页面的树形视图标签页是一个强大的财务数据分析工具，以层级结构展示所有交易数据，提供全面的财务概览和详细分析。

---

## 🎯 主要功能

### 1. 视图切换
- **表格视图**：传统的交易记录列表视图
- **树形视图**：层级化的财务数据分析视图

### 2. 数据组织方式
树形视图按以下层级组织交易数据：

```
📊 财务概览
├── 💰 收入 (Income)
│   ├── 🎪 活动财务 (Event Finance)
│   │   ├── 👤 负责理事分组
│   │   │   ├── 📅 具体活动1 (净收入: RM XXX)
│   │   │   └── 📅 具体活动2 (净收入: RM XXX)
│   │   └── 👤 其他负责理事...
│   ├── 👥 会员费用 (Member Fees)
│   │   ├── 📅 2025年新会员费
│   │   ├── 📅 2025年续会费
│   │   └── 📅 其他会员费类别...
│   └── 🏢 日常账户 (General Accounts)
│       ├── 💼 Cukai
│       ├── 💼 Secretariat Management Fees
│       └── 💼 其他日常账户...
└── 💸 支出 (Expense)
    └── 🏢 日常账户 (General Accounts)
        ├── 💼 Indah Water
        ├── 💼 TNB
        └── 💼 其他支出类别...
```

---

## 📊 核心特性

### 1. 日期范围筛选

#### 筛选选项
- **全部**：显示所有交易数据
- **财年 (10月-9月)**：按财政年度筛选
- **自然年 (1月-12月)**：按日历年度筛选

#### 年份选择
- 支持选择过去10年的数据
- 财年格式：`FY2025` (2025-10-01 至 2026-09-30)
- 自然年格式：`2025年` (2025-01-01 至 2025-12-31)

### 2. 统计数据概览

#### 三个关键指标
- **Total Incomes**：总收入 (绿色显示)
- **Total Expenses**：总支出 (红色显示)  
- **Surplus/Deficit**：盈余/赤字 (蓝色/红色显示)

#### 实时计算
- 基于当前筛选条件实时计算
- 排除已拆分的父交易，避免重复计算
- 支持年度对比分析

### 3. 层级化数据展示

#### 第一层：收入/支出分类
- **收入**：包含所有收入类别的交易
- **支出**：包含所有支出类别的交易

#### 第二层：主要类别
- **活动财务**：按负责理事分组
- **会员费用**：按年份和类型分组
- **日常账户**：按具体用途分组

#### 第三层：细分项目
- **活动财务**：具体活动名称和净收入
- **会员费用**：具体年份和类型
- **日常账户**：具体账户名称

#### 第四层：负责理事分组（仅活动财务）
- 按活动负责理事分组显示
- 显示每个理事负责的活动数量和净收入

---

## 🔍 特殊处理逻辑

### 1. 活动财务特殊处理

#### 按负责理事分组
```typescript
// 负责理事名称映射
const boardMemberNameMap: Record<string, string> = {
  'president': 'President（会长）',
  'vp-community': 'VP Community（社区发展）',
  'vp-membership': 'VP Membership（会员发展）',
  'vp-business': 'VP Business（商业发展）',
  'secretary': 'Secretary（秘书）',
  'treasurer': 'Treasurer（财政）',
  // ... 更多理事职位
};
```

#### 净收入计算
- 将活动的收入和支出合并计算净收入
- 符合审计报告要求
- 显示格式：`活动名称 (日期) 净收入: RM XXX`

### 2. 会员费用格式化

#### 年份+类型格式
- 新格式：`2025年新会员费`
- 旧格式：`official-member` → `官方会员`

#### 支持的类型
- 新会员费
- 续会费
- 校友会
- 拜访会员

### 3. 日常账户映射

#### 代码到名称的映射
```typescript
const generalAccountNameMap: Record<string, string> = {
  'TXGA-0001': 'Cukai',
  'TXGA-0002': 'Secretariat Management Fees',
  'TXGA-0003': 'Merchandise Pink Shirt',
  'TXGA-0004': 'Merchandise Blue Jacket',
  'TXGA-0005': 'FD Interest',
  'TXGA-0006': 'Incentive',
  'TXGA-0007': 'Internal Transfer',
  'TXGA-0008': 'Miscellaneous',
  'TXGA-0009': 'Indah Water',
  'TXGA-0010': 'TNB',
  'TXGA-0011': 'Professional Fees',
};
```

---

## 🎨 用户界面

### 1. 树形表格显示

#### 表格列配置
- **账户/项目名称**：层级化的名称显示，支持点击
- **2025 (RM)**：2025年的金额统计
- **2024 (RM)**：2024年的金额统计

#### 视觉层次
- 使用 `├──` 和 `└──` 符号表示层级关系
- 不同层级使用不同的缩进
- 颜色编码：正数绿色，负数红色

### 2. 交互功能

#### 点击功能
- 点击叶子节点可切换到表格视图查看详细记录
- 自动筛选显示相关交易记录
- 保持原有的搜索和筛选功能

#### 响应式设计
- 支持横向滚动
- 自适应不同屏幕尺寸
- 优化的移动端显示

---

## 📈 数据计算逻辑

### 1. 年度统计计算

```typescript
const calculateYearlyStats = (transactions: Transaction[]) => {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  
  const stats = {
    [currentYear]: { income: 0, expense: 0, net: 0 },
    [lastYear]: { income: 0, expense: 0, net: 0 }
  };
  
  transactions.forEach(transaction => {
    if (transaction.isSplit === true) return; // 跳过已拆分的父交易
    
    const transactionYear = new Date(transaction.transactionDate).getFullYear();
    const amount = transaction.amount || 0;
    
    if (transactionYear === currentYear || transactionYear === lastYear) {
      if (transaction.transactionType === 'income') {
        stats[transactionYear].income += amount;
        stats[transactionYear].net += amount;
      } else {
        stats[transactionYear].expense += amount;
        stats[transactionYear].net -= amount;
      }
    }
  });
  
  return stats;
};
```

### 2. 数据过滤逻辑

#### 排除已拆分父交易
- 避免重复计算拆分交易的金额
- 确保数据准确性

#### 按类别分组
- 自动识别交易类别
- 支持未分类交易的显示

#### 按负责理事分组（活动财务）
- 从活动数据中获取负责理事信息
- 按理事职位分组显示

---

## 🔧 技术实现

### 1. 数据加载

#### 全量数据加载
```typescript
const loadAllTransactionsForTreeView = async () => {
  const result = await getTransactions({
    page: 1,
    limit: 10000, // 加载大量数据用于树形视图
    search: undefined,
    bankAccountId: undefined,
    category: undefined,
    sortBy: 'transactionDate',
    sortOrder: 'desc',
    includeVirtual: false, // 不显示虚拟交易
  });
  
  return result.data;
};
```

#### 活动数据加载
```typescript
const eventsResult = await getEvents({ page: 1, limit: 10000 });
const eventsMap = new Map(eventsResult.data.map(event => [event.name, event]));
```

### 2. 数据构建

#### 树形表格数据构建
```typescript
interface TreeTableItem {
  key: string;
  name: string;
  level: number; via (0=主类别, 1=子类别, 2=具体项目)
  isLastChild: boolean;
  count: number;
  totalAmount: number;
  year2025: number;
  year2024: number;
  transactions: Transaction[];
  category?: string;
  txAccount?: string;
  boardMember?: string;
  eventName?: string;
}
```

### 3. 性能优化

#### 缓存机制
- 缓存全局交易列表
- 避免重复数据加载
- 智能更新机制

#### 懒加载
- 按需加载数据
- 分页处理大量数据
- 优化的渲染性能

---

## 📋 使用场景

### 1. 财务概览
- 快速了解整体财务状况
- 识别主要的收入来源和支出项目
- 监控年度财务趋势

### 2. 活动分析
- 分析各活动的财务表现
- 按负责理事查看活动财务
- 识别盈利和亏损的活动

### 3. 会员费用管理
- 按年份和类型查看会员费用
- 分析会员费用趋势
- 识别收入模式

### 4. 日常账户监控
- 监控日常运营支出
- 分析各项支出的占比
- 优化成本控制

---

## 🎯 优势特点

### 1. 数据完整性
- 显示所有交易数据（排除虚拟交易）
- 支持多种筛选条件
- 实时数据更新

### 2. 可视化效果
- 清晰的层级结构
- 直观的财务概览
- 易于理解的数据展示

### 3. 交互性
- 支持点击查看详细记录
- 灵活的视图切换
- 响应式设计

### 4. 审计友好
- 符合审计报告要求
- 净收入计算准确
- 数据可追溯

---

## 🔄 与其他功能的集成

### 1. 批量设置类别
- 支持从树形视图选择交易进行批量分类
- 保持数据一致性

### 2. 搜索功能
- 支持模糊搜索
- 与树形视图无缝集成

### 3. 导出功能
- 支持数据导出
- 保持层级结构

---

**功能状态**: ✅ **已完成**  
**适用场景**: 财务分析、审计报告、数据概览  
**更新日期**: 2025-01-22
