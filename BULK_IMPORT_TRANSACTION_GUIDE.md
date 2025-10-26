# 银行交易记录批量粘贴导入功能说明

## 📋 功能位置

### 访问路径
**交易管理页面** → **顶部工具栏** → **"批量导入"** 按钮

### 页面位置
- **文件**：`src/modules/finance/pages/TransactionManagementPage/index.tsx`
- **按钮位置**：第2868行
- **Modal 组件**：第3077-3234行

---

## 🎯 功能概述

批量粘贴导入功能允许用户快速从 Excel 或其他表格软件粘贴多条银行交易记录，一次性导入系统。

---

## 🔧 功能特点

### 1️⃣ 多种输入方式
- **方式一**：直接从 Excel 表格粘贴（Tab分隔）
- **方式二**：手动添加行（点击"添加一行"按钮）
- **方式三**：在文本框中直接粘贴

### 2️⃣ 数据格式要求

#### 粘贴格式（Tab分隔）
```
日期	主描述	副描述	支出	收入
2025-01-15	会员费	续会费	0	350.00
2025-01-16	活动报名费	年会	0	100.00
```

#### 列顺序
1. **日期**（可选，默认为今天）
2. **主描述**（必填）
3. **副描述**（可选）
4. **支出**（金额，留空或填0表示无支出）
5. **收入**（金额，留空或填0表示无收入）

**说明**：系统会自动根据支出或收入列的值来判断交易类型。如果支出列有值（>0），则为支出交易；如果收入列有值（>0），则为收入交易。

### 3️⃣ 字段配置

在 Modal 中可以编辑以下字段：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **统一设置** | | | | |
| 银行账户 | 下拉 | ✅ | 第一个账户 | 批量导入所有记录统一使用 |
| **每行数据** | | | | |
| 日期 | 日期 | ❌ | 今天 | 交易日期 |
| 主描述 | 文本 | ✅ | - | 交易主描述 |
| 副描述 | 文本 | ❌ | - | 交易副描述 |
| 支出 | 数字 | ❌ | 0 | 支出金额 |
| 收入 | 数字 | ❌ | 0 | 收入金额 |
| 类型 | 下拉 | ❌ | 自动 | 根据支出/收入自动判断 |
| 主类别 | 下拉 | ❌ | 会员费用 | 会员费用/活动财务/日常账户 |

---

## 📝 使用步骤

### Step 1: 打开批量导入
1. 进入"交易管理"页面
2. 点击顶部工具栏的 **"批量导入"** 按钮
3. Modal 弹出

### Step 2: 粘贴数据
- **方式A（推荐）**：从 Excel 复制，粘贴到文本框中
- **方式B**：点击"添加一行"手动添加

### Step 3: 编辑数据
在表格中可以：
- 修改任意字段的值
- 选择交易类型（收入/支出）
- 选择主类别
- 选择银行账户
- 删除不需要的行

### Step 4: 确认导入
1. 点击 **"确认导入"** 按钮
2. 系统验证数据完整性
3. 显示导入结果（成功/失败数量）

---

## 🔍 数据解析逻辑

### 解析函数：`parseBulkImportText(text: string)`

```typescript
const parseBulkImportText = (text: string) => {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const defaultBankAccount = bankAccounts[0]?.id || '';
  
  const items = lines.map((line, index) => {
    const parts = line.split('\t').map(p => p.trim());
    
    // 新的列顺序：日期、主描述、副描述、支出、收入
    const dateStr = parts[0] || '';
    const mainDescription = parts[1] || '';
    const subDescription = parts[2] || '';
    const expenseStr = parts[3] || '0';
    const incomeStr = parts[4] || '0';
    
    // 解析金额（支出或收入）
    const expense = parseFloat(expenseStr) || 0;
    const income = parseFloat(incomeStr) || 0;
    const amount = expense > 0 ? expense : income;
    const transactionType = expense > 0 ? 'expense' : 'income';
    
    // 解析日期
    let transactionDate = dateStr;
    if (!transactionDate || transactionDate === '') {
      transactionDate = dayjs().format('YYYY-MM-DD');
    }
    
    return {
      key: `bulk-${Date.now()}-${index}`,
      transactionType: transactionType as 'income' | 'expense',
      category: 'member-fees',
      mainDescription,
      subDescription,
      payerPayee: '',
      amount: amount,
      transactionDate: transactionDate,
      bankAccountId: defaultBankAccount,
    };
  });
  
  setBulkImportData(items);
  setBulkImportText('');
};
```

### 解析规则
- 按 **`\n`** 分行
- 按 **`\t`** 分列（Tab字符）
- 自动去除首尾空格
- 空行自动跳过
- 自动判断交易类型：支出列>0为支出，收入列>0为收入
- 日期为空时默认为今天

---

## ✅ 数据验证

### 导入前验证
系统会检查：
- ✅ **统一设置**：必须选择银行账户（在Modal顶部）
- ✅ **每行数据**：主描述不能为空
- ✅ **每行数据**：金额必须大于 0（支出或收入）

### 验证失败提示
```
请选择银行账户（验证统一设置）
有 X 行数据不完整（主描述、金额必填，且金额需大于0）（验证每行数据）
```

---

## 💾 导入逻辑

### 导入函数：`handleBulkImportSubmit()`

```typescript
for (const item of bulkImportData) {
  try {
    await createTransaction({
      transactionType: item.transactionType,
      category: item.category,
      mainDescription: item.mainDescription,
      subDescription: item.subDescription,
      payerPayee: item.payerPayee,
      amount: item.amount,
      transactionDate: item.transactionDate,
      bankAccountId: item.bankAccountId,
    }, user.id);
    successCount++;
  } catch (error) {
    console.error('Failed to import row:', item, error);
    failCount++;
  }
}
```

### 导入结果
- 显示成功数量：`成功导入 X 条交易记录`
- 显示失败数量：`X 条记录导入失败`
- 失败记录不影响成功记录

---

## 📊 UI 界面

### Modal 布局
```
┌─────────────────────────────────────────────┐
│  批量导入交易记录                        ×  │
├─────────────────────────────────────────────┤
│  * 银行账户：[下拉选择]                    │
├─────────────────────────────────────────────┤
│  💡 提示：可直接粘贴Excel表格数据...       │
│  ┌───────────────────────────────────────┐ │
│  │  在此粘贴表格数据...                  │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│  [+ 添加一行]                              │
├─────────────────────────────────────────────┤
│  ┌───┬───┬───┬───┬───┬───┬───┬───┐        │
│  │主描│副描│付款│金额│日期│类型│类别│操作│ │
│  ├───┼───┼───┼───┼───┼───┼───┼───┤        │
│  │... │... │... │... │... │... │... │🗑️  │ │
│  └───┴───┴───┴───┴───┴───┴───┴───┘        │
├─────────────────────────────────────────────┤
│                  [取消]  [确认导入]         │
└─────────────────────────────────────────────┘
```

---

## 🎨 UI 组件

### 使用的 Ant Design 组件
- `Modal` - 弹窗容器
- `Table` - 数据表格
- `Input.TextArea` - 粘贴文本框
- `Input` - 描述/付款人输入
- `InputNumber` - 金额输入
- `DatePicker` - 日期选择
- `Select` - 下拉选择
- `Button` - 按钮

---

## 💡 使用技巧

### 技巧1：Excel 复制粘贴
1. 在 Excel 中选择包含数据的行（不包括表头）
2. 复制（Ctrl+C）
3. 直接粘贴到文本框中
4. 系统自动解析并填充表格

### 技巧2：批量设置相同值
- 每行可以独立选择交易类型、主类别、银行账户
- 适合批量导入不同类型的数据

### 技巧3：删除错误行
- 点击每一行最右侧的删除图标（🗑️）
- 只删除当前行，不影响其他行

---

## ⚠️ 注意事项

1. **日期格式**：使用 `YYYY-MM-DD` 格式（如：2025-01-15），留空默认为今天
2. **金额格式**：只接受数字，不能包含货币符号
3. **Tab 分隔**：粘贴时必须是 Tab 字符分隔，不是空格
4. **统一银行账户**：在Modal顶部选择一次，所有记录将使用同一个银行账户
5. **必填字段**：主描述、金额（支出或收入必须有一个>0）是必填的
6. **交易类型**：系统根据支出/收入列自动判断，无需手动选择
7. **失败回滚**：如果某条记录导入失败，不会影响其他记录
8. **列顺序**：必须严格按照"日期、主描述、副描述、支出、收入"的顺序

---

## 🔗 相关代码

### 主要函数
- `handleOpenBulkImport()` - 打开批量导入 Modal
- `parseBulkImportText()` - 解析粘贴文本
- `handleTextPaste()` - 处理粘贴事件
- `handleBulkDataChange()` - 更新某行数据
- `handleDeleteBulkRow()` - 删除行
- `handleBulkImportSubmit()` - 提交导入

### 相关状态
- `bulkImportVisible` - Modal 显示状态
- `bulkImportText` - 粘贴的原始文本
- `bulkImportData` - 解析后的表格数据

---

## 📅 最后更新

- **创建日期**：2025-01-13
- **版本**：1.0
- **作者**：AI Assistant
