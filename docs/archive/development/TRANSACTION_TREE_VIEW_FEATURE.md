# 交易管理页面 - 树形视图功能

## 🎯 功能概述

为交易管理页面添加了**树形视图**标签页，用户可以在**表格视图**和**树形视图**之间切换，提供更直观的交易数据层级展示。

## 📍 实现位置

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`

## 🆕 新增功能

### 1. 视图模式切换
- **表格视图**: 原有的详细交易记录表格（默认视图）
- **树形视图**: 按收入/支出 → 类别 → 二次分类的层级结构展示

### 2. 树形视图结构

```
📁 收入 Incomes (绿色)
│
├── 📂 会员费用 (15) RM 7200.00
│   ├── 📄 official-member (10) RM 4800.00  [可点击]
│   ├── 📄 associate-member (4) RM 2000.00  [可点击]
│   └── 📄 未分类 (1) RM 400.00             [可点击]
│
├── 📂 活动财务 (8) RM 5000.00
│   ├── 📄 春节晚会 (3) RM 2000.00          [可点击]
│   ├── 📄 年会 (3) RM 2500.00              [可点击]
│   └── 📄 慈善晚宴 (2) RM 500.00           [可点击]
│
├── 📂 日常账户 (12) RM 3500.00
│   ├── 📄 捐赠 (5) RM 2000.00              [可点击]
│   ├── 📄 赞助 (4) RM 1000.00              [可点击]
│   └── 📄 其他收入 (3) RM 500.00           [可点击]
│
└── 📂 未分类 (2) RM 600.00
    └── 📄 uncategorized (2) RM 600.00      [可点击]

📁 支出 Expenses (红色)
│
├── 📂 活动财务 (5) RM 2000.00
│   ├── 📄 春节晚会 (3) RM 1500.00          [可点击]
│   └── 📄 年会 (2) RM 500.00               [可点击]
│
├── 📂 日常账户 (20) RM 8500.00
│   ├── 📄 水电费 (5) RM 500.00             [可点击]
│   ├── 📄 租金 (3) RM 6000.00              [可点击]
│   ├── 📄 办公用品 (7) RM 1500.00          [可点击]
│   └── 📄 交通费 (5) RM 500.00             [可点击]
│
└── 📂 未分类 (3) RM 300.00
    └── 📄 uncategorized (3) RM 300.00      [可点击]
```

## 🔧 技术实现

### 新增状态变量

```typescript
const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
const [treeData, setTreeData] = useState<DataNode[]>([]);
const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
```

### 新增导入

```typescript
import { Tree, Alert, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { TableOutlined, ApartmentOutlined } from '@ant-design/icons';
```

### 核心函数

#### 1. buildTreeData()
**功能**: 构建树形数据结构

```typescript
const buildTreeData = () => {
  // 过滤虚拟子交易
  const realTransactions = transactions.filter(t => !t.isVirtual);
  
  // 创建根节点
  const incomeNode: DataNode = {
    title: <span style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
      收入 Incomes
    </span>,
    key: 'income-root',
    children: [],
  };
  
  const expenseNode: DataNode = { ... };
  
  // 分组数据
  const incomeGroups: Record<string, Record<string, Transaction[]>> = {};
  const expenseGroups: Record<string, Record<string, Transaction[]>> = {};
  
  // 遍历交易并分组
  realTransactions.forEach(transaction => {
    const category = transaction.category || 'uncategorized';
    const txAccount = transaction.txAccount || 'uncategorized';
    const isIncome = transaction.transactionType === 'income';
    
    if (isIncome) {
      if (!incomeGroups[category]) incomeGroups[category] = {};
      if (!incomeGroups[category][txAccount]) incomeGroups[category][txAccount] = [];
      incomeGroups[category][txAccount].push(transaction);
    } else {
      // 支出分组逻辑
    }
  });
  
  // 构建树节点（收入和支出）
  // 计算每层的金额汇总
  // 设置默认展开所有节点
};
```

**分组逻辑**:
- **第一层**: 收入 vs 支出（基于 `transactionType`）
- **第二层**: 类别（`category`: member-fees, event-finance, general-accounts, uncategorized）
- **第三层**: 二次分类（`txAccount`: 具体的会员类别、活动名称、交易用途等）

#### 2. handleTreeNodeClick(items: Transaction[])
**功能**: 处理树节点点击事件

```typescript
const handleTreeNodeClick = (items: Transaction[]) => {
  setViewMode('table');              // 切换回表格视图
  setFilteredTransactions(items);    // 筛选显示点击的交易
};
```

**用户体验**:
```
用户点击树节点"春节晚会 (3) RM 2000.00"
    ↓
自动切换到表格视图
    ↓
表格只显示这3条春节晚会相关的交易
    ↓
用户可以进行编辑、拆分等操作
```

#### 3. useEffect监听
**功能**: 当交易数据变化时自动重建树

```typescript
useEffect(() => {
  if (transactions.length > 0) {
    buildTreeData();
  }
}, [transactions]);
```

## 🎨 UI布局

### 顶层标签页（新增）
```tsx
<Tabs
  activeKey={viewMode}
  onChange={(key) => {
    setViewMode(key as 'table' | 'tree');
    if (key === 'table') {
      setFilteredTransactions([]); // 切回表格时清空筛选
    }
  }}
  items={[
    {
      key: 'table',
      label: <span><TableOutlined /> 表格视图</span>,
      children: <原有的表格界面>
    },
    {
      key: 'tree',
      label: <span><ApartmentOutlined /> 树形视图</span>,
      children: <树形界面>
    }
  ]}
/>
```

### 表格视图（原有功能保留）
- 银行账户标签页
- 筛选器（搜索、类别、未分类快筛）
- 交易记录表格
- 批量操作栏

### 树形视图（新增）
- 提示信息（Alert组件）
- 树形组件（Tree组件）
- 默认展开所有节点
- 叶子节点可点击

## 📊 数据流

```
loadTransactions()
    ↓
setTransactions(data)
    ↓
【触发useEffect】
    ↓
buildTreeData()
    ↓
遍历transactions：
  - 过滤虚拟子交易（isVirtual）
  - 按transactionType分为收入/支出
  - 按category二次分组
  - 按txAccount三次分组
    ↓
构建树节点：
  - 第一层：收入根节点、支出根节点
  - 第二层：类别节点（显示数量和金额汇总）
  - 第三层：二次分类叶子节点（显示数量和金额小计）
    ↓
setTreeData([incomeNode, expenseNode])
    ↓
setExpandedKeys(allKeys) - 默认全部展开
    ↓
Tree组件渲染
```

## 🔄 交互流程

### 场景1: 查看树形视图
```
用户打开交易管理页面
    ↓
默认显示表格视图
    ↓
用户点击"树形视图"标签
    ↓
显示树形结构（自动展开所有节点）
    ↓
用户可以查看收入和支出的层级结构
```

### 场景2: 从树形视图筛选交易
```
用户在树形视图
    ↓
点击叶子节点（如"春节晚会 (3) RM 2000.00"）
    ↓
handleTreeNodeClick触发
    ↓
自动切换到表格视图
    ↓
setFilteredTransactions(items) - 只显示这3条交易
    ↓
用户可以查看详情、编辑、拆分等操作
    ↓
用户切换回树形视图
    ↓
筛选自动清空（setFilteredTransactions([])）
    ↓
表格恢复显示所有交易
```

## 🎯 类别名称映射

```typescript
const categoryNameMap: Record<string, string> = {
  'member-fees': '会员费用',
  'event-finance': '活动财务',
  'general-accounts': '日常账户',
  'uncategorized': '未分类',
};
```

## 🌲 树节点Key规则

```typescript
// 根节点
'income-root'           // 收入根节点
'expense-root'          // 支出根节点

// 类别节点（第二层）
'income-member-fees'          // 收入 → 会员费用
'income-event-finance'        // 收入 → 活动财务
'income-general-accounts'     // 收入 → 日常账户
'expense-general-accounts'    // 支出 → 日常账户
'expense-event-finance'       // 支出 → 活动财务

// 叶子节点（第三层）
'income-member-fees-official-member'     // 收入 → 会员费用 → 官方会员
'income-event-finance-春节晚会'           // 收入 → 活动财务 → 春节晚会
'expense-general-accounts-水电费'        // 支出 → 日常账户 → 水电费
```

## 💡 特殊处理

### 1. 过滤虚拟交易
```typescript
const realTransactions = transactions.filter(t => !t.isVirtual);
```
**原因**: 虚拟子交易不应该在树形视图中显示，避免重复计算金额

### 2. 处理未分类交易
```typescript
const category = transaction.category || 'uncategorized';
const txAccount = transaction.txAccount || 'uncategorized';
```
**显示**: 未分类的交易会显示为"未分类"节点

### 3. 金额汇总
```typescript
// 类别级别汇总
const categoryTotal = Object.values(subGroups)
  .flat()
  .reduce((sum, t) => sum + (t.amount || 0), 0);

// 二次分类级别汇总
const subTotal = items.reduce((sum, t) => sum + (t.amount || 0), 0);
```

### 4. 默认展开
```typescript
const allKeys: React.Key[] = ['income-root', 'expense-root'];

incomeNode.children?.forEach(categoryNode => {
  allKeys.push(categoryNode.key!);
});

expenseNode.children?.forEach(categoryNode => {
  allKeys.push(categoryNode.key!);
});

setExpandedKeys(allKeys);
```
**原因**: 提供更好的用户体验，无需逐层点击展开

## 🎨 视觉设计

### 颜色系统
| 元素 | 颜色 | 说明 |
|------|------|------|
| 收入根节点 | `#52c41a` (绿色) | 积极、增长 |
| 支出根节点 | `#ff4d4f` (红色) | 警示、减少 |
| 次级文本 | `type="secondary"` | 灰色，降低视觉权重 |

### 字体大小
- **根节点**: `fontSize: 16, fontWeight: 600`
- **类别节点**: 默认大小
- **次级信息**: `fontSize: 12`
- **树整体**: `fontSize: 14`

### 节点显示格式
```tsx
// 第一层（根节点）
<span style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>
  收入 Incomes
</span>

// 第二层（类别节点）
<span>
  会员费用
  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
    (15) RM 7200.00
  </Text>
</span>

// 第三层（叶子节点 - 可点击）
<span onClick={() => handleTreeNodeClick(items)} style={{ cursor: 'pointer' }}>
  official-member
  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
    (10) RM 4800.00
  </Text>
</span>
```

## 📝 用户提示

在树形视图顶部显示Alert组件：

```tsx
<Alert
  message="树形视图说明"
  description="交易按收入/支出 → 类别 → 二次分类层级组织。点击叶子节点可切换到表格视图查看详细记录。"
  type="info"
  showIcon
  style={{ marginBottom: 24 }}
/>
```

## ✨ 功能亮点

### 1. 双向导航
- **树形 → 表格**: 点击叶子节点切换到表格并筛选
- **表格 → 树形**: 切换标签页查看层级结构

### 2. 智能筛选
- 点击树节点后，表格自动筛选对应的交易记录
- 切回树形视图时自动清空筛选，表格恢复正常

### 3. 实时汇总
- 每个类别节点显示该类别的交易数量和金额总计
- 每个叶子节点显示该分类的交易数量和金额小计

### 4. 层级清晰
- 三层树形结构：收入/支出 → 类别 → 二次分类
- 默认展开所有节点，一目了然

### 5. 视觉直观
- 收入用绿色，支出用红色
- 显示连接线，展示层级关系
- 数量和金额实时显示

## 🔍 使用场景

### 场景1: 快速了解收支结构
```
财务主管想了解本月的收支分布
    ↓
切换到树形视图
    ↓
看到收入：
  - 会员费用 (15) RM 7200.00
  - 活动财务 (8) RM 5000.00
  - 日常账户 (12) RM 3500.00
    ↓
看到支出：
  - 活动财务 (5) RM 2000.00
  - 日常账户 (20) RM 8500.00
    ↓
快速了解收支结构和金额分布
```

### 场景2: 查找特定分类的交易
```
用户想查看所有"春节晚会"相关的交易
    ↓
切换到树形视图
    ↓
展开"收入 → 活动财务"
    ↓
找到"春节晚会 (3) RM 2000.00"
    ↓
点击该节点
    ↓
自动切换到表格视图，只显示3条春节晚会收入记录
    ↓
用户可以查看详情、编辑、导出等
```

### 场景3: 审查未分类交易
```
财务人员想处理所有未分类的交易
    ↓
切换到树形视图
    ↓
看到"未分类 (5) RM 900.00"节点
    ↓
点击节点
    ↓
切换到表格，显示5条未分类交易
    ↓
逐条进行分类处理
```

## ⚠️ 注意事项

### 1. 虚拟子交易处理
- 树形视图自动过滤 `isVirtual` 交易
- 避免重复计算拆分交易的金额

### 2. 数据同步
- 树形数据通过 `useEffect` 监听 `transactions` 变化
- 任何交易增删改都会自动重建树

### 3. 筛选状态管理
- 从树形视图点击后会设置 `filteredTransactions`
- 切回树形视图时会清空筛选
- 表格的 `dataSource` 优先使用 `filteredTransactions`

### 4. 性能考虑
- 大量交易时（>1000）树形构建可能需要时间
- 考虑添加加载状态或虚拟滚动

## 🎯 未来优化建议

1. **搜索功能**: 在树形视图中添加搜索框，高亮匹配节点
2. **统计信息**: 在根节点显示总收入和总支出
3. **右键菜单**: 在树节点上右键显示快捷操作（批量分类、导出等）
4. **折叠记忆**: 记住用户的展开/折叠状态
5. **虚拟滚动**: 大量数据时使用虚拟滚动提升性能
6. **拖拽排序**: 支持拖拽调整分类顺序

## 📚 相关文件

- **主文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`
- **参考实现**: `src/modules/finance/pages/FinancialRecordsPage/index.tsx`
- **说明文档**: `FINANCIAL_RECORDS_TREE_VIEW_LOGIC.md`

## 总结

✅ **已实现**:
- 表格/树形视图切换标签页
- 三层树形结构（收入/支出 → 类别 → 二次分类）
- 实时金额汇总
- 叶子节点点击筛选功能
- 默认展开所有节点
- 视觉区分（绿色收入、红色支出）
- 用户提示信息

✅ **完全兼容**:
- 保留所有原有表格功能
- 批量操作栏正常工作
- 筛选器和搜索功能正常
- 银行账户标签页正常

🎉 **用户价值**:
- 提供更直观的交易层级视图
- 快速了解收支结构
- 便捷的分类查找和筛选
- 更好的数据可视化体验

