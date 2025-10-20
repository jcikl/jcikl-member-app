# Firestore Collection Names Rename Guide
# Firestore 集合名称重命名指南

## 📋 概述 (Overview)

为了更规范和统一地管理 Firestore 集合命名，将所有财务相关集合统一使用 `fin_` 前缀，并将活动相关的集合从 `events` 重命名为 `projects`。

**重命名日期**: 2025-10-20  
**版本**: v4.0

---

## 🎯 集合重命名映射 (Collection Renaming Mapping)

| # | 旧集合名称 (Old) | 新集合名称 (New) | 说明 (Description) |
|---|-----------------|-----------------|-------------------|
| 1 | `transactions` | `fin_transactions` | 交易记录 |
| 2 | `transactionPurposes` | `fin_txPurpose` | 交易用途/目的 |
| 3 | `financeEvents` | `fin_projects` | 财务项目（活动财务分类）|
| 4 | `financialCategories` | `fin_txCat` | 财务交易类别 |
| 5 | `financialRecords` | `fin_records` | 财务记录 |
| 6 | `eventAccounts` | `projectAccounts` | 项目专用财务账户 |
| 7 | `events` | `projects` | 活动/项目主表 |

---

## 📦 影响范围 (Impact Scope)

### 1. 代码更改 (Code Changes)

#### ✅ 已自动更新的文件：
- `src/config/globalCollections.ts` - 集合名称定义
- `firestore.rules` - 安全规则（7 处）
- `firestore.indexes.json` - 索引配置（5 处）
- 所有源代码 - 因使用 `GLOBAL_COLLECTIONS.*` 常量，无需修改

#### ✅ 已移除的临时文件：
- `src/components/admin/DataInitializer.tsx`
- `src/pages/UpdateFinancialRecordsPayerInfoPage.tsx`

#### ✅ 已更新的文件：
- `src/modules/system/pages/GlobalSettingsPage/index.tsx`
- `src/pages/InitializationPage.tsx`
- `src/routes/index.tsx`

### 2. 数据库更改 (Database Changes)

**⚠️ 重要：数据迁移需要手动执行！**

---

## 🚀 迁移步骤 (Migration Steps)

### 步骤 1: 备份数据 (Backup Data)

```bash
# 备份整个 Firestore 数据库
npm run backup:firestore
```

### 步骤 2: 预览迁移 (Preview Migration - Dry Run)

```bash
# 预览模式：查看将要迁移的数据，不执行实际操作
npm run migrate:collections:dry
```

**预期输出示例：**
```
🔍 [DRY RUN MODE] 预览模式 - 不会执行实际操作

📋 迁移计划:
   1. transactions → fin_transactions
   2. transactionPurposes → fin_txPurpose
   3. financeEvents → fin_projects
   4. financialCategories → fin_txCat
   5. financialRecords → fin_records
   6. eventAccounts → projectAccounts
   7. events → projects

🔄 [transactions] → [fin_transactions]
   📊 获取 [transactions] 集合数据...
   ✅ 找到 166 条记录
   🔍 [DRY RUN] 将复制 166 条记录到 [fin_transactions]
   📄 示例文档 ID: doc1, doc2, doc3...
```

### 步骤 3: 执行迁移 (Execute Migration)

```bash
# ⚠️ 警告：此操作将执行实际的数据复制
npm run migrate:collections
```

**迁移过程：**
1. 自动创建备份文件（保存在 `backups/collection-migration/` 目录）
2. 检查目标集合是否已有数据（如有则询问是否覆盖）
3. 分批复制数据（每批 500 条）
4. 显示进度和完成状态

**预期输出示例：**
```
⚠️  [PRODUCTION MODE] 生产模式 - 将执行实际迁移操作

🔄 [transactions] → [fin_transactions]
   📊 获取 [transactions] 集合数据...
   ✅ 找到 166 条记录
   💾 创建备份...
   ✅ 备份已保存: backups/collection-migration/transactions_2025-10-20T10-30-00-000Z.json
   📝 开始复制数据...
   ✅ 已复制 166/166 条记录
   🎉 [transactions] 迁移完成！

📊 统计:
   - 成功: 7/7
   - 总文档数: 296
   - 已复制: 296

✅ 迁移完成！
```

### 步骤 4: 验证数据 (Verify Data)

#### 4.1 在 Firebase Console 验证

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 进入 Firestore Database
3. 检查新集合是否存在：
   - ✅ `fin_transactions`
   - ✅ `fin_txPurpose`
   - ✅ `fin_projects`
   - ✅ `fin_txCat`
   - ✅ `fin_records`
   - ✅ `projectAccounts`
   - ✅ `projects`

4. 对比文档数量：
   ```
   旧集合文档数 == 新集合文档数
   ```

#### 4.2 在应用中验证

1. 部署前端代码更新：
   ```bash
   npm run build
   # 部署到 Netlify 或其他平台
   ```

2. 部署 Firestore 规则和索引：
   ```bash
   npm run firebase:deploy:all
   ```

3. 测试关键功能：
   - ✅ 交易记录查询和创建
   - ✅ 财务报表生成
   - ✅ 活动管理
   - ✅ 财务分类管理

### 步骤 5: 清理旧集合 (Cleanup Old Collections)

**⚠️ 警告：只有在确认新集合运行正常后才执行此步骤！**

建议等待 **1-2 周** 后再删除旧集合。

#### 手动删除（推荐）

在 Firebase Console 中手动删除旧集合：
1. Firestore Database > 选择旧集合
2. 点击右上角的菜单 → Delete collection

#### 自动删除（需额外脚本）

可选：创建清理脚本删除旧集合。

---

## 🔄 回滚操作 (Rollback)

如果迁移后发现问题，可以回滚到旧集合：

```bash
# 回滚：从新集合复制数据回旧集合
npm run migrate:collections:rollback
```

**回滚过程：**
1. 从新集合读取数据
2. 复制回旧集合
3. 不会删除新集合（需要手动删除）

---

## 📊 命名规范 (Naming Convention)

### 财务域集合前缀 (Finance Domain)

所有财务相关集合使用 `fin_` 前缀：

- `fin_transactions` - 交易记录
- `fin_txPurpose` - 交易用途
- `fin_projects` - 财务项目
- `fin_txCat` - 交易类别
- `fin_records` - 财务记录

### 简写规则 (Abbreviation Rules)

- `tx` = transaction (交易)
- `Cat` = Category (类别)
- `Purpose` = 用途/目的

---

## 🎯 最佳实践 (Best Practices)

### 1. 始终使用全局配置常量

✅ **正确做法：**
```typescript
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';

const transactionsRef = collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS);
```

❌ **错误做法：**
```typescript
// 硬编码集合名称
const transactionsRef = collection(db, 'transactions');
```

### 2. 迁移前的准备清单

- [ ] 完整备份 Firestore 数据库
- [ ] 在测试环境执行预览（dry-run）
- [ ] 通知团队成员计划的迁移时间
- [ ] 准备回滚方案
- [ ] 确保有足够的 Firestore 配额

### 3. 迁移后的验证清单

- [ ] 检查新集合文档数量
- [ ] 测试所有 CRUD 操作
- [ ] 检查 Firestore 索引是否正常
- [ ] 验证安全规则是否生效
- [ ] 监控应用错误日志

---

## 🐛 常见问题 (Troubleshooting)

### Q1: 迁移脚本报错：`serviceAccountKey.json 文件不存在`

**解决方案：**
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. Project Settings > Service Accounts
3. 点击 "Generate New Private Key"
4. 下载 JSON 文件并重命名为 `serviceAccountKey.json`
5. 放置在项目根目录

### Q2: 目标集合已有数据

**解决方案：**
- 迁移脚本会询问是否覆盖
- 输入 `yes` 覆盖，或 `no` 取消操作
- 建议：先备份现有数据

### Q3: 迁移后应用报错：`Collection not found`

**原因：**
- Firestore 规则和索引未部署

**解决方案：**
```bash
npm run firebase:deploy:all
```

### Q4: 数据不完整或丢失

**解决方案：**
1. 立即执行回滚：
   ```bash
   npm run migrate:collections:rollback
   ```
2. 从备份文件恢复数据
3. 检查迁移日志，排查问题
4. 重新执行迁移

---

## 📝 技术细节 (Technical Details)

### 迁移脚本特性

- ✅ 支持 Dry-Run 模式（预览）
- ✅ 自动创建备份
- ✅ 批处理（每批 500 条）
- ✅ 进度显示
- ✅ 错误处理
- ✅ 回滚支持
- ✅ 使用 Firebase Admin SDK

### 备份文件位置

```
backups/collection-migration/
├── transactions_2025-10-20T10-30-00-000Z.json
├── transactionPurposes_2025-10-20T10-30-05-123Z.json
├── financeEvents_2025-10-20T10-30-10-456Z.json
├── financialCategories_2025-10-20T10-30-15-789Z.json
├── financialRecords_2025-10-20T10-30-20-012Z.json
├── eventAccounts_2025-10-20T10-30-25-345Z.json
└── events_2025-10-20T10-30-30-678Z.json
```

### 性能考虑

- **批处理大小**: 500 条/批
- **预估时间**: ~1 分钟/1000 条记录
- **并发控制**: 顺序处理（避免配额限制）

---

## 📞 支持 (Support)

如遇问题，请参考：
1. 查看迁移日志文件
2. 检查 Firebase Console 的 Firestore 状态
3. 查看 [故障排查文档](../TROUBLESHOOTING.md)
4. 联系技术支持团队

---

## 📅 更新记录 (Change Log)

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2025-10-20 | v4.0 | 执行集合重命名迁移 |
| 2025-01-13 | v3.0 | 项目清理和文档重组 |
| 2025-01-13 | v2.0 | 初始系统上线 |

---

**重要提示：** 
- 迁移操作不可逆，请务必提前备份！
- 建议在非业务高峰期执行迁移
- 迁移前请通知所有团队成员

**项目版本**: v4.0  
**最后更新**: 2025-10-20

