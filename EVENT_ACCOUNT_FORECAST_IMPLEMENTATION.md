# 活动账户管理 - 预测标签页完整实施指南

## 📊 已完成的组件和服务

### ✅ 核心组件（3个）
1. `src/modules/event/components/ActivityFinancialPlan/` - 活动财务计划管理
2. `src/modules/event/components/BankTransactionList/` - 银行交易记录列表
3. `src/modules/event/components/AccountConsolidation/` - 户口核对与差异分析

### ✅ 系统设置
1. `src/modules/system/pages/FinancialCategoryManagementPage/` - 财务类别管理页面
2. `src/modules/system/services/financialCategoryService.ts` - 财务类别服务

### ✅ 服务层
1. `src/modules/event/services/eventAccountPlanService.ts` - 财务计划CRUD服务

### ✅ 数据库集合
1. `EVENT_ACCOUNT_PLANS` - 存储财务计划数据
2. `FINANCIAL_CATEGORIES` - 存储收入/支出类别定义

---

## 🔄 需要手动完成的集成步骤

### 步骤1：更新路由配置

**文件**: `src/routes/index.tsx`

添加财务类别管理路由：

```typescript
import FinancialCategoryManagementPage from '@/modules/system/pages/FinancialCategoryManagementPage';

// 在路由配置中添加
{
  path: '/settings/financial-categories',
  element: <FinancialCategoryManagementPage />,
}
```

### 步骤2：更新侧边栏菜单

**文件**: `src/layouts/MainLayout/Sidebar.tsx`

在"系统设置"菜单下添加：

```typescript
{
  key: 'settings',
  icon: <SettingOutlined />,
  label: '系统设置',
  children: [
    {
      key: '/settings/global',
      label: '全局配置',
    },
    {
      key: '/settings/financial-categories',  // 新增
      label: '财务类别管理',                    // 新增
    },
  ],
}
```

### 步骤3：更新 ActivityFinancialPlan 组件

**文件**: `src/modules/event/components/ActivityFinancialPlan/index.tsx`

#### 3.1 替换硬编码类别为动态加载

在组件顶部添加：

```typescript
import { getActiveIncomeCategories, getActiveExpenseCategories } from '@/modules/system/services/financialCategoryService';

// 替换原有的 INCOME_CATEGORIES 和 EXPENSE_CATEGORIES
const [incomeCategories, setIncomeCategories] = useState<Array<{label: string; value: string}>>([]);
const [expenseCategories, setExpenseCategories] = useState<Array<{label: string; value: string}>>([]);

useEffect(() => {
  loadCategories();
}, []);

const loadCategories = async () => {
  try {
    const [income, expense] = await Promise.all([
      getActiveIncomeCategories(),
      getActiveExpenseCategories(),
    ]);
    setIncomeCategories(income);
    setExpenseCategories(expense);
  } catch (error) {
    message.error('加载类别失败');
  }
};
```

#### 3.2 添加新状态选项

找到状态选择部分，更新为：

```typescript
<Form.Item name="status" label="状态">
  <Select>
    <Option value="planned">计划中</Option>
    <Option value="pending-approval">待审批</Option>  {/* 新增 */}
    <Option value="confirmed">已确认</Option>
    <Option value="completed">已完成</Option>
    <Option value="cancelled">已取消</Option>  {/* 新增 */}
  </Select>
</Form.Item>
```

#### 3.3 添加批量粘贴导入功能

在组件中添加新的状态和函数：

```typescript
const [bulkPasteVisible, setBulkPasteVisible] = useState(false);
const [bulkPasteText, setBulkPasteText] = useState('');

const handleBulkPaste = () => {
  setBulkPasteVisible(true);
};

const parseBulkPasteData = (text: string): Array<Partial<FinancialPlanItem>> => {
  const lines = text.trim().split('\n');
  const items: Array<Partial<FinancialPlanItem>> = [];
  
  lines.forEach(line => {
    // 支持制表符分隔（从Excel复制）
    const parts = line.split('\t').map(p => p.trim());
    
    if (parts.length >= 3) {
      items.push({
        description: parts[0],
        remark: parts[1] || '',
        amount: parseFloat(parts[2]) || 0,
        expectedDate: parts[3] || new Date().toISOString(),
      });
    }
  });
  
  return items;
};

const handleBulkPasteSubmit = async () => {
  try {
    const items = parseBulkPasteData(bulkPasteText);
    
    if (items.length === 0) {
      message.warning('没有有效的数据');
      return;
    }
    
    // 批量添加
    for (const item of items) {
      await onAdd({
        type: activeTab,
        category: 'other-income', // 默认类别，需要用户后续调整
        ...item,
        status: 'planned',
      } as any);
    }
    
    message.success(`成功导入 ${items.length} 条记录`);
    setBulkPasteVisible(false);
    setBulkPasteText('');
    await onRefresh();
  } catch (error) {
    message.error('导入失败');
  }
};
```

在Extra按钮组中添加：

```typescript
<Button
  icon={<ImportOutlined />}
  onClick={handleBulkPaste}
>
  批量粘贴
</Button>
```

添加模态框：

```typescript
<Modal
  title="批量粘贴导入"
  open={bulkPasteVisible}
  onOk={handleBulkPasteSubmit}
  onCancel={() => setBulkPasteVisible(false)}
  width={800}
>
  <p>从Excel复制数据后粘贴到下方（支持制表符分隔）</p>
  <p>格式：描述 | 备注 | 金额 | 预计日期（可选）</p>
  <TextArea
    value={bulkPasteText}
    onChange={(e) => setBulkPasteText(e.target.value)}
    rows={10}
    placeholder="正式会员报名	预计30人	3000	2025-02-15
访客报名	预计20人	2400	2025-02-15"
  />
</Modal>
```

### 步骤4：更新 BankTransactionList 显示更多字段

**文件**: `src/modules/event/components/BankTransactionList/index.tsx`

在 `BankTransaction` 接口中添加字段（如果还没有）：

```typescript
export interface BankTransaction {
  // ... 现有字段
  payerPayee?: string;        // 付款人/收款人
  paymentMethod?: string;     // 付款方式
  receiptNumber?: string;     // 收据号码
  invoiceNumber?: string;     // 发票号码
}
```

在columns中添加新列：

```typescript
{
  title: '付款人/收款人',
  dataIndex: 'payerPayee',
  ellipsis: true,
  render: (text: string) => text || '-',
},
{
  title: '付款方式',
  dataIndex: 'paymentMethod',
  width: 100,
  render: (text: string) => text || '-',
},
{
  title: '收据号',
  dataIndex: 'receiptNumber',
  width: 120,
  ellipsis: true,
  render: (text: string) => text || '-',
},
```

### 步骤5：实现方案C - relatedEventId 字段

**文件**: `src/modules/finance/types/index.ts`

在 Transaction 接口中添加：

```typescript
export interface Transaction extends BaseEntity {
  // ... 现有字段
  relatedEventId?: string;     // 关联的活动ID
  relatedEventName?: string;   // 关联的活动名称（冗余字段，便于显示）
}
```

**文件**: `src/modules/finance/services/transactionService.ts`

更新查询函数支持按活动ID筛选：

```typescript
export const getTransactionsByEventId = async (eventId: string): Promise<Transaction[]> => {
  try {
    const q = query(
      collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
      where('relatedEventId', '==', eventId),
      orderBy('transactionDate', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Transaction));
  } catch (error: any) {
    globalSystemService.log('error', 'Failed to get transactions by event', 'transactionService', { error, eventId });
    throw error;
  }
};
```

### 步骤6：实现方案4 - 类别混合匹配

创建新文件：`src/modules/event/services/categoryMappingService.ts`

```typescript
/**
 * Category Mapping Service
 * 类别映射服务（自动匹配 + 人工确认）
 */

// 关键词映射规则
const CATEGORY_MAPPING = {
  // 收入类别关键词
  income: {
    ticket: ['报名', '票务', '参加费', '注册', 'registration', 'ticket'],
    sponsorship: ['赞助', 'sponsor', 'donation', '捐赠'],
    donation: ['捐款', '捐献', '善款'],
  },
  // 支出类别关键词
  expense: {
    venue: ['场地', '租金', '会议室', 'venue', 'rental', 'hall'],
    food: ['餐饮', '午餐', '茶点', '饮料', 'food', 'catering', 'lunch'],
    marketing: ['宣传', '广告', '海报', 'marketing', 'promotion', 'banner'],
    equipment: ['设备', '租赁', '音响', '投影', 'equipment', 'projector'],
    materials: ['物料', '印刷', '讲义', 'materials', 'printing'],
    transportation: ['交通', '车费', '油费', 'transport', 'petrol'],
  },
};

export const autoMatchCategory = (
  description: string,
  type: 'income' | 'expense'
): { category: string | null; confidence: number; matchedKeyword: string | null } => {
  const lowerDesc = description.toLowerCase();
  const categories = CATEGORY_MAPPING[type];
  
  let bestMatch: { category: string; confidence: number; keyword: string } | null = null;
  
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        const confidence = keyword.length / description.length; // 简单的置信度计算
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { category, confidence, keyword };
        }
      }
    }
  }
  
  return {
    category: bestMatch?.category || null,
    confidence: bestMatch?.confidence || 0,
    matchedKeyword: bestMatch?.keyword || null,
  };
};

// 批量匹配
export const batchAutoMatchCategories = (
  transactions: Array<{ id: string; description: string; transactionType: 'income' | 'expense' }>
) => {
  return transactions.map(txn => ({
    ...txn,
    matchResult: autoMatchCategory(txn.description, txn.transactionType),
    needsReview: true, // 默认需要审核
  }));
};
```

### 步骤7：集成到 EventAccountManagementPage

**文件**: `src/modules/event/pages/EventAccountManagementPage/index.tsx`

完整替换"预测"标签页内容：

```typescript
import ActivityFinancialPlan from '../../components/ActivityFinancialPlan';
import BankTransactionList from '../../components/BankTransactionList';
import AccountConsolidation from '../../components/AccountConsolidation';
import { 
  getEventAccountPlans, 
  addEventAccountPlan,
  updateEventAccountPlan,
  deleteEventAccountPlan,
  getEventAccountPlanStats,
} from '../../services/eventAccountPlanService';
import { getTransactionsByEventId } from '@/modules/finance/services/transactionService';
import type { FinancialPlanItem } from '../../components/ActivityFinancialPlan';
import type { BankTransaction } from '../../components/BankTransactionList';
import type { ConsolidationData } from '../../components/AccountConsolidation';

// 在组件中添加状态
const [planItems, setPlanItems] = useState<FinancialPlanItem[]>([]);
const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
const [consolidationData, setConsolidationData] = useState<ConsolidationData | null>(null);
const [loading, setLoading] = useState(false);

// 加载财务计划
const loadPlans = async () => {
  if (!account) return;
  
  try {
    setLoading(true);
    const plans = await getEventAccountPlans(account.id);
    setPlanItems(plans);
  } catch (error) {
    message.error('加载财务计划失败');
  } finally {
    setLoading(false);
  }
};

// 加载银行交易记录（使用方案C - relatedEventId）
const loadBankTransactions = async () => {
  if (!selectedEventId) return;
  
  try {
    const transactions = await getTransactionsByEventId(selectedEventId);
    setBankTransactions(transactions as any);
  } catch (error) {
    message.error('加载交易记录失败');
  }
};

// 计算对比数据
const calculateConsolidation = () => {
  if (planItems.length === 0) return;
  
  // 按类别分组计算
  const incomeComparison = calculateCategoryComparison(
    planItems.filter(p => p.type === 'income'),
    bankTransactions.filter(t => t.transactionType === 'income')
  );
  
  const expenseComparison = calculateCategoryComparison(
    planItems.filter(p => p.type === 'expense'),
    bankTransactions.filter(t => t.transactionType === 'expense')
  );
  
  // ... 设置 consolidationData
};

// CRUD handlers
const handleAddPlan = async (item: any) => {
  if (!account || !user) return;
  await addEventAccountPlan(account.id, item, user.id);
  await loadPlans();
};

const handleUpdatePlan = async (id: string, updates: any) => {
  if (!user) return;
  await updateEventAccountPlan(id, updates, user.id);
  await loadPlans();
};

const handleDeletePlan = async (id: string) => {
  if (!user) return;
  await deleteEventAccountPlan(id, user.id);
  await loadPlans();
};

// 在 useEffect 中加载数据
useEffect(() => {
  if (account && selectedEventId) {
    loadPlans();
    loadBankTransactions();
  }
}, [account, selectedEventId]);

useEffect(() => {
  if (planItems.length > 0 || bankTransactions.length > 0) {
    calculateConsolidation();
  }
}, [planItems, bankTransactions]);

// 在"预测"标签页中渲染
{
  key: 'forecast',
  label: '预测',
  children: (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 1. 活动财务计划 */}
      <ActivityFinancialPlan
        accountId={account?.id || ''}
        items={planItems}
        loading={loading}
        onAdd={handleAddPlan}
        onUpdate={handleUpdatePlan}
        onDelete={handleDeletePlan}
        onRefresh={loadPlans}
      />
      
      {/* 2. 银行交易记录 */}
      <BankTransactionList
        accountId={account?.id || ''}
        transactions={bankTransactions}
        loading={loading}
        onRefresh={loadBankTransactions}
      />
      
      {/* 3. 户口核对 */}
      {consolidationData && (
        <AccountConsolidation
          data={consolidationData}
          loading={loading}
        />
      )}
    </Space>
  ),
}
```

---

## 🔒 权限控制实施

在每个操作前检查权限：

```typescript
import { globalPermissionService } from '@/config/globalPermissions';

// 检查是否为活动筹委
const isCommitteeMember = event.committee?.some(c => c.memberId === user.id);

// 检查是否为财务部门
const hasFinancePermission = await globalPermissionService.checkPermission(
  user.id,
  'FINANCE_MANAGEMENT',
  'READ'
);

// 只有活动筹委可以编辑计划
if (!isCommitteeMember) {
  message.error('只有活动筹委可以编辑财务计划');
  return;
}
```

---

## 📊 Firestore 索引配置

添加到 `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "eventAccountPlans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountId", "order": "ASCENDING" },
        { "fieldPath": "expectedDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "relatedEventId", "order": "ASCENDING" },
        { "fieldPath": "transactionDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "financialCategories",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "sortOrder", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 🔥 Firestore 安全规则

添加到 `firestore.rules`:

```javascript
match /eventAccountPlans/{planId} {
  allow read: if isAuthenticated();
  allow create, update: if isAuthenticated() && 
    (isAdmin() || isEventCommittee(resource.data.accountId));
  allow delete: if isAdmin() || isEventCommittee(resource.data.accountId);
}

match /financialCategories/{categoryId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Helper function
function isEventCommittee(accountId) {
  let event = get(/databases/$(database)/documents/events/$(accountId)).data;
  return request.auth.uid in event.committee;
}
```

---

## ✅ 部署清单

1. [ ] 运行类型检查: `npm run type-check`
2. [ ] 部署 Firestore 规则: `firebase deploy --only firestore:rules`
3. [ ] 部署 Firestore 索引: `firebase deploy --only firestore:indexes`
4. [ ] 测试完整流程
5. [ ] 用户培训文档

---

## 🎉 完成！

所有核心功能已实现，请按照上述步骤完成集成和部署。

