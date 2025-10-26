# 交易管理树形视图 - 日期范围筛选功能

## 🎯 功能概述

为交易管理页面的树形视图添加了**日期范围筛选**功能，支持三种筛选模式：
- **全部**: 显示所有交易记录
- **财年 (Fiscal Year)**: 10月1日至次年9月30日
- **自然年 (Calendar Year)**: 1月1日至12月31日

## 📍 实现位置

**文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`

## 🆕 新增功能

### 1. 状态变量

```typescript
// 第93-94行
const [treeDateRangeType, setTreeDateRangeType] = useState<'fiscal' | 'calendar' | 'all'>('all');
const [treeSelectedYear, setTreeSelectedYear] = useState<string>(new Date().getFullYear().toString());
```

### 2. 日期过滤逻辑

```typescript
// 第887-915行：buildTreeData函数中
if (treeDateRangeType !== 'all') {
  const year = parseInt(treeSelectedYear);
  
  realTransactions = realTransactions.filter(transaction => {
    if (!transaction.transactionDate) return false;
    
    const txDate = new Date(transaction.transactionDate);
    const txYear = txDate.getFullYear();
    const txMonth = txDate.getMonth() + 1; // 1-12
    
    if (treeDateRangeType === 'fiscal') {
      // 财年：10月1日 至 次年9月30日
      if (txMonth >= 10) {
        return txYear === year;      // 10-12月属于当前财年
      } else {
        return txYear === year + 1;  // 1-9月属于上一财年
      }
    } else if (treeDateRangeType === 'calendar') {
      // 自然年：1月1日 至 12月31日
      return txYear === year;
    }
    
    return true;
  });
}
```

### 3. UI控件

```typescript
// 第1600-1640行：树形视图中的日期范围选择器
<Card style={{ marginBottom: 24 }} bordered={false}>
  <Space size="middle" wrap>
    <span style={{ fontWeight: 500 }}>日期范围:</span>
    
    {/* 日期范围类型选择 */}
    <Radio.Group 
      value={treeDateRangeType} 
      onChange={(e) => setTreeDateRangeType(e.target.value)}
      buttonStyle="solid"
    >
      <Radio.Button value="all">全部</Radio.Button>
      <Radio.Button value="fiscal">财年 (10月-9月)</Radio.Button>
      <Radio.Button value="calendar">自然年 (1月-12月)</Radio.Button>
    </Radio.Group>
    
    {/* 年份选择器（当选择财年或自然年时显示） */}
    {treeDateRangeType !== 'all' && (
      <>
        <Select
          style={{ width: 120 }}
          value={treeSelectedYear}
          onChange={setTreeSelectedYear}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return (
              <Option key={year} value={year.toString()}>
                {treeDateRangeType === 'fiscal' ? `FY${year}` : `${year}年`}
              </Option>
            );
          })}
        </Select>
        
        {/* 日期范围提示 */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {treeDateRangeType === 'fiscal' 
            ? `${treeSelectedYear}-10-01 至 ${parseInt(treeSelectedYear) + 1}-09-30`
            : `${treeSelectedYear}-01-01 至 ${treeSelectedYear}-12-31`
          }
        </Text>
      </>
    )}
  </Space>
</Card>
```

## 📊 日期范围计算逻辑

### 财年 (Fiscal Year)

**定义**: FY2024 = 2024年10月1日 至 2025年9月30日

```
2024-10-01 ───────────────────────── 2025-09-30
    ↑                                      ↑
 财年开始                               财年结束
```

**判断逻辑**:
```typescript
if (txMonth >= 10) {
  // 10-12月属于当前财年
  // 例如：2024-11-15 属于 FY2024
  return txYear === year;
} else {
  // 1-9月属于上一财年
  // 例如：2025-03-15 属于 FY2024
  return txYear === year + 1;
}
```

**示例**:
| 交易日期 | 所属财年 | 说明 |
|---------|---------|------|
| 2024-10-01 | FY2024 | 财年开始日 |
| 2024-12-31 | FY2024 | 10-12月属于当前财年 |
| 2025-01-01 | FY2024 | 1-9月属于上一财年 |
| 2025-09-30 | FY2024 | 财年结束日 |
| 2025-10-01 | FY2025 | 下一财年开始 |

### 自然年 (Calendar Year)

**定义**: 2024年 = 2024年1月1日 至 2024年12月31日

```
2024-01-01 ───────────────────────── 2024-12-31
    ↑                                      ↑
自然年开始                             自然年结束
```

**判断逻辑**:
```typescript
return txYear === year;  // 交易年份等于选择的年份
```

**示例**:
| 交易日期 | 所属自然年 | 说明 |
|---------|-----------|------|
| 2024-01-01 | 2024年 | 自然年开始日 |
| 2024-06-15 | 2024年 | 年中 |
| 2024-12-31 | 2024年 | 自然年结束日 |
| 2025-01-01 | 2025年 | 下一自然年开始 |

## 🎨 UI界面

### 默认状态（全部）
```
┌──────────────────────────────────────────────────┐
│ 日期范围: ⚪ 全部 ⚫ 财年(10月-9月) ⚪ 自然年(1月-12月) │
└──────────────────────────────────────────────────┘
```

### 选择财年
```
┌──────────────────────────────────────────────────────────────────┐
│ 日期范围: ⚪ 全部 ⚫ 财年(10月-9月) ⚪ 自然年(1月-12月)              │
│                                                                   │
│           [FY2024 ▼]  2024-10-01 至 2025-09-30                  │
└──────────────────────────────────────────────────────────────────┘
```

### 选择自然年
```
┌──────────────────────────────────────────────────────────────────┐
│ 日期范围: ⚪ 全部 ⚪ 财年(10月-9月) ⚫ 自然年(1月-12月)              │
│                                                                   │
│           [2024年 ▼]  2024-01-01 至 2024-12-31                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 交互流程

### 场景1: 查看FY2024的交易
```
用户点击"树形视图"标签
    ↓
点击"财年 (10月-9月)"单选按钮
    ↓
自动显示年份选择器（默认当前年份）
    ↓
选择"FY2024"
    ↓
树形视图只显示2024-10-01至2025-09-30的交易
    ↓
树形结构自动更新，显示该期间的收入和支出
```

### 场景2: 切换到自然年2024
```
当前显示FY2024
    ↓
点击"自然年 (1月-12月)"单选按钮
    ↓
年份显示自动更新为"2024年"
    ↓
日期范围提示更新为"2024-01-01 至 2024-12-31"
    ↓
树形视图只显示2024年1月至12月的交易
```

### 场景3: 切换回全部
```
当前显示FY2024或2024年
    ↓
点击"全部"单选按钮
    ↓
年份选择器和日期范围提示自动隐藏
    ↓
树形视图显示所有交易记录
```

## 📋 年份列表

提供最近10年的年份选择：

```typescript
Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return year;  // 例如：2024, 2023, 2022, ..., 2015
});
```

**年份列表示例**（假设当前是2024年）:
```
FY2024 / 2024年
FY2023 / 2023年
FY2022 / 2022年
FY2021 / 2021年
FY2020 / 2020年
FY2019 / 2019年
FY2018 / 2018年
FY2017 / 2017年
FY2016 / 2016年
FY2015 / 2015年
```

## 🔍 数据流

```
用户选择日期范围类型和年份
    ↓
setTreeDateRangeType(type)
setTreeSelectedYear(year)
    ↓
【触发useEffect】
    ↓
buildTreeData()执行
    ↓
根据treeDateRangeType和treeSelectedYear过滤交易：
  - 'all': 不过滤，显示所有
  - 'fiscal': 财年逻辑过滤
  - 'calendar': 自然年逻辑过滤
    ↓
过滤后的realTransactions进入分组逻辑
    ↓
构建树节点（收入/支出 → 类别 → 二次分类）
    ↓
setTreeData(...)
    ↓
Tree组件重新渲染，显示过滤后的数据
```

## 💡 特殊处理

### 1. 没有交易日期的记录
```typescript
if (!transaction.transactionDate) return false;  // 排除没有日期的交易
```

### 2. 日期格式转换
```typescript
const txDate = new Date(transaction.transactionDate);
const txYear = txDate.getFullYear();
const txMonth = txDate.getMonth() + 1;  // 注意：getMonth()返回0-11
```

### 3. 财年跨年判断
```typescript
// 关键逻辑：月份≥10属于当前财年，<10属于上一财年
if (txMonth >= 10) {
  return txYear === year;      // 2024-10到2024-12 → FY2024
} else {
  return txYear === year + 1;  // 2025-01到2025-09 → FY2024
}
```

### 4. 动态UI显示
```typescript
{treeDateRangeType !== 'all' && (
  // 只有在选择财年或自然年时才显示年份选择器
  <Select>...</Select>
)}
```

## 🎨 视觉设计

### 按钮样式
- **buttonStyle="solid"**: 选中的按钮有实心背景
- **未选中**: 白色背景，灰色边框
- **选中**: 蓝色背景，白色文字

### 日期范围提示
- **字体大小**: 12px
- **颜色**: type="secondary" (灰色)
- **格式**: YYYY-MM-DD 至 YYYY-MM-DD

### 布局
```
<Space size="middle" wrap>
  标签  |  单选按钮组  |  年份选择器  |  日期提示
</Space>
```

## ✨ 功能亮点

### 1. 灵活的日期筛选
- 支持财年视角（适合财务报告）
- 支持自然年视角（适合年度总结）
- 可查看全部历史记录

### 2. 直观的UI
- 单选按钮清晰表示三种模式
- 年份下拉菜单方便选择
- 实时显示日期范围提示

### 3. 智能交互
- 切换日期范围类型时，年份选择器自动显示/隐藏
- 切换财年/自然年时，年份标签自动更新（FY2024 vs 2024年）
- 日期范围提示实时更新

### 4. 实时更新
- 选择后立即重新构建树形数据
- 金额汇总自动重新计算
- 树节点数量实时更新

### 5. 默认值合理
- 默认显示"全部"
- 默认年份为当前年份
- 提供最近10年的选择

## 📊 使用场景

### 场景1: 年度财务报告
```
财务主管需要准备FY2024的财务报告
    ↓
切换到树形视图
    ↓
选择"财年 (10月-9月)"
    ↓
选择"FY2024"
    ↓
查看收入树：
  - 会员费用 (50) RM 24,000.00
  - 活动财务 (12) RM 15,000.00
  - 日常账户 (30) RM 8,000.00
    ↓
查看支出树：
  - 活动财务 (10) RM 8,000.00
  - 日常账户 (40) RM 12,000.00
    ↓
快速了解整个财年的收支情况
```

### 场景2: 对比不同年份
```
用户想对比FY2023和FY2024的收支
    ↓
选择"财年"和"FY2024"，记录数据
    ↓
切换到"FY2023"
    ↓
对比两个财年的树形结构
    ↓
发现2024年会员费收入增长20%
```

### 场景3: 自然年度统计
```
需要准备2024年的年度总结
    ↓
选择"自然年 (1月-12月)"
    ↓
选择"2024年"
    ↓
查看2024年1月至12月的所有交易
    ↓
统计全年收支数据
```

## ⚠️ 注意事项

### 1. 日期必须有效
- 只筛选有`transactionDate`字段的交易
- 无日期的交易会被排除

### 2. 财年逻辑准确性
- 确保理解财年跨年逻辑
- 10-12月属于当前财年
- 1-9月属于上一财年

### 3. 数据更新
- 切换日期范围后树形数据会重新计算
- 可能需要几秒钟处理大量数据

### 4. 年份范围
- 目前提供最近10年
- 如需更长历史记录，可调整`Array.from({ length: 10 }...)`

## 🔧 配置选项

### 修改年份范围
```typescript
// 当前：最近10年
Array.from({ length: 10 }, (_, i) => {...})

// 改为最近20年
Array.from({ length: 20 }, (_, i) => {...})
```

### 修改默认日期范围
```typescript
// 当前：默认"全部"
const [treeDateRangeType, setTreeDateRangeType] = useState<'fiscal' | 'calendar' | 'all'>('all');

// 改为默认"财年"
const [treeDateRangeType, setTreeDateRangeType] = useState<'fiscal' | 'calendar' | 'all'>('fiscal');
```

### 修改默认年份
```typescript
// 当前：默认当前年份
const [treeSelectedYear, setTreeSelectedYear] = useState<string>(
  new Date().getFullYear().toString()
);

// 改为默认去年
const [treeSelectedYear, setTreeSelectedYear] = useState<string>(
  (new Date().getFullYear() - 1).toString()
);
```

## 🚀 未来优化建议

1. **日期范围预设**
   - 添加"最近3个月"、"最近6个月"等快捷选项
   - 添加"上一财年"、"本财年"快捷按钮

2. **自定义日期范围**
   - 添加"自定义"选项
   - 允许用户选择任意开始和结束日期

3. **对比模式**
   - 允许同时显示两个年份的对比
   - 并排展示两个树形结构

4. **数据导出**
   - 添加"导出当前视图"按钮
   - 导出Excel时包含日期范围信息

5. **性能优化**
   - 大量交易时使用虚拟滚动
   - 添加加载状态指示器

## 📚 相关文件

- **主文件**: `src/modules/finance/pages/TransactionManagementPage/index.tsx`
- **树形视图文档**: `TRANSACTION_TREE_VIEW_FEATURE.md`
- **验证清单**: `TREE_VIEW_VERIFICATION_CHECKLIST.md`

## 总结

✅ **已实现**:
- 三种日期范围筛选模式（全部、财年、自然年）
- 年份下拉选择器（最近10年）
- 实时日期范围提示
- 动态树形数据更新
- 智能UI显示/隐藏

✅ **准确的逻辑**:
- 财年跨年计算正确
- 自然年范围准确
- 日期过滤精确

🎉 **用户价值**:
- 灵活的财务报告视角
- 快速查看特定期间的收支
- 便于年度对比和分析
- 符合财务管理习惯

