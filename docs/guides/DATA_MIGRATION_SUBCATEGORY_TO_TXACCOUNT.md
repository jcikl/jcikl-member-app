# 数据迁移指南：subCategory → txAccount

**迁移日期**: 2025-10-19  
**影响范围**: Firestore 数据库字段重命名  
**风险等级**: ⚠️ 中等（可回滚）

---

## 📋 概述

### 迁移目的
将 Firestore 中的 `subCategory` 字段重命名为 `txAccount`，以提高语义清晰度。

### 字段说明
- **旧字段名**: `subCategory` (二次分类)
- **新字段名**: `txAccount` (交易账户/交易用途)
- **含义**: 用于标识交易的具体用途或账户分类

### 影响的集合
1. `transactions` - 交易主表
2. `member_fees` - 会员费用记录
3. `event_financial_records` - 活动财务记录
4. `general_financial_records` - 日常账户财务记录

---

## ⚠️ 迁移前准备

### 1. 备份数据库（强烈推荐）

#### 方法 1: Firebase Console 导出
```bash
1. 访问 Firebase Console
2. Firestore Database → 导入/导出
3. 选择导出位置（Cloud Storage bucket）
4. 点击"导出"
5. 等待完成并记录导出路径
```

#### 方法 2: Firebase CLI 导出
```bash
# 导出整个数据库
firebase firestore:export gs://your-bucket/backups/2025-10-19-pre-migration

# 导出特定集合
firebase firestore:export gs://your-bucket/backups/2025-10-19-pre-migration \
  --collection-ids transactions,member_fees,event_financial_records,general_financial_records
```

### 2. 验证应用代码已更新
```bash
# 确认所有代码已使用 txAccount
git log --oneline -1
# 应该看到: "refactor: Rename subCategory to txAccount..."

# 运行类型检查
npm run type-check
# 应该: ✅ 通过

# 运行 lint 检查
npm run lint
# 应该: ✅ 通过
```

### 3. 记录当前状态
```bash
# 记录当前 Firestore 文档数量
# 可以在 Firebase Console 查看或运行 dry-run
npm run migrate:subcategory:dry
```

---

## 🚀 执行迁移

### 步骤 1: 预览模式（Dry Run）

**强烈推荐先运行此命令！**

```bash
npm run migrate:subcategory:dry
```

**输出示例**:
```
===============================================================================
🔄 DATA MIGRATION: subCategory → txAccount
===============================================================================

Mode: 🔍 DRY RUN
Remove old field: ❌ No
Collections: 4
Batch size: 500

🚀 Starting migration...

============================================================
📦 Collection: transactions
============================================================
📊 Total documents: 1,234
📝 Documents to migrate: 856

📋 Sample documents (first 3):
   1. ID: abc123
      subCategory: "new-member-fee" → txAccount
   2. ID: def456
      subCategory: "HOPE FOR NATURE 6.0" → txAccount
   3. ID: ghi789
      subCategory: "renewal-fee" → txAccount

🔍 DRY RUN MODE - No changes will be made

============================================================
... (其他集合)
============================================================

📊 MIGRATION REPORT
===============================================================================
┌─────────────────────────┬───────┬──────────┬──────────┬────────┬─────────┐
│ Collection              │ Total │ To Migrate│ Migrated │ Failed │ Skipped │
├─────────────────────────┼───────┼──────────┼──────────┼────────┼─────────┤
│ transactions            │  1234 │      856 │        0 │      0 │     856 │
│ member_fees             │   145 │       95 │        0 │      0 │      95 │
│ event_financial_records │    12 │       10 │        0 │      0 │      10 │
│ general_financial_records│    8 │        5 │        0 │      0 │       5 │
├─────────────────────────┼───────┼──────────┼──────────┼────────┼─────────┤
│ TOTAL                   │  1399 │      966 │        0 │      0 │     966 │
└─────────────────────────┴───────┴──────────┴──────────┴────────┴─────────┘

🔍 DRY RUN: 966 documents would be migrated
===============================================================================
🔍 DRY RUN COMPLETED - No changes were made to the database

💡 To execute migration, run: npm run migrate:subcategory
===============================================================================
```

**检查清单**:
- [ ] 文档数量符合预期
- [ ] Sample 数据看起来正确
- [ ] 没有意外的集合被包含

---

### 步骤 2: 执行迁移（保留旧字段）

**推荐方式：先迁移但保留旧字段**

```bash
npm run migrate:subcategory
```

**交互式确认**:
```
⚠️  WARNING: This will modify production data!

🟡 Are you sure you want to proceed with migration (subCategory → txAccount)? (yes/no): yes

🚀 Starting migration...
```

**输出示例**:
```
============================================================
📦 Collection: transactions
============================================================
📊 Total documents: 1,234
📝 Documents to migrate: 856

🚀 Starting migration...
📦 Processing batch 1/2
✅ Batch committed: 500 documents
📊 Progress: 58.4%
📦 Processing batch 2/2
✅ Batch committed: 356 documents
📊 Progress: 100.0%

✅ Collection migration completed!

... (其他集合)

📊 MIGRATION REPORT
┌─────────────────────────┬───────┬──────────┬──────────┬────────┬─────────┐
│ Collection              │ Total │ To Migrate│ Migrated │ Failed │ Skipped │
├─────────────────────────┼───────┼──────────┼──────────┼────────┼─────────┤
│ transactions            │  1234 │      856 │      856 │      0 │       0 │
│ member_fees             │   145 │       95 │       95 │      0 │       0 │
│ event_financial_records │    12 │       10 │       10 │      0 │       0 │
│ general_financial_records│    8 │        5 │        5 │      0 │       0 │
├─────────────────────────┼───────┼──────────┼──────────┼────────┼─────────┤
│ TOTAL                   │  1399 │      966 │      966 │      0 │       0 │
└─────────────────────────┴───────┴──────────┴──────────┴────────┴─────────┘

✅ SUCCESS: 966 documents migrated successfully!

===============================================================================
✅ MIGRATION COMPLETED

✅ All 'subCategory' fields have been migrated to 'txAccount'

💡 Old 'subCategory' fields are still present for safety
   To remove them, run: npm run migrate:subcategory -- --remove-old
===============================================================================
```

**此时数据状态**:
```javascript
// Firestore 文档同时包含两个字段
{
  id: "abc123",
  category: "member-fees",
  subCategory: "new-member-fee",  // ← 旧字段（保留）
  txAccount: "new-member-fee",    // ← 新字段（新增）
  amount: 480,
  ...
}
```

---

### 步骤 3: 验证迁移结果

#### 3.1 检查应用功能
```
测试清单:
□ 会员费用管理页面
  □ 交易列表正确显示
  □ 左侧筛选卡片显示统计数据
  □ 点击卡片正确筛选
  
□ 交易管理页面
  □ 二次分类列正确显示
  □ 筛选功能正常
  
□ 日常账户页面
  □ 分类功能正常
  
□ 活动财务页面
  □ 活动名称作为 txAccount 正确显示
```

#### 3.2 检查 Firestore 数据
```bash
# 在 Firebase Console 查看任意交易文档
# 应该同时看到 subCategory 和 txAccount 字段
```

#### 3.3 监控 Console 日志
```javascript
// 应该看到新的日志格式
📊 [Component] TxAccount stats calculated: {...}
🔗 [Component] TxAccount card clicked: 'new-member-fee'
```

---

### 步骤 4: 移除旧字段（可选，谨慎！）

**仅在确认一切正常后执行**

```bash
npm run migrate:subcategory -- --remove-old
```

**交互式确认**:
```
🟡 Are you sure you want to proceed with migration? (yes/no): yes

🔴 Are you ABSOLUTELY SURE you want to REMOVE the old field? 
   This cannot be undone! (yes/no): yes
```

**执行后数据状态**:
```javascript
// Firestore 文档只包含新字段
{
  id: "abc123",
  category: "member-fees",
  txAccount: "new-member-fee",  // ← 只保留新字段
  amount: 480,
  ...
}
```

⚠️ **警告**: 移除旧字段后无法自动回滚，只能从备份恢复！

---

## ⏪ 回滚迁移

### 何时需要回滚

- 发现数据迁移错误
- 应用功能异常
- 需要紧急恢复旧版本

### 回滚步骤

#### 方法 1: 使用回滚脚本（推荐）

**仅在未移除旧字段时可用**

```bash
npm run migrate:subcategory:rollback
```

**确认提示**:
```
🔴 Are you sure you want to ROLLBACK (txAccount → subCategory)? (yes/no): yes
```

**输出示例**:
```
⏪ ROLLBACK COMPLETED

✅ Data has been rolled back to 'subCategory' field

💡 txAccount fields are still present
   To remove them, run with --remove-old flag
```

#### 方法 2: 从备份恢复

```bash
# 从 Cloud Storage 恢复
firebase firestore:import gs://your-bucket/backups/2025-10-19-pre-migration
```

**注意**: 这会恢复整个数据库到备份时的状态，会丢失迁移后的所有其他更改！

---

## 🧪 测试场景

### 测试 1: Dry Run
```bash
npm run migrate:subcategory:dry
```
**预期**: 显示统计但不修改数据

### 测试 2: 迁移（保留旧字段）
```bash
npm run migrate:subcategory
```
**预期**: 
- 新增 `txAccount` 字段
- 保留 `subCategory` 字段
- 应用正常工作

### 测试 3: 回滚
```bash
npm run migrate:subcategory:rollback
```
**预期**: 
- 恢复 `subCategory` 为主字段
- 保留 `txAccount` 字段

### 测试 4: 移除旧字段
```bash
npm run migrate:subcategory -- --remove-old
```
**预期**: 只保留 `txAccount` 字段

---

## 📊 迁移统计示例

### 成功迁移
```
✅ SUCCESS: 966 documents migrated successfully!
   - transactions: 856
   - member_fees: 95
   - event_financial_records: 10
   - general_financial_records: 5
```

### 部分失败
```
⚠️  WARNING: 5 documents failed to migrate!
   - transactions: 3 failed
   - member_fees: 2 failed

💡 Check console for error details
💡 Re-run migration to retry failed documents
```

---

## 🔍 故障排查

### 问题 1: 迁移卡住
**原因**: 网络问题或 Firestore 限流  
**解决**: 
```bash
# 等待几分钟后重试
npm run migrate:subcategory
# 脚本会自动跳过已迁移的文档
```

### 问题 2: 部分文档失败
**原因**: 权限不足或字段冲突  
**解决**:
```bash
# 查看 Firebase Console 的错误日志
# 手动修复失败的文档
# 重新运行迁移
```

### 问题 3: 应用功能异常
**原因**: 代码未正确更新或缓存问题  
**解决**:
```bash
# 1. 清除浏览器缓存
# 2. 重新构建应用
npm run build

# 3. 如仍有问题，执行回滚
npm run migrate:subcategory:rollback
```

### 问题 4: TypeScript 类型错误
**原因**: 某些文件未更新  
**解决**:
```bash
# 搜索是否还有遗漏的 subCategory
grep -r "subCategory" src/

# 手动更新遗漏的文件
# 重新运行类型检查
npm run type-check
```

---

## 📝 迁移时间线

### 推荐迁移计划

```
Day 1: 准备阶段
├─ 09:00 - 备份数据库
├─ 09:30 - 运行 dry-run 预览
├─ 10:00 - 验证备份成功
└─ 10:30 - 准备回滚预案

Day 1: 执行阶段（低峰期）
├─ 14:00 - 执行迁移（保留旧字段）
├─ 14:30 - 验证应用功能
├─ 15:00 - 全面测试
└─ 16:00 - 确认迁移成功

Day 2-7: 观察期
├─ 监控应用日志
├─ 收集用户反馈
└─ 验证数据完整性

Day 8+: 清理阶段（可选）
└─ 移除旧字段（如一切正常）
```

---

## 🛡️ 安全机制

### 脚本内置保护

1. **交互式确认** - 执行前需要用户确认
2. **Dry Run 模式** - 默认不修改数据
3. **批量处理** - 分批次处理，避免超时
4. **错误处理** - 单个文档失败不影响整体
5. **进度追踪** - 实时显示迁移进度
6. **详细日志** - 记录所有操作
7. **保留旧字段** - 默认不删除 `subCategory`
8. **可回滚** - 提供回滚功能

### 回滚保障

```
迁移阶段         可回滚方式
─────────────────────────────────────────────
1. Dry Run      无需回滚（未修改数据）
2. 迁移（保留旧字段） ✅ 使用回滚脚本
3. 移除旧字段    ⚠️ 仅能从备份恢复
```

---

## 💻 命令参考

### 完整命令列表

```bash
# 1. 预览迁移（不修改数据）
npm run migrate:subcategory:dry

# 2. 执行迁移（保留旧字段）
npm run migrate:subcategory

# 3. 执行迁移并移除旧字段（危险！）
npm run migrate:subcategory -- --remove-old

# 4. 回滚迁移（txAccount → subCategory）
npm run migrate:subcategory:rollback

# 5. 回滚并移除 txAccount 字段（危险！）
npm run migrate:subcategory:rollback -- --remove-old
```

### 命令参数说明

| 参数 | 说明 | 推荐 |
|------|------|------|
| `--dry-run` | 预览模式，不写入数据 | ✅ 总是先运行 |
| `--rollback` | 回滚模式，txAccount → subCategory | ⚠️ 仅在需要时使用 |
| `--remove-old` | 删除旧字段 | ❌ 谨慎使用 |

---

## 📈 性能预估

### 迁移时间估算

| 文档数量 | 预计时间 | 说明 |
|---------|---------|------|
| < 1,000 | 1-2 分钟 | 快速完成 |
| 1,000 - 10,000 | 5-10 分钟 | 中等规模 |
| 10,000 - 50,000 | 20-30 分钟 | 大规模 |
| > 50,000 | 1+ 小时 | 需要分批处理 |

**影响因素**:
- Firestore 写入速度
- 网络延迟
- 批处理大小 (当前: 500)

---

## ✅ 迁移完成检查清单

### 数据层
- [ ] 所有集合迁移完成
- [ ] 无失败文档
- [ ] 数据完整性验证通过

### 应用层
- [ ] 所有页面功能正常
- [ ] 筛选功能正常工作
- [ ] 统计数据正确显示
- [ ] Console 无错误日志

### 部署层
- [ ] 代码已推送到 GitHub
- [ ] Netlify 自动部署完成
- [ ] 生产环境测试通过

---

## 🔐 权限要求

执行迁移需要：
- ✅ Firestore 读取权限
- ✅ Firestore 写入权限
- ✅ Node.js 环境
- ✅ Firebase 项目访问权限

---

## 📞 支持

### 遇到问题？

1. **查看 Console 错误日志**
2. **运行 dry-run 诊断**
3. **检查 Firebase Console 的 Firestore 规则**
4. **验证网络连接**

### 紧急回滚

```bash
# 立即回滚
npm run migrate:subcategory:rollback

# 或从备份恢复
firebase firestore:import gs://your-backup-path
```

---

## 📚 相关文档

- [Firestore 数据迁移最佳实践](https://firebase.google.com/docs/firestore/manage-data/move-data)
- [批量操作指南](https://firebase.google.com/docs/firestore/manage-data/transactions)

---

**迁移完成时间**: 待执行  
**负责人**: 系统管理员  
**状态**: ⏳ 待执行

---

**⚠️ 请在低峰期执行迁移，并确保已做好完整备份！**

