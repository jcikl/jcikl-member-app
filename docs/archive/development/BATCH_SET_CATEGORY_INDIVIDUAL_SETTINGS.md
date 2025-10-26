# 批量设置分类 - 独立设置每条交易记录

## 🎯 功能概述

重新设计批量设置分类弹窗，允许用户在批量设置类别时，**为每条交易独立设置相关信息**，而不是所有交易使用相同的信息。

## 📋 需求详情

### 1. **日常财务类别**
- 添加独立设置每个交易记录的**付款人信息**
- 支持两种模式：
  - 选择会员
  - 手动填写（非会员）

### 2. **活动财务类别**
- 修改为独立设置每个交易记录的**收款人信息**
- 支持两种模式：
  - 选择会员
  - 手动填写（非会员）
- 独立设置**关联活动**

### 3. **会员费类别**
- 修改为独立设置每个交易记录的**关联会员**

## 🎨 UI设计

### 布局结构
```
┌─────────────────────────────────────────┐
│  批量设置类别 - 已选择 X 条交易          │
├─────────────────────────────────────────┤
│  选择类别 *                              │
│  [会员费 / 活动财务 / 日常账户]          │
├─────────────────────────────────────────┤
│  全局设置（共同字段）                     │
│  - 年份（会员费必填）                    │
│  - 二次分类（可选）                      │
├─────────────────────────────────────────┤
│  为每条交易设置相关信息                  │
│  ┌─────────────────────────────────┐   │
│  │  日期 | 描述 | 金额 | 特定字段  │   │
│  ├─────────────────────────────────┤   │
│  │  交易1 | ... | ... | [设置区]  │   │
│  │  交易2 | ... | ... | [设置区]  │   │
│  │  交易3 | ... | ... | [设置区]  │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│            [取消]    [确认设置]          │
└─────────────────────────────────────────┘
```

### 日常财务示例
```
日期       | 描述    | 金额      | 付款人信息
-----------+---------+-----------+------------------------
2025-01-15 | 租金    | RM 500.00 | ⚪会员 ⚪手动填写
           |         |           | [选择会员 ▼]
-----------+---------+-----------+------------------------
2025-01-16 | 水电费  | RM 150.00 | ⚪会员 ⚫手动填写
           |         |           | [输入付款人姓名]
```

### 活动财务示例
```
日期       | 描述    | 金额      | 收款人信息      | 关联活动
-----------+---------+-----------+----------------+--------------
2025-01-15 | 报名费  | RM 100.00 | ⚫会员 ⚪手动   | [选择活动 ▼]
           |         |           | [选择会员 ▼]   |
-----------+---------+-----------+----------------+--------------
2025-01-16 | 赞助款  | RM 500.00 | ⚪会员 ⚫手动   | [选择活动 ▼]
           |         |           | [输入姓名]     |
```

### 会员费示例
```
日期       | 描述    | 金额      | 关联会员
-----------+---------+-----------+----------------------
2025-01-15 | 新会员费 | RM 480.00 | [选择会员 ▼]
-----------+---------+-----------+----------------------
2025-01-16 | 续会费   | RM 350.00 | [选择会员 ▼]
```

## 💻 技术实现

### 1. **数据结构**

#### 独立交易数据接口
```typescript
interface TransactionIndividualData {
  transactionId: string;
  
  // 日常财务
  payerPayee?: string;        // 手动填写的付款人
  payerMode?: 'member' | 'manual';
  payerId?: string;           // 会员ID（付款人）
  
  // 活动财务
  payeeMode?: 'member' | 'manual';
  payeeId?: string;           // 会员ID（收款人）
  payeeName?: string;         // 手动填写的收款人
  eventId?: string;           // 关联活动
  
  // 会员费
  memberId?: string;          // 关联会员
}
```

#### Props接口
```typescript
interface BatchSetCategoryModalProps {
  visible: boolean;
  selectedTransactions: Transaction[]; // 🆕 传入完整交易列表
  onOk: (data: {
    category: string;
    txAccount?: string;
    year?: string;
    individualData?: TransactionIndividualData[]; // 🆕 每条交易的独立数据
  }) => Promise<void>;
  onCancel: () => void;
}
```

### 2. **状态管理**

```typescript
// 每条交易的独立数据（以transactionId为key）
const [individualData, setIndividualData] = useState<
  Record<string, TransactionIndividualData>
>({});

// 更新单条交易的数据
const updateIndividualData = (
  transactionId: string, 
  field: string, 
  value: any
) => {
  setIndividualData(prev => ({
    ...prev,
    [transactionId]: {
      ...prev[transactionId],
      transactionId,
      [field]: value,
    },
  }));
};
```

### 3. **表格列定义**

#### 日常财务列
```typescript
const generalAccountsColumns: ColumnsType<Transaction> = [
  { title: '日期', dataIndex: 'transactionDate', width: 100 },
  { title: '描述', dataIndex: 'description', width: 150 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  {
    title: '付款人信息',
    key: 'payerPayee',
    width: 300,
    render: (_: any, record: Transaction) => {
      const data = individualData[record.id];
      const payerMode = data?.payerMode || 'member';
      
      return (
        <div>
          <Radio.Group value={payerMode} onChange={...}>
            <Radio value="member">会员</Radio>
            <Radio value="manual">手动填写</Radio>
          </Radio.Group>
          
          {payerMode === 'member' ? (
            <Select /* 选择会员 */ />
          ) : (
            <Input /* 手动填写 */ />
          )}
        </div>
      );
    },
  },
];
```

#### 活动财务列
```typescript
const eventFinanceColumns: ColumnsType<Transaction> = [
  { title: '日期', dataIndex: 'transactionDate', width: 100 },
  { title: '描述', dataIndex: 'description', width: 150 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  {
    title: '收款人信息',
    key: 'payeeInfo',
    width: 200,
    render: (_: any, record: Transaction) => {
      // 收款人选择（会员/手动）
      return (
        <div>
          <Radio.Group /* ... */ />
          {payeeMode === 'member' ? <Select /> : <Input />}
        </div>
      );
    },
  },
  {
    title: '关联活动',
    key: 'eventId',
    width: 200,
    render: (_: any, record: Transaction) => {
      return <Select /* 选择活动 */ />;
    },
  },
];
```

#### 会员费列
```typescript
const memberFeesColumns: ColumnsType<Transaction> = [
  { title: '日期', dataIndex: 'transactionDate', width: 100 },
  { title: '描述', dataIndex: 'description', width: 150 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  {
    title: '关联会员',
    key: 'memberId',
    width: 300,
    render: (_: any, record: Transaction) => {
      return <Select /* 选择会员 */ />;
    },
  },
];
```

### 4. **数据提交处理**

```typescript
const handleBatchSetCategoryOk = async (data: {
  category: string;
  txAccount?: string;
  year?: string;
  individualData?: TransactionIndividualData[];
}) => {
  // 1. 批量设置类别
  await batchSetCategory(selectedRowKeys, data.category, user.id);

  // 2. 为每条交易应用独立设置
  if (data.individualData) {
    await Promise.all(
      data.individualData.map(async (item) => {
        const updates: Partial<Transaction> = {};
        const metadata: Record<string, any> = {};

        // 根据类别设置不同的字段
        if (data.category === 'general-accounts') {
          // 日常财务：付款人信息
          if (item.payerMode === 'manual') {
            updates.payerPayee = item.payerPayee;
          } else if (item.payerId) {
            metadata.payerId = item.payerId;
          }
        } else if (data.category === 'event-finance') {
          // 活动财务：收款人信息和活动
          if (item.payeeMode === 'manual') {
            updates.payerPayee = item.payeeName;
          } else if (item.payeeId) {
            metadata.payeeId = item.payeeId;
          }
          if (item.eventId) {
            metadata.eventId = item.eventId;
          }
        } else if (data.category === 'member-fees') {
          // 会员费：关联会员
          if (item.memberId) {
            metadata.memberId = item.memberId;
          }
        }

        // 更新单条交易
        await updateTransaction(item.transactionId, updates, user.id);
      })
    );
  }
};
```

## 📊 数据流程

```
用户选择多条交易
    ↓
点击"批量设置类别"
    ↓
选择类别（会员费/活动财务/日常账户）
    ↓
显示对应的表格（包含独立设置列）
    ↓
用户为每条交易设置信息
    ↓
点击"确认设置"
    ↓
1. 批量设置类别
2. 逐条应用独立设置
    ↓
刷新交易列表
```

## 🎯 关键特性

### 1. **灵活性** ✅
- 每条交易可以设置不同的信息
- 支持会员和非会员混合
- 可选择性填写

### 2. **效率** ✅
- 一次操作批量完成
- 表格视图清晰直观
- 支持滚动查看大量交易

### 3. **数据完整性** ✅
- 全局设置（类别、年份、二次分类）
- 独立设置（付款人、收款人、会员、活动）
- 灵活组合

### 4. **用户体验** ✅
- 清晰的表格布局
- 直观的单选/下拉控件
- 实时数据同步

## 📋 使用场景

### 场景1: 日常账户 - 混合付款人
```
用户需要批量分类10条日常支出交易：
- 5条是会员支付的（选择会员）
- 5条是外部供应商（手动填写公司名）
```

### 场景2: 活动财务 - 不同活动收款
```
用户需要批量分类8条活动收入交易：
- 4条属于活动A的报名费（选择活动A）
- 4条属于活动B的赞助款（选择活动B）
- 收款人有会员，也有非会员
```

### 场景3: 会员费 - 关联会员
```
用户需要批量分类20条会员费收入：
- 为每条交易关联对应的会员
- 统一设置年份为2025
- 统一二次分类为"新会员费"
```

## 🔍 示例操作流程

### 步骤1: 选择交易和类别
```
1. 在交易列表中选择5条交易
2. 点击"批量设置类别"
3. 选择类别：日常账户
4. 选择二次分类：租金
```

### 步骤2: 为每条交易设置付款人
```
交易1: ⚫会员 → [选择：张三 - zhang@email.com]
交易2: ⚪手动填写 → [输入：ABC物业公司]
交易3: ⚫会员 → [选择：李四 - li@email.com]
交易4: ⚪手动填写 → [输入：XYZ供应商]
交易5: ⚫会员 → [选择：王五 - wang@email.com]
```

### 步骤3: 确认提交
```
点击"确认设置"
系统提示：成功设置 5 条交易的类别及相关信息
```

### 步骤4: 查看结果
```
所有5条交易：
- 类别：日常账户
- 二次分类：租金
- 付款人：各自不同（3个会员 + 2个手动填写）
```

## ⚠️ 注意事项

### 1. **数据验证**
- 会员费必须选择年份
- 付款人/收款人信息可选
- 关联会员/活动可选

### 2. **性能考虑**
- 表格最大高度400px，支持滚动
- 大量交易时建议分批处理
- 异步更新，不阻塞UI

### 3. **数据保存**
- 会员选择保存到`metadata.payerId/payeeId/memberId`
- 手动填写保存到`payerPayee`字段
- 活动关联保存到`metadata.eventId`

## 🎉 总结

**问题**: 批量设置类别时，所有交易使用相同的付款人/收款人/会员
**解决**: 为每条交易提供独立设置界面，支持混合设置
**效果**: 灵活、高效、数据完整

---

**实现状态**: ✅ **已完成**
**影响文件**: 
- `src/modules/finance/components/BatchSetCategoryModal.tsx`
- `src/modules/finance/pages/TransactionManagementPage/index.tsx`
**功能特性**: 
- 日常财务：独立设置付款人
- 活动财务：独立设置收款人和活动
- 会员费：独立设置关联会员
