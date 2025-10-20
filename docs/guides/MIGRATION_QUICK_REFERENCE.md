# 🚀 数据迁移快速参考卡

**迁移**: subCategory → txAccount  
**日期**: 2025-10-19

---

## ⚡ 快速命令

```bash
# 1️⃣ 备份数据（必须！）
npm run backup:firestore

# 2️⃣ 预览迁移（推荐）
npm run migrate:subcategory:dry

# 3️⃣ 执行迁移
npm run migrate:subcategory

# 4️⃣ 验证功能
# 手动测试应用

# 5️⃣ 回滚（如需要）
npm run migrate:subcategory:rollback
```

---

## 📊 预期结果

### Dry Run 输出
```
🔍 DRY RUN: 966 documents would be migrated
  - transactions: 856
  - member_fees: 95
  - event_financial_records: 10
  - general_financial_records: 5
```

### 迁移输出
```
✅ SUCCESS: 966 documents migrated successfully!
💡 Old 'subCategory' fields are still present for safety
```

---

## ⚠️ 重要提示

### ✅ DO
- ✅ 先运行 `backup:firestore`
- ✅ 先运行 `migrate:subcategory:dry`
- ✅ 在低峰期执行
- ✅ 验证后再移除旧字段

### ❌ DON'T
- ❌ 不要跳过备份
- ❌ 不要跳过 dry-run
- ❌ 不要在高峰期执行
- ❌ 不要立即删除旧字段

---

## 🔄 迁移流程图

```
开始
  ↓
备份数据 (npm run backup:firestore)
  ↓
预览迁移 (npm run migrate:subcategory:dry)
  ↓
检查输出 → 有问题? → 修复 → 重新预览
  ↓ 无问题
执行迁移 (npm run migrate:subcategory)
  ↓
测试应用
  ↓
功能正常? → 否 → 回滚 (npm run migrate:subcategory:rollback)
  ↓ 是
观察 7 天
  ↓
移除旧字段 (npm run migrate:subcategory -- --remove-old)
  ↓
完成
```

---

## 🆘 紧急回滚

```bash
# 方法 1: 使用回滚脚本（快速）
npm run migrate:subcategory:rollback

# 方法 2: 从备份恢复（完整）
firebase firestore:import gs://your-bucket/backup-path
```

---

## 📞 联系支持

遇到问题？查看完整文档：
- [详细迁移指南](docs/guides/DATA_MIGRATION_SUBCATEGORY_TO_TXACCOUNT.md)
- [故障排查](TROUBLESHOOTING.md)

---

**⏱️ 预计总时间**: 15-30 分钟  
**🛡️ 风险等级**: 中等（可回滚）  
**📋 准备工作**: 5 分钟  
**⚙️ 执行时间**: 5-10 分钟  
**✅ 验证时间**: 5-10 分钟

