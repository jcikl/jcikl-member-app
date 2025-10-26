# 活动财务标签页筛选架构设计

## 📋 设计概述

参考财务概览页面会员费用标签页的筛选架构，为活动财务标签页添加完整的筛选功能，提供更好的数据管理和用户体验。

## 🎯 参考架构分析

### 会员费用标签页筛选架构特点：

1. **左侧独立筛选卡片** - 固定在左侧，粘性定位
2. **多维度筛选** - 年份、会员类别、付款状态、交易账户
3. **双标签页结构** - 会员费用表格 + 交易记录表格
4. **响应式布局** - 左侧筛选 + 右侧内容区域
5. **实时筛选** - 筛选条件变化立即更新数据

## 🔧 活动财务标签页筛选设计

### 1. 整体布局架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    活动财务管理页面                              │
├─────────────────────────────────────────────────────────────────┤
│  📊 统计卡片区域                                                 │
│  [活动收入] [活动支出] [净收益] [待处理]                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │   🎯 活动筛选   │  │         主体内容区域                │   │
│  │                 │  │                                     │   │
│  │ 📅 年份筛选     │  │  ┌─────────────────────────────────┐ │   │
│  │ [财年下拉]      │  │  │       标签页导航                │ │   │
│  │                 │  │  │ [活动列表] [交易记录]           │ │   │
│  │ 🏢 负责理事     │  │  └─────────────────────────────────┘ │   │
│  │ [理事下拉]      │  │                                     │   │
│  │                 │  │  ┌─────────────────────────────────┐ │   │
│  │ 📈 活动状态     │  │  │       数据表格区域              │ │   │
│  │ [状态筛选]      │  │  │                                 │ │   │
│  │                 │  │  │  [表格数据]                     │ │   │
│  │ 🎭 活动类型     │  │  │                                 │ │   │
│  │ [类型筛选]      │  │  │                                 │ │   │
│  │                 │  │  └─────────────────────────────────┘ │   │
│  │ 🏦 交易账户     │  │                                     │   │
│  │ [账户筛选]      │  │                                     │   │
│  │ (仅交易记录)    │  │                                     │   │
│  │                 │  │                                     │   │
│  │ 📊 财务状态     │  │                                     │   │
│  │ [盈亏筛选]      │  │                                     │   │
│  └─────────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 筛选维度详细设计

#### 📅 年份筛选
```typescript
interface YearFilter {
  options: [
    { value: 'FY2025', label: '2025财年' },
    { value: 'FY2024', label: '2024财年' },
    { value: 'FY2023', label: '2023财年' },
    { value: 'all', label: '所有年份' }
  ]
}
```

#### 🏢 负责理事筛选
```typescript
interface BoardMemberFilter {
  options: [
    { value: 'all', label: '所有理事' },
    { value: 'president', label: '会长' },
    { value: 'vice-president', label: '副会长' },
    { value: 'secretary', label: '秘书长' },
    { value: 'treasurer', label: '财政' },
    { value: 'director', label: '理事' }
  ]
}
```

#### 📈 活动状态筛选
```typescript
interface EventStatusFilter {
  options: [
    { value: 'all', label: '所有状态' },
    { value: 'planning', label: '🔄 策划中' },
    { value: 'active', label: '✅ 进行中' },
    { value: 'completed', label: '✅ 已完成' },
    { value: 'cancelled', label: '❌ 已取消' }
  ]
}
```

#### 🎭 活动类型筛选
```typescript
interface EventTypeFilter {
  options: [
    { value: 'all', label: '所有类型' },
    { value: 'training', label: '📚 培训活动' },
    { value: 'networking', label: '🤝 联谊活动' },
    { value: 'conference', label: '🏛️ 会议活动' },
    { value: 'social', label: '🎉 社交活动' },
    { value: 'charity', label: '❤️ 慈善活动' }
  ]
}
```

#### 🏦 交易账户筛选（仅交易记录标签页）
```typescript
interface TransactionAccountFilter {
  options: [
    { value: 'all', label: '所有活动' },
    { value: 'uncategorized', label: '未分类交易' },
    { value: 'year-2025', label: '2025年交易' },
    { value: 'year-2024', label: '2024年交易' },
    // 动态加载活动名称
    ...financeEvents.map(event => ({
      value: event.eventName,
      label: event.eventName
    }))
  ]
}
```

#### 📊 财务状态筛选
```typescript
interface FinancialStatusFilter {
  options: [
    { value: 'all', label: '所有状态' },
    { value: 'profitable', label: '💰 盈利' },
    { value: 'break-even', label: '⚖️ 持平' },
    { value: 'loss', label: '📉 亏损' },
    { value: 'pending', label: '⏳ 待结算' }
  ]
}
```

### 3. 状态管理设计

```typescript
interface EventFinancialFilterState {
  // 基础筛选
  selectedYear: string;
  selectedBoardMember: string;
  selectedEventStatus: string;
  selectedEventType: string;
  
  // 交易记录筛选
  txAccountFilter: string;
  financialStatusFilter: string;
  
  // 分页状态
  currentPage: number;
  pageSize: number;
  transactionPage: number;
  transactionPageSize: number;
}
```

### 4. 筛选逻辑设计

#### 活动列表筛选逻辑
```typescript
const applyEventFilters = (events: EventFinancialSummary[]) => {
  return events.filter(event => {
    // 年份筛选
    if (selectedYear !== 'all' && event.fiscalYear !== selectedYear) {
      return false;
    }
    
    // 负责理事筛选
    if (selectedBoardMember !== 'all' && event.boardMember !== selectedBoardMember) {
      return false;
    }
    
    // 活动状态筛选
    if (selectedEventStatus !== 'all' && event.status !== selectedEventStatus) {
      return false;
    }
    
    // 活动类型筛选（基于活动名称或类型字段）
    if (selectedEventType !== 'all' && !isEventTypeMatch(event, selectedEventType)) {
      return false;
    }
    
    return true;
  });
};
```

#### 交易记录筛选逻辑
```typescript
const applyTransactionFilters = (transactions: Transaction[]) => {
  return transactions.filter(transaction => {
    // 交易账户筛选
    if (txAccountFilter !== 'all') {
      if (txAccountFilter === 'uncategorized' && transaction.txAccount) {
        return false;
      }
      if (txAccountFilter.startsWith('year-')) {
        const year = txAccountFilter.replace('year-', '');
        if (!transaction.txAccount?.startsWith(`${year}-`)) {
          return false;
        }
      }
      if (transaction.txAccount !== txAccountFilter) {
        return false;
      }
    }
    
    // 财务状态筛选（基于收入支出计算）
    if (financialStatusFilter !== 'all') {
      const eventFinancial = getEventFinancialByTransaction(transaction);
      if (!matchesFinancialStatus(eventFinancial, financialStatusFilter)) {
        return false;
      }
    }
    
    return true;
  });
};
```

### 5. UI组件设计

#### 筛选卡片组件
```jsx
<Card 
  title="🎯 活动筛选" 
  style={{ position: 'sticky', top: 16 }}
  className="event-filter-card"
>
  {/* 年份筛选 */}
  <div style={{ marginBottom: 16 }}>
    <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
      📅 年份
    </div>
    <Select
      style={{ width: '100%' }}
      value={selectedYear}
      onChange={setSelectedYear}
      placeholder="选择年份"
    >
      <Option value="all">所有年份</Option>
      <Option value="FY2025">2025财年</Option>
      <Option value="FY2024">2024财年</Option>
    </Select>
  </div>
  
  {/* 负责理事筛选 */}
  <div style={{ marginBottom: 16 }}>
    <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
      🏢 负责理事
    </div>
    <Select
      style={{ width: '100%' }}
      value={selectedBoardMember}
      onChange={setSelectedBoardMember}
      placeholder="选择负责理事"
    >
      <Option value="all">所有理事</Option>
      <Option value="president">会长</Option>
      <Option value="vice-president">副会长</Option>
    </Select>
  </div>
  
  {/* 其他筛选器... */}
</Card>
```

### 6. 响应式设计

```css
.event-financial-page {
  .filter-sidebar {
    @media (max-width: 992px) {
      position: static;
      margin-bottom: 16px;
    }
  }
  
  .main-content {
    @media (max-width: 992px) {
      margin-left: 0;
    }
  }
}
```

### 7. 性能优化

1. **防抖处理** - 筛选条件变化时使用防抖避免频繁请求
2. **缓存机制** - 缓存筛选结果和统计数据
3. **懒加载** - 大型筛选列表使用虚拟滚动
4. **分页优化** - 筛选后重置到第一页

### 8. 用户体验增强

1. **筛选状态保存** - 记住用户的筛选偏好
2. **快速筛选** - 提供常用筛选组合的快速按钮
3. **筛选结果提示** - 显示当前筛选条件下的结果数量
4. **一键清除** - 提供清除所有筛选条件的按钮

## 🚀 实现优先级

### Phase 1: 基础筛选
- [ ] 年份筛选
- [ ] 负责理事筛选
- [ ] 活动状态筛选

### Phase 2: 高级筛选
- [ ] 活动类型筛选
- [ ] 财务状态筛选
- [ ] 交易账户筛选

### Phase 3: 用户体验优化
- [ ] 筛选状态保存
- [ ] 快速筛选按钮
- [ ] 筛选结果统计

## 📊 预期效果

1. **提升数据查找效率** - 用户可快速定位特定活动或交易
2. **改善用户体验** - 直观的筛选界面，降低学习成本
3. **增强数据分析能力** - 多维度筛选支持更深入的数据分析
4. **保持界面一致性** - 与会员费用标签页保持相同的设计语言

---

**设计时间**: 2025-01-13  
**设计人员**: AI Assistant  
**版本**: 1.0.0  
**状态**: 📋 设计完成，待实现
