# 📊 财务管理和活动管理模块架构分析报告

**分析时间**: 2025-01-13  
**分析范围**: 财务管理模块 + 活动管理模块  
**分析深度**: 完整功能、组件、服务和架构关系

---

## 📋 目录

1. [财务管理模块架构](#财务管理模块架构)
2. [活动管理模块架构](#活动管理模块架构)
3. [模块间关系](#模块间关系)
4. [数据流和业务逻辑](#数据流和业务逻辑)
5. [组件层次结构](#组件层次结构)
6. [操作关系图](#操作关系图)

---

## 🏦 财务管理模块架构

### 📁 目录结构

```
src/modules/finance/
├── components/           # UI组件（7个）
│   ├── AutoMatchModal/           # 自动匹配弹窗
│   ├── BatchSetCategoryModal.tsx # 批量设置类别弹窗
│   ├── BatchSplitModal.tsx       # 批量拆分弹窗
│   ├── EditTransactionModal.tsx  # 编辑交易弹窗
│   ├── FiscalYearStatisticsCard/ # 财年统计卡片
│   ├── SmartFiscalYearSelector/ # 智能财年选择器
│   └── SplitTransactionModal.tsx # 拆分交易弹窗
├── pages/               # 页面（10个）
│   ├── BankAccountManagementPage/     # 银行账户管理
│   ├── EventFinancialPage/           # 活动财务页面
│   ├── FinanceOverviewPage/          # 财务概览
│   ├── FinancialRecordsPage/         # 财务记录
│   ├── FiscalYearManagementPage/     # 财年管理
│   ├── FiscalYearStatisticsPage/     # 财年统计
│   ├── GeneralAccountsPage/          # 日常账户
│   ├── MemberFeeManagementPage/      # 会员费管理
│   ├── TransactionManagementPage/    # 交易管理
│   └── TransactionManagementWithFiscalYear/ # 带财年的交易管理
├── services/            # 服务层（10个）
│   ├── autoMatchService.ts              # 自动匹配服务
│   ├── bankAccountService.ts            # 银行账户服务
│   ├── budgetService.ts                 # 预算服务
│   ├── eventFinancialRecordService.ts   # 活动财务记录服务
│   ├── financeEventService.ts           # 金融活动服务
│   ├── fiscalYearService.ts             # 财年服务
│   ├── generalFinancialRecordService.ts # 日常财务记录服务
│   ├── memberFeeService.ts             # 会员费服务
│   ├── smartFiscalYearService.ts       # 智能财年服务
│   └── transactionService.ts            # 交易服务（核心）
└── types/              # 类型定义
    ├── fiscalYear.ts
    └── index.ts        # 主类型定义
```

**统计**:
- 组件: 7个
- 页面: 10个
- 服务: 10个
- 类型文件: 2个

---

## 📋 财务管理核心功能

### 1. 交易管理 (Transaction)

**核心实体**:
```typescript
interface Transaction {
  id: string;
  transactionNumber: string;        // TXN-YYYY-XXXX-NNNN
  bankAccountId: string;            // 银行账户
  transactionDate: string;          // 交易日期
  transactionType: 'income' | 'expense';
  mainDescription: string;          // 主描述
  subDescription?: string;          // 子描述
  amount: number;                   // 金额
  payerPayee?: string;             // 付款人/收款人
  payerId?: string;                // 付款人ID（会员）
  transactionPurpose?: string;    // 用途ID
  category?: string;               // 类别
  txAccount?: string;               // 交易账户
  paymentMethod?: PaymentMethod;   // 支付方式
  status: TransactionStatus;        // 状态
  
  // 拆分交易字段
  isSplit?: boolean;               // 是否已拆分
  splitCount?: number;              // 子交易数量
  parentTransactionId?: string;    // 父交易ID
  isVirtual?: boolean;             // 是否虚拟交易
  allocatedAmount?: number;        // 已分配金额
  unallocatedAmount?: number;      // 未分配金额
  
  // 活动关联字段
  relatedEventId?: string;         // 关联活动ID
  relatedEventName?: string;       // 关联活动名称
}
```

**核心服务**: `transactionService.ts`

**主要功能**:
- ✅ 创建/编辑/删除交易
- ✅ 批量设置类别
- ✅ 拆分交易（一大笔交易拆分为多个类别）
- ✅ 合并拆分交易
- ✅ 按银行账户查询
- ✅ 按财年查询
- ✅ 按类别查询
- ✅ 按活动关联查询
- ✅ 自动生成交易编号
- ✅ 自动匹配类别

---

### 2. 银行账户管理 (Bank Account)

**核心服务**: `bankAccountService.ts`

**主要功能**:
- ✅ 创建/编辑/删除银行账户
- ✅ 查询所有银行账户
- ✅ 按账户查询交易
- ✅ 账户余额计算

---

### 3. 会员费管理 (Member Fee)

**核心服务**: `memberFeeService.ts`

**主要功能**:
- ✅ 创建会员费记录
- ✅ 新会员费 / 续费
- ✅ 关联交易记录
- ✅ 费用分类（正式会员、准会员等）
- ✅ 自动从交易创建会员费

**费用标准**:
- 正式会员: RM 480 (新) / RM 350 (续费)
- 准会员: RM 250 (新) / RM 200 (续费)
- 荣誉会员: RM 0
- 访问会员: RM 100

---

### 4. 财年管理 (Fiscal Year)

**财年规则**: 
- 开始: 10月1日
- 结束: 9月30日
- 示例: FY2024 = 2024-10-01 到 2025-09-30

**核心服务**:
- `fiscalYearService.ts` - 基础财年服务
- `smartFiscalYearService.ts` - 智能财年服务

**主要功能**:
- ✅ 创建财年
- ✅ 按财年查询交易
- ✅ 财年统计
- ✅ 自动财年选择器

---

### 5. 活动财务记录 (Event Financial)

**核心服务**: `eventFinancialRecordService.ts`

**主要功能**:
- ✅ 创建活动财务记录
- ✅ 关联交易记录
- ✅ 活动预算管理
- ✅ 活动收入统计
- ✅ 活动支出统计

---

### 6. 日常账户 (General Accounts)

**核心服务**: `generalFinancialRecordService.ts`

**主要功能**:
- ✅ 日常收支记录
- ✅ 非活动财务记录
- ✅ 类别管理

---

### 7. 预算管理 (Budget)

**核心服务**: `budgetService.ts`

**主要功能**:
- ✅ 创建/编辑/删除预算
- ✅ 预算监控
- ✅ 预算执行情况

---

## 🎯 活动管理模块架构

### 📁 目录结构

```
src/modules/event/
├── components/          # UI组件（12个）
│   ├── AccountConsolidation/      # 账户整合
│   ├── ActivityFinancialPlan/     # 活动财务计划
│   ├── BankTransactionList/       # 银行交易列表
│   ├── BulkFinancialInput/        # 批量财务输入
│   ├── EventAgendaForm/          # 活动议程表单
│   ├── EventCommitteeForm/       # 活动委员会表单
│   ├── EventForm/                # 活动主表单
│   ├── EventPreview/             # 活动预览
│   ├── EventPricingForm/         # 活动定价表单
│   ├── EventRegistrationForm/     # 活动注册表单
│   ├── EventScheduleForm/        # 活动日程表单
│   ├── EventSpeakersForm/        # 活动讲者表单
│   └── FinancialRecordsList/    # 财务记录列表
├── pages/              # 页面（5个）
│   ├── EventAccountManagementPage/    # 活动账户管理
│   ├── EventCreatePage/               # 创建活动
│   ├── EventDetailPage/              # 活动详情
│   ├── EventEditPage/                # 编辑活动
│   ├── EventListPage/                # 活动列表
│   └── EventRegistrationManagementPage/ # 活动注册管理
├── services/           # 服务层（5个）
│   ├── categoryMappingService.ts      # 类别映射服务
│   ├── eventAccountPlanService.ts     # 活动账户计划服务
│   ├── eventAccountService.ts         # 活动账户服务
│   ├── eventRegistrationService.ts     # 活动注册服务
│   └── eventService.ts                # 活动服务（核心）
└── types/             # 类型定义
    └── index.ts
```

**统计**:
- 组件: 12个
- 页面: 5个
- 服务: 5个
- 类型文件: 1个

---

## 📋 活动管理核心功能

### 1. 活动实体 (Event)

**核心实体**:
```typescript
interface Event {
  // 基本信息
  name: string;
  description?: string;
  eventCode?: string;
  
  // 状态和级别
  status: 'Draft' | 'Published' | 'Cancelled' | 'Completed';
  level: 'Local' | 'Area' | 'National' | 'JCI';
  
  // 日期时间
  startDate: string;           // 活动开始日期
  endDate: string;             // 活动结束日期
  registrationStartDate?: string; // 报名开始日期
  registrationDeadline?: string; // 报名截止日期
  
  // 位置
  location?: string;
  address?: string;
  venue?: string;
  isOnline: boolean;           // 是否线上活动
  onlineLink?: string;          // 线上链接
  
  // 容量
  maxParticipants?: number;    // 最大参与人数
  currentParticipants: number; // 当前参与人数
  waitlistEnabled: boolean;    // 是否启用候补
  
  // 定价
  pricing: {
    regularPrice: number;       // 访客价格
    memberPrice: number;       // 会员价格（约30%折扣）
    alumniPrice: number;       // 校友价格（约20%折扣）
    earlyBirdPrice: number;    // 早鸟价格
    committeePrice: number;    // 委员会价格（通常0）
    earlyBirdDeadline?: string; // 早鸟截止日期
    currency: string;           // 货币（默认RM）
  };
  isFree: boolean;             // 是否免费
  
  // 财务关联
  financialAccount?: string;   // 财务账户ID
  
  // 活动内容
  agenda: EventAgendaItem[];   // 议程
  speakers: Speaker[];         // 讲者
  committeeMembers: CommitteeMember[]; // 委员会成员
  
  // 其他
  tags?: string[];
  metadata?: Record<string, any>;
}
```

**定价分层**:
- Regular Price (访客) - 最高价格
- Member Price (会员) - 约30%折扣
- Alumni Price (校友) - 约20%折扣
- Early Bird Price (早鸟) - 限时优惠
- Committee Price (委员会) - 通常免费

---

### 2. 活动服务 (Event Service)

**核心服务**: `eventService.ts`

**主要功能**:
- ✅ 创建/编辑/删除活动
- ✅ 查询活动列表
- ✅ 按状态筛选
- ✅ 按级别筛选
- ✅ 活动搜索
- ✅ 发布/取消/完成活动
- ✅ 自动创建财务账户

---

### 3. 活动注册 (Event Registration)

**核心服务**: `eventRegistrationService.ts`

**主要功能**:
- ✅ 创建注册记录
- ✅ 批准/拒绝注册
- ✅ 取消注册
- ✅ 按活动查询注册
- ✅ 按用户查询注册
- ✅ 候补管理

**参与者类型**:
- Regular (访客)
- Member (JCI会员)
- Alumni (校友)
- Early Bird (早鸟)
- Committee (委员会 - 免费)

---

### 4. 活动账户管理 (Event Account)

**核心服务**: `eventAccountService.ts`

**主要功能**:
- ✅ 查看活动关联的交易记录
- ✅ 活动财务统计
- ✅ 收入支出汇总
- ✅ 关联银行交易

**关键字段**: `relatedEventId` (在交易记录中)

---

### 5. 活动计划 (Event Account Plan)

**核心服务**: `eventAccountPlanService.ts`

**主要功能**:
- ✅ 创建活动财务计划
- ✅ 预算规划
- ✅ 实际支出对比

---

## 🔗 模块间关系

### 财务管理 ↔ 活动管理

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   活动管理模块 (Event)   │         │   财务管理模块 (Finance) │
├─────────────────────────┤         ├─────────────────────────┤
│                         │         │                         │
│  Event                  │         │  Transaction            │
│  ├─ name                │         │  ├─ relatedEventId       │
│  ├─ status              │         │  ├─ amount              │
│  ├─ startDate           │         │  ├─ transactionType     │
│  └─ financialAccount ───┼─────────┼─► category             │
│      (活动财务账户ID)     │         │  └─ bankAccountId       │
│                         │         │                         │
│  Event                  │         │  MemberFee              │
│  ├─ pricing             │         │  ├─ amount (RM 480/350) │
│  │  ├─ regularPrice     │         │  ├─ isNewMember        │
│  │  ├─ memberPrice      │         │  └─ category           │
│  │  ├─ alumniPrice      │         │                         │
│  │  ├─ earlyBirdPrice   │         │  BankAccount            │
│  │  └─ committeePrice   │         │  ├─ name                │
│  └─ agenda              │         │  ├─ accountNumber      │
│                         │         │  └─ bankName            │
└─────────────────────────┘         └─────────────────────────┘
```

### 关键关联字段

1. **Event.financialAccount** ↔ **Transaction.relatedEventId**
   - 活动通过 `financialAccount` 关联到交易
   - 交易通过 `relatedEventId` 关联到活动

2. **Event Registration** → **Transaction Creation**
   - 活动注册批准后自动创建交易记录
   - 交易类型: income
   - 金额: 根据用户类型确定价格

3. **Member Fee** → **Transaction**
   - 会员费关联到交易记录
   - 用于跟踪会员费支付

---

## 📊 数据流和业务逻辑

### 典型业务流程

#### 流程1: 创建活动并关联财务

```
1. 用户创建活动
   └─> EventService.createEvent()
       └─> 自动创建 financialAccount
       └─> 设置 pricing
       
2. 用户查看活动财务
   └─> EventAccountManagementPage
       └─> 查询 relatedEventId = financialAccount
       └─> 显示所有关联交易
       
3. 用户创建交易并关联活动
   └─> TransactionService.createTransaction()
       └─> 设置 category = 'event-finance'
       └─> 设置 relatedEventId = event.financialAccount
```

#### 流程2: 活动报名并创建交易

```
1. 用户注册活动
   └─> EventRegistrationService.createRegistration()
       └─> participantType (Member/Alumni/etc.)
       └─> status = 'pending'
       
2. 管理员批准报名
   └─> EventRegistrationService.approveRegistration()
       └─> 自动创建 Transaction
       └─> amount = 根据 participantType 计算
       └─> transactionType = 'income'
       └─> relatedEventId = event.financialAccount
       
3. 活动财务页面显示交易
   └─> EventAccountManagementPage
       └─> 查询 relatedEventId = financialAccount
       └─> 显示所有收入和支出
```

#### 流程3: 会员费管理

```
1. 创建会员费记录
   └─> MemberFeeService.createMemberFee()
       └─> memberId, category (正式会员/准会员)
       └─> isNewMember
       └─> amount = calculateFee(category, isNewMember)
       
2. 关联交易
   └─> MemberFeeService.linkTransaction()
       └─> transactionId
       └─> 建立关联关系
       
3. 查看会员费统计
   └─> MemberFeeManagementPage
       └─> 按财年统计
       └─> 按类别统计
```

---

## 🎨 组件层次结构

### 财务管理组件层次

```
FinancialManagementPage
├── TransactionManagementPage
│   ├── TransactionTable (数据表格)
│   ├── BatchSetCategoryModal (批量设置类别)
│   ├── EditTransactionModal (编辑交易)
│   ├── SplitTransactionModal (拆分交易)
│   ├── BatchSplitModal (批量拆分)
│   └── AutoMatchModal (自动匹配类别)
│
├── MemberFeeManagementPage
│   ├── FeeTable (会员费表格)
│   └── FeeStatistics (会员费统计)
│
├── EventFinancialPage
│   ├── EventFilter (活动筛选)
│   ├── TransactionList (交易列表)
│   └── Statistics (活动财务统计)
│
├── GeneralAccountsPage
│   ├── AccountFilter (账户筛选)
│   └── TransactionTree (交易树形图)
│
└── FiscalYearStatisticsPage
    ├── FiscalYearSelector (财年选择器)
    ├── StatisticsCard (统计卡片)
    └── Chart (图表)
```

### 活动管理组件层次

```
EventManagementPage
├── EventListPage
│   ├── EventCard (活动卡片)
│   ├── EventFilter (活动筛选)
│   └── EventSearch (活动搜索)
│
├── EventCreatePage / EventEditPage
│   ├── EventForm (主表单)
│   ├── EventPricingForm (定价表单)
│   ├── EventAgendaForm (议程表单)
│   ├── EventScheduleForm (日程表单)
│   ├── EventSpeakersForm (讲者表单)
│   └── EventCommitteeForm (委员会表单)
│
├── EventDetailPage
│   ├── EventInfo (活动信息)
│   ├── EventPreview (活动预览)
│   └── EventTabs
│       ├── Overview (概览)
│       ├── Registration (注册)
│       └── Finance (财务)
│
├── EventAccountManagementPage
│   ├── BankTransactionList (银行交易列表)
│   ├── FinancialRecordsList (财务记录列表)
│   ├── ActivityFinancialPlan (活动财务计划)
│   └── AccountConsolidation (账户整合)
│
└── EventRegistrationManagementPage
    ├── RegistrationTable (注册表格)
    └── RegistrationActions (注册操作)
```

---

## 📊 操作关系图

### 数据操作流程图

```
                    ┌──────────────────────┐
                    │   用户操作层          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   页面层 (Pages)     │
                    ├──────────────────────┤
                    │  TransactionMgtPage  │
                    │  EventAccountPage    │
                    │  MemberFeeMgtPage    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   组件层 (Components)│
                    ├──────────────────────┤
                    │  BatchSetCategoryModal│
                    │  EditTransactionModal │
                    │  SplitTransactionModal│
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   服务层 (Services)   │
                    ├──────────────────────┤
                    │  transactionService  │
                    │  eventService        │
                    │  eventAccountService │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   数据层 (Firestore)  │
                    ├──────────────────────┤
                    │  fin_transactions    │
                    │  projects (events)   │
                    │  member_fees         │
                    └──────────────────────┘
```

### 服务调用关系图

```
transactionService (核心)
├── getTransactions()           ───┐
├── createTransaction()          │
├── updateTransaction()           │
├── deleteTransaction()           │
└── splitTransaction()            │
                                  │ 调用
bankAccountService                 ├──► bankAccountService
├── getBankAccounts()             ├──► memberFeeService
└── getBankAccount()              ├──► eventFinancialRecordService
                                  └──► generalFinancialRecordService

eventService (核心)
├── getEvents()                   ───┐
├── createEvent()                   │
├── updateEvent()                   │
├── deleteEvent()                   │
└── publishEvent()                  │
                                    │ 调用
eventAccountService                 ├──► eventAccountPlanService
├── getEventAccountData()          ├──► eventRegistrationService
└── getEventTransactions()         └──► categoryMappingService
```

---

## 🎯 关键业务规则

### 财务管理规则

1. **交易编号格式**: `TXN-YYYY-XXXX-NNNN`
   - YYYY: 年份
   - XXXX: 账户ID后4位
   - NNNN: 序列号

2. **财年规则**:
   - 开始: 10月1日
   - 结束: 9月30日
   - FY2024 = 2024-10-01 到 2025-09-30

3. **会员费标准**:
   - 正式会员: RM 480 (新) / RM 350 (续费)
   - 准会员: RM 250 (新) / RM 200 (续费)

4. **拆分交易规则**:
   - 父交易: 虚拟交易，不影响余额
   - 子交易: 实际交易，影响余额
   - 拆分金额总和 = 父交易金额

### 活动管理规则

1. **活动状态流程**:
   ```
   Draft → Published → Completed
              ↓
         Cancelled
   ```

2. **定价分层规则**:
   - Regular > Member (~30% off) > Alumni (~20% off) > EarlyBird > Committee (0)

3. **参与者类型权限**:
   - Committee: 免费
   - EarlyBird: 早鸟价格（限时）
   - Member: 会员价格
   - Alumni: 校友价格
   - Regular: 访客价格

---

## 📊 统计总结

### 代码规模

| 模块 | 组件 | 页面 | 服务 | 类型 |
|------|------|------|------|------|
| 财务管理 | 7 | 10 | 10 | 2 |
| 活动管理 | 12 | 5 | 5 | 1 |
| **总计** | **19** | **15** | **15** | **3** |

### 核心服务

| 服务 | 导出函数数 | 用途 |
|------|-----------|------|
| transactionService | 17 | 交易管理 |
| eventService | 20+ | 活动管理 |
| memberFeeService | 13 | 会员费管理 |
| bankAccountService | 10 | 银行账户管理 |
| eventAccountService | 5 | 活动账户管理 |
| autoMatchService | 3 | 自动匹配类别 |

---

## ✅ 分析完成

**报告生成时间**: 2025-01-13  
**分析范围**: 财务管理模块 + 活动管理模块  
**架构图**: ✅ 已绘制  
**操作关系图**: ✅ 已绘制  
**数据流图**: ✅ 已绘制  
**组件层次**: ✅ 已绘制  
**业务规则**: ✅ 已总结  

**总结**: 两个模块紧密集成，财务管理负责所有资金流转，活动管理负责活动生命周期和财务关联。核心服务是 `transactionService` 和 `eventService`。

