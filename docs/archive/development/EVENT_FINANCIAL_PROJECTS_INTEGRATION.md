# 活动财务页面集成Projects Collection

## 🎯 功能概述

调整了财务概览页面的活动财务标签页，使其从`projects` collection读取活动主席、活动财政和活动日期信息，确保数据的一致性和准确性。

---

## 📋 变更详情

### 变更内容

| 字段 | 之前数据源 | 现在数据源 | 说明 |
|------|----------|----------|------|
| **活动日期** | `financeEvents.eventDate` | `projects.startDate` | 使用活动的实际开始日期 |
| **活动主席** | `financeEvents.eventChair` | `projects.committeeMembers` | 从委员会成员中查找职位为"活动主席"的成员 |
| **活动财政** | `financeEvents.eventTreasurer` | `projects.committeeMembers` | 从委员会成员中查找职位为"活动财政"的成员 |

### 数据流程

```
1. 加载 financeEvents (活动财务账户)
   ↓
2. 加载 projects (活动管理数据)
   ↓
3. 通过活动名称匹配
   ↓
4. 从 projects 提取：
   - startDate → eventDate
   - committeeMembers → eventChair, eventTreasurer
   ↓
5. 合并显示在活动财务列表
```

---

## 🔧 技术实现

### 1. 数据类型更新

#### EventFinancialSummary接口
```typescript
interface EventFinancialSummary {
  eventId: string;
  eventName: string;
  eventDate: string;              // ✅ 从projects读取
  boardMember?: string;           // 负责理事（保留）
  eventChair?: string;            // 🆕 活动主席（从projects读取）
  eventTreasurer?: string;        // 🆕 活动财政（从projects读取）
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  budgetedRevenue: number;
  budgetedExpense: number;
  status: string;
}
```

### 2. 导入Projects服务

```typescript
import { getEvents } from '../../../event/services/eventService';
import type { Event } from '../../../event/types';
```

### 3. 数据加载逻辑

#### loadEventFinancials函数
```typescript
const loadEventFinancials = async () => {
  // 1. 加载财务活动
  const financeEventsList = await getAllFinanceEvents();
  
  // 2. 🆕 加载projects活动数据
  const projectsResult = await getEvents({
    page: 1,
    limit: 1000,
    status: 'Published',
  });
  
  // 3. 创建活动名称到项目的映射
  const projectsMap = new Map<string, Event>(
    projectsResult.data.map(p => [p.name, p])
  );
  
  // 4. 加载交易记录
  const allEventTransactions = await getTransactions({ ... });
  
  // 5. 合并数据
  const eventFinancials = financeEventsList.map(event => {
    // 从projects读取活动信息
    const projectInfo = projectsMap.get(event.eventName);
    
    let eventChair = '';
    let eventTreasurer = '';
    let eventDate = event.eventDate || new Date().toISOString();
    
    if (projectInfo) {
      // 读取活动日期
      eventDate = projectInfo.startDate;
      
      // 从committeeMembers读取活动主席和财政
      if (projectInfo.committeeMembers && projectInfo.committeeMembers.length > 0) {
        const chair = projectInfo.committeeMembers.find(
          m => m.position === '活动主席' || m.position === 'Chair'
        );
        const treasurer = projectInfo.committeeMembers.find(
          m => m.position === '活动财政' || m.position === 'Treasurer'
        );
        
        eventChair = chair ? chair.name : '';
        eventTreasurer = treasurer ? treasurer.name : '';
      }
    }
    
    return {
      ...event,
      eventDate,        // ✅ 从projects
      eventChair,       // ✅ 从projects
      eventTreasurer,   // ✅ 从projects
    };
  });
};
```

### 4. CommitteeMember结构

```typescript
interface CommitteeMember {
  id: string;
  name: string;               // 姓名
  position: string;           // 职位（如"活动主席"、"活动财政"）
  contact?: string;           // 联系方式
  email?: string;             // 邮箱
  canEditEvent: boolean;      // 活动编辑权限
  canApproveTickets: boolean; // 票务批准权限
}
```

### 5. 表格列更新

#### 之前（从financeEvents查找）
```typescript
{
  title: '活动主席',
  render: (_: string, record: EventFinancialSummary) => {
    const event = financeEvents.find(e => e.eventName === record.eventName);
    const chair = event?.eventChair;
    return chair ? <Tag color="blue">{chair}</Tag> : <Tag>未设置</Tag>;
  },
}
```

#### 现在（直接使用record）
```typescript
{
  title: '活动主席',
  dataIndex: 'eventChair',
  render: (chair: string) => {
    return chair ? <Tag color="blue">{chair}</Tag> : <Tag>未设置</Tag>;
  },
}
```

### 6. 详情抽屉更新

#### 之前
```typescript
<Descriptions.Item label="活动主席">
  {(() => {
    const event = financeEvents.find(e => e.eventName === selectedEventDetail.eventName);
    return event?.eventChair || '未设置';
  })()}
</Descriptions.Item>
```

#### 现在
```typescript
<Descriptions.Item label="活动主席">
  {selectedEventDetail.eventChair || '未设置'}
</Descriptions.Item>
```

---

## 📊 数据匹配逻辑

### 匹配规则
1. **通过活动名称匹配**：`financeEvents.eventName === projects.name`
2. **职位查找规则**：
   - 活动主席：`position === '活动主席' || position === 'Chair'`
   - 活动财政：`position === '活动财政' || position === 'Treasurer'`

### 回退机制
```typescript
// 如果projects中没有匹配的活动
if (!projectInfo) {
  eventDate = event.eventDate || new Date().toISOString();
  eventChair = '';
  eventTreasurer = '';
}

// 如果没有committeeMembers
if (!projectInfo.committeeMembers || projectInfo.committeeMembers.length === 0) {
  eventChair = '';
  eventTreasurer = '';
}

// 如果找不到对应职位
const chair = projectInfo.committeeMembers.find(...);
eventChair = chair ? chair.name : '';
```

---

## 🎨 UI显示

### 表格视图
```
┌──────────────────────────────────────────────────────────┐
│ 活动名称    │ 活动主席    │ 活动财政    │ 活动日期      │
├──────────────────────────────────────────────────────────┤
│ 年度大会    │ [张三]      │ [李四]      │ 15-Jan-2025  │
│ 新春联欢    │ [王五]      │ [赵六]      │ 20-Feb-2025  │
│ 培训课程    │ [未设置]    │ [未设置]    │ 10-Mar-2025  │
└──────────────────────────────────────────────────────────┘
```

### 详情抽屉
```
┌─────────────────────────────────────┐
│ 活动信息                             │
├─────────────────────────────────────┤
│ 活动名称: 年度大会                   │
│ 活动日期: 15-Jan-2025               │
│ 活动主席: 张三                       │
│ 负责理事: 王会长                     │
│ 活动财政: 李四                       │
│ 状态: 已完成                         │
└─────────────────────────────────────┘
```

---

## ✅ 验证清单

- [x] 导入Event类型和getEvents服务
- [x] 添加eventChair和eventTreasurer字段到EventFinancialSummary
- [x] 在loadEventFinancials中加载projects数据
- [x] 实现活动名称匹配逻辑
- [x] 从committeeMembers提取主席和财政
- [x] 使用projects.startDate作为活动日期
- [x] 更新表格列render函数
- [x] 更新详情抽屉显示
- [x] TypeScript编译通过
- [x] 处理数据缺失的回退逻辑

---

## 📝 使用示例

### 示例1: 完整数据的活动
**Projects Collection**:
```json
{
  "name": "年度大会",
  "startDate": "2025-01-15T09:00:00Z",
  "committeeMembers": [
    {
      "id": "cm001",
      "name": "张三",
      "position": "活动主席",
      "canEditEvent": true,
      "canApproveTickets": true
    },
    {
      "id": "cm002",
      "name": "李四",
      "position": "活动财政",
      "canEditEvent": false,
      "canApproveTickets": false
    }
  ]
}
```

**显示结果**:
- 活动日期: 15-Jan-2025
- 活动主席: 张三
- 活动财政: 李四

### 示例2: 缺少委员会信息的活动
**Projects Collection**:
```json
{
  "name": "培训课程",
  "startDate": "2025-03-10T14:00:00Z",
  "committeeMembers": []
}
```

**显示结果**:
- 活动日期: 10-Mar-2025
- 活动主席: 未设置
- 活动财政: 未设置

### 示例3: Projects中没有对应活动
**Finance Events**:
```json
{
  "eventName": "旧活动",
  "eventDate": "2024-12-01"
}
```

**显示结果**:
- 活动日期: 01-Dec-2024 (使用financeEvents的日期)
- 活动主席: 未设置
- 活动财政: 未设置

---

## 🔍 数据一致性

### 保证一致性的措施

1. **单一数据源**：活动主席、财政和日期均从projects读取
2. **实时同步**：每次加载财务页面时都会重新读取projects
3. **名称匹配**：通过活动名称进行精确匹配
4. **回退机制**：如果projects中没有数据，显示"未设置"

### 注意事项

⚠️ **活动名称必须完全匹配**
- financeEvents中的`eventName`必须与projects中的`name`完全一致
- 大小写敏感
- 空格敏感

⚠️ **职位名称标准化**
- 支持中文："活动主席"、"活动财政"
- 支持英文："Chair"、"Treasurer"
- 建议在活动管理中使用标准职位名称

---

## 🚀 性能优化

### 当前实现
- 一次性加载所有projects（limit: 1000）
- 使用Map进行O(1)查找
- 只查询已发布的活动（`status: 'Published'`）

### 优化建议（未来）
1. 缓存projects数据（5分钟TTL）
2. 只加载有财务记录的活动
3. 使用索引优化查询

---

## 📚 相关文件

### 修改文件
- `src/modules/finance/pages/EventFinancialPage/index.tsx`

### 涉及类型
- `EventFinancialSummary` (finance module)
- `Event` (event module)
- `CommitteeMember` (event module)

### 涉及服务
- `getAllFinanceEvents()` (financeEventService)
- `getEvents()` (eventService)
- `getTransactions()` (transactionService)

---

## 🎯 业务价值

### 改进点
1. **数据一致性**：活动信息统一从projects管理
2. **减少重复**：不需要在financeEvents中维护活动主席和财政
3. **实时更新**：projects中的变更立即反映在财务页面
4. **扩展性**：未来可轻松添加更多项目信息

### 用户体验
1. 财务团队看到的是最新的活动信息
2. 活动主席和财政信息准确无误
3. 活动日期与活动管理保持一致

---

**功能状态**: ✅ **已完成**
**版本**: 1.0.0
**更新日期**: 2025-01-22
