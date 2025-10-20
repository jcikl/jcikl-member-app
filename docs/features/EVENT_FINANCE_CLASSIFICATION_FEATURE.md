# 📊 活动财务分类功能

## 📅 完成日期
**2025-10-17**

---

## 🎯 功能概述

实现了活动财务页面的**动态活动管理**功能，用户可以创建活动并使用活动名称对财务交易进行二次分类。

---

## ✨ 核心功能

### 1️⃣ 创建活动

用户可以在活动财务列表页面创建新活动：
- **活动名称**（必填）：如"新年晚会"、"商业论坛"
- **活动负责理事**（必填）：选择负责该活动的理事团队成员
- **活动日期**（可选）：活动举办日期
- **活动描述**（可选）：简单描述活动内容

### 2️⃣ 活动分类

- 使用活动名称作为交易的 `txAccount`
- 所有交易可以按活动进行分类和筛选
- 动态活动列表，无需硬编码

### 3️⃣ 筛选功能

- 按活动筛选交易记录
- 下拉列表显示所有已创建的活动
- 支持"所有活动"选项查看全部交易

---

## 📊 数据模型

### FinanceEvent 接口

```typescript
type BoardMemberRole = 
  | 'president'
  | 'secretary'
  | 'honorary-treasurer'
  | 'general-legal-council'
  | 'executive-vp'
  | 'vp-individual'
  | 'vp-community'
  | 'vp-business'
  | 'vp-international'
  | 'vp-lom'
  | 'immediate-past-president';

interface FinanceEvent {
  id: string;
  eventName: string;           // 活动名称
  eventDate?: string;          // 活动日期
  description?: string;        // 活动描述
  boardMember: BoardMemberRole; // 活动负责理事（必填）
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdBy: string;           // 创建人ID
  createdAt: string;           // 创建时间
  updatedAt: string;           // 更新时间
}
```

### Firestore 集合

- **集合名称**: `financeEvents`
- **常量**: `GLOBAL_COLLECTIONS.FINANCE_EVENTS`
- **索引**: `status` + `createdAt` (DESC)

---

## 🔧 技术实现

### 新增文件

#### 1. 类型定义
```typescript
// src/modules/finance/types/index.ts
export interface FinanceEvent {
  id: string;
  eventName: string;
  eventDate?: string;
  description?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 2. 服务层
```typescript
// src/modules/finance/services/financeEventService.ts
export const getAllFinanceEvents = async (status?: string): Promise<FinanceEvent[]>
export const getFinanceEvent = async (eventId: string): Promise<FinanceEvent | null>
export const createFinanceEvent = async (eventData, userId): Promise<string>
export const updateFinanceEvent = async (eventId, updates, userId): Promise<void>
export const deleteFinanceEvent = async (eventId, userId): Promise<void>
```

#### 3. 集合常量
```typescript
// src/config/globalCollections.ts
FINANCE_EVENTS: 'financeEvents'
```

---

### 修改文件

#### EventFinancialPage.tsx

**新增状态：**
```typescript
const [financeEvents, setFinanceEvents] = useState<FinanceEvent[]>([]);
const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
const [newEventName, setNewEventName] = useState('');
const [newEventDate, setNewEventDate] = useState('');
const [newEventDescription, setNewEventDescription] = useState('');
```

**新增函数：**
```typescript
loadFinanceEvents()      // 加载活动列表
handleCreateEvent()      // 创建活动
```

**UI改进：**
1. 活动列表标签页添加"创建活动"按钮
2. 筛选器从硬编码改为动态活动列表
3. 分类Modal从固定选项改为活动列表
4. 添加创建活动Modal

---

## 📖 使用指南

### 场景1: 创建新活动

1. **进入活动财务页面**
2. **点击"创建活动"按钮**
3. **填写活动信息**：
   ```
   活动名称: 2024新年晚会 *
   活动负责理事: President（会长）*
   活动日期: 2024-12-31
   活动描述: 公司年度新年庆祝活动
   ```
4. **点击"创建"按钮**
5. **活动创建成功** ✅

---

### 场景2: 对交易进行活动分类

1. **进入"活动财务交易记录"标签页**
2. **点击交易的"分类"按钮**
3. **选择对应的活动**：
   ```
   可选活动列表:
   - 2024新年晚会 (2024-12-31)
   - 商业论坛 (2024-11-15)
   - 团队建设活动 (2024-10-20)
   ```
4. **点击活动名称**
5. **分类成功** ✅

---

### 场景3: 按活动筛选交易

1. **在筛选器中选择活动**
2. **查看该活动的所有交易记录**
3. **统计活动相关的收入/支出**

---

## 💡 业务价值

### 1️⃣ 灵活的活动管理

**Before（硬编码）:**
```
固定分类:
- 报名费
- 活动支出
- 赞助收入
- 场地租金
- 餐饮费用
- 营销费用
- 退款
```

**After（动态活动）:**
```
自定义活动:
- 2024新年晚会
- Q1商业论坛
- 团队建设活动
- 客户答谢会
- 培训课程
- ... (无限扩展)
```

---

### 2️⃣ 准确的活动财务追踪

**示例：新年晚会财务报表**

| 日期 | 描述 | 类型 | 金额 | 活动分类 |
|------|------|------|------|---------|
| 2024-11-01 | 场地预订 | 支出 | -RM 5,000 | 2024新年晚会 |
| 2024-11-15 | 员工报名费 | 收入 | +RM 8,000 | 2024新年晚会 |
| 2024-12-01 | 餐饮服务 | 支出 | -RM 12,000 | 2024新年晚会 |
| 2024-12-20 | 赞助收入 | 收入 | +RM 15,000 | 2024新年晚会 |
| **总计** | | | **+RM 6,000** | **净收入** |

---

### 3️⃣ 便捷的活动成本分析

**活动对比报表：**

| 活动 | 总收入 | 总支出 | 净收入 | 利润率 |
|------|--------|--------|--------|--------|
| 2024新年晚会 | RM 23,000 | RM 17,000 | RM 6,000 | 26% |
| Q1商业论坛 | RM 45,000 | RM 28,000 | RM 17,000 | 38% |
| 团队建设活动 | RM 8,000 | RM 12,000 | -RM 4,000 | -50% |

---

### 4️⃣ 历史活动数据保留

- 活动完成后，财务数据仍然保留
- 支持跨年度活动对比
- 便于预算规划

---

## 🔄 数据流程

### 创建活动流程

```
用户点击"创建活动"
    ↓
填写活动信息
    ↓
调用 createFinanceEvent()
    ↓
写入 Firestore: financeEvents 集合
    ↓
重新加载活动列表
    ↓
活动出现在下拉列表中 ✅
```

---

### 交易分类流程

```
用户点击"分类"按钮
    ↓
打开分类Modal，显示活动列表
    ↓
用户选择活动
    ↓
调用 updateTransaction({ txAccount: eventName })
    ↓
更新 Firestore: transactions 集合
    ↓
txAccount = 活动名称 ✅
    ↓
筛选器可以按活动筛选 ✅
```

---

## 📊 UI界面

### 创建活动Modal

```
┌─────────────────────────────────────┐
│  创建新活动                    [x]   │
├─────────────────────────────────────┤
│  活动名称 *                          │
│  ┌───────────────────────────────┐  │
│  │ 例如：新年晚会、商业论坛      │  │
│  └───────────────────────────────┘  │
│                                      │
│  活动日期                            │
│  ┌───────────────────────────────┐  │
│  │ 2024-12-31                    │  │
│  └───────────────────────────────┘  │
│                                      │
│  活动描述                            │
│  ┌───────────────────────────────┐  │
│  │ 简单描述活动内容              │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                      │
│            [取消]    [创建]          │
└─────────────────────────────────────┘
```

---

### 活动分类Modal

```
┌─────────────────────────────────────┐
│  交易二次分类                  [x]   │
├─────────────────────────────────────┤
│  交易描述: 场地租金                  │
│  交易金额: RM 5,000.00              │
│  交易日期: 01-Nov-2024              │
│                                      │
│  选择活动分类:                       │
│  ┌───────────────────────────────┐  │
│  │  + 创建新活动                 │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌───────────────────────────────┐  │
│  │  2024新年晚会  31-Dec-2024    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Q1商业论坛    15-Nov-2024    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  团队建设活动  20-Oct-2024    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### 筛选器

```
┌─────────────────────────────────────┐
│  按活动筛选: [所有活动 ▼]           │
└─────────────────────────────────────┘

下拉选项:
- 所有活动
- 2024新年晚会
- Q1商业论坛
- 团队建设活动
- 客户答谢会
```

---

## ✅ 测试验证

### 测试用例1: 创建活动

1. ✅ 必填项验证（活动名称为空时提示错误）
2. ✅ 成功创建活动后显示成功消息
3. ✅ 活动立即出现在下拉列表中
4. ✅ Modal关闭并清空表单

---

### 测试用例2: 活动分类

1. ✅ 打开分类Modal显示所有活动
2. ✅ 点击活动后成功更新交易
3. ✅ 交易的 `txAccount` 等于活动名称
4. ✅ 刷新后分类仍然保留

---

### 测试用例3: 活动筛选

1. ✅ 筛选器显示所有已创建的活动
2. ✅ 选择活动后只显示该活动的交易
3. ✅ 选择"所有活动"显示全部交易
4. ✅ 筛选结果准确

---

## 🔒 权限控制

- **创建活动**: 需要 `EVENT_FINANCE` 模块的 `CREATE` 权限
- **活动分类**: 需要 `EVENT_FINANCE` 模块的 `UPDATE` 权限
- **查看活动**: 需要 `EVENT_FINANCE` 模块的 `READ` 权限

---

## 📝 未来改进

### 1️⃣ 活动管理页面

创建独立的活动管理页面：
- 编辑活动信息
- 删除活动（需检查是否有关联交易）
- 活动状态管理（计划中、进行中、已完成）
- 活动财务汇总

---

### 2️⃣ 活动预算

- 为活动设置预算
- 实时显示预算执行情况
- 超预算预警

---

### 3️⃣ 活动报表

- 活动财务详情报表
- 活动对比分析
- 活动ROI计算

---

### 4️⃣ 活动模板

- 创建活动模板（包含预算项）
- 快速复制历史活动
- 活动最佳实践沉淀

---

## 🎊 总结

### Before (硬编码分类)
```
❌ 固定的分类选项
❌ 无法按实际活动分类
❌ 难以追踪活动财务
❌ 修改分类需要改代码
```

### After (动态活动管理)
```
✅ 灵活创建活动
✅ 按活动精确分类
✅ 完整的活动财务追踪
✅ 无需修改代码
✅ 支持历史活动数据
✅ 便于活动对比分析
```

---

## 📚 相关文档

- ✅ `TRANSACTION_SPLIT_FEATURE.md` - 拆分功能说明
- ✅ `RE_SPLIT_UPDATE_FEATURE.md` - 再次拆分功能
- ✅ `CHILD_TRANSACTION_DESCRIPTION_FIX.md` - 子交易描述继承
- ✅ `EVENT_FINANCE_CLASSIFICATION_FEATURE.md` - 本文档

---

**功能已完成，立即可用！** 🎉

可以通过活动财务页面的"创建活动"按钮开始使用。

