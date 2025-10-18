# 财务管理模块设置指南

## ✅ 问题已修复

已修复以下错误：
1. ✅ `InputNumber is not defined` - 已添加缺失的导入
2. ✅ `Failed to get fiscal years` - 已创建专门的 `fiscalYears` 集合
3. ✅ 页面在无财年数据时也能正常工作

## 🚀 快速开始

### 方法 1: 使用浏览器控制台 (推荐)

1. 打开浏览器开发者工具 (F12)
2. 进入 Console 标签
3. 粘贴并运行以下代码：

```javascript
// 导入必要的模块
import { collection, addDoc } from 'firebase/firestore';
import { db } from './src/services/firebase';

// 创建 FY2024
const fy2024 = {
  name: 'FY2024',
  year: 2024,
  startDate: '2024-10-01',
  endDate: '2025-09-30',
  status: 'active',
  isDefault: true,
  description: '2024财政年度',
  totalIncome: 0,
  totalExpense: 0,
  netIncome: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

addDoc(collection(db, 'fiscalYears'), fy2024)
  .then((docRef) => console.log('✅ FY2024 创建成功，ID:', docRef.id))
  .catch((error) => console.error('❌ 创建失败:', error));
```

### 方法 2: 通过财年管理页面

1. 访问 `/finance/fiscal-years`
2. 点击 "创建新财年" 按钮
3. 使用快速预设 "10月1日 - 9月30日"
4. 填写信息：
   - 财年名称: `FY2024`
   - 年份: `2024`
   - 状态: 活跃
   - 设为默认: 是
5. 点击确定保存

### 方法 3: 使用初始化脚本

```bash
# 在项目根目录运行
npm run init-fiscal-year
```

或者在代码中导入并调用：

```typescript
import { initializeFiscalYear } from '@/scripts/initializeFiscalYear';

// 在合适的地方调用
initializeFiscalYear();
```

## 📊 Firestore 集合结构

财务模块使用以下集合：

```
fiscalYears/              # 财年管理
  └─ {fiscalYearId}
     ├─ name: "FY2024"
     ├─ year: 2024
     ├─ startDate: "2024-10-01"
     ├─ endDate: "2025-09-30"
     ├─ status: "active"
     ├─ isDefault: true
     └─ ...

transactions/             # 交易记录
bankAccounts/            # 银行账户
budgets/                 # 预算
financialRecords/        # 财务记录（包含会员费用）
```

## 🔗 访问页面

- 财务概览: http://localhost:3000/finance/overview
- 会员费用: http://localhost:3000/finance/member-fees
- 财年管理: http://localhost:3000/finance/fiscal-years

## 📝 Firestore 索引要求

如果遇到索引错误，在 Firebase Console 中创建以下复合索引：

### fiscalYears 集合
1. `isDefault (ASC) + status (ASC)`
2. `status (ASC) + startDate (ASC) + endDate (ASC)`
3. `status (ASC) + year (DESC)`

### transactions 集合
1. `fiscalYear (ASC) + status (ASC) + transactionDate (DESC)`
2. `bankAccountId (ASC) + transactionDate (DESC)`

### financialRecords 集合
1. `type (ASC) + fiscalYear (ASC) + status (ASC)`
2. `type (ASC) + memberId (ASC) + dueDate (DESC)`

或者，将以下内容添加到 `firestore.indexes.json`：

```json
{
  "indexes": [
    {
      "collectionGroup": "fiscalYears",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDefault", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "fiscalYears",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "DESCENDING" }
      ]
    }
  ]
}
```

然后运行：
```bash
firebase deploy --only firestore:indexes
```

## 🎯 下一步

1. ✅ 创建初始财年数据
2. 📊 创建银行账户 (可选)
3. 💰 添加交易记录
4. 👥 管理会员费用
5. 📈 查看财务统计

## 🆘 常见问题

### Q: 为什么看不到财务数据？
A: 请确保已创建至少一个财年。财务模块需要财年作为数据分组的基础。

### Q: 如何修改财年周期？
A: 财年周期默认为 10月1日 - 9月30日（次年），这是 JCI 的标准财年。如需修改，请在创建财年时自定义日期范围。

### Q: 能同时有多个活跃的财年吗？
A: 可以，但建议只设置一个财年为"默认"。默认财年将用于新交易的自动归类。

### Q: 财年数据可以删除吗？
A: 只有草稿状态且没有关联交易的财年可以删除。活跃或已关闭的财年建议归档而不是删除。

## 📞 技术支持

如遇问题，请检查：
1. 浏览器控制台 (F12) 的错误信息
2. Firebase Console 中的 Firestore 数据
3. Firestore 规则是否正确配置
4. 用户是否有适当的权限

---

**版本**: 1.0  
**最后更新**: 2025-10-14  
**维护者**: AI Assistant

