# JCI KL 会员管理系统 - 文档索引

## 📚 文档组织结构

本项目的文档按照功能和用途分类，方便查阅和维护。

---

## 🚀 快速开始

### 必读文档
1. **[项目设置指南](../SETUP.md)** - 环境配置、Firebase 设置、初始化步骤
2. **[快速测试指南](../QUICK_TEST_GUIDE.md)** - 快速验证系统功能
3. **[故障排查](../TROUBLESHOOTING.md)** - 常见问题解决方案
4. **[Firebase 快速开始](../QUICK_START_FIREBASE.md)** - Firebase 项目配置

---

## 📦 部署文档

### Netlify 部署
- **[Netlify 部署指南](deployment/NETLIFY_DEPLOYMENT.md)** - SPA 路由配置、环境变量、部署步骤
- **[服务账户设置](deployment/SERVICE_ACCOUNT_SETUP.md)** - Firebase Admin SDK 配置

### Firebase 配置
- **[Firebase 集成完成报告](guides/FIREBASE_INTEGRATION_COMPLETE.md)** - 集成说明
- **[Firestore 规则更新](guides/FIRESTORE_RULES_UPDATE.md)** - 安全规则配置

---

## 🎯 功能文档

### 会员管理
- **[会员费用管理功能](features/MEMBER_FEE_ALL_MEMBERS_FEATURE.md)** - 会员费用批量管理

### 财务系统
- **[财务模块设置](guides/FINANCE_MODULE_SETUP.md)** - 财务系统架构和配置
- **[交易管理完整指南](guides/TRANSACTION_MANAGEMENT_COMPLETE_GUIDE.md)** - 交易记录、拆分、分类
- **[余额计算实现](guides/RUNNING_BALANCE_IMPLEMENTATION.md)** - 累计余额算法详解
- **[余额 UI 顺序指南](guides/RUNNING_BALANCE_UI_ORDER_GUIDE.md)** - 余额显示逻辑
- **[批量拆分和分类指南](guides/BATCH_SPLIT_AND_CATEGORY_GUIDE.md)** - 批量操作功能
- **[批量操作指南](guides/BULK_OPERATIONS_GUIDE.md)** - 批量处理流程
- **[交易拆分功能](features/TRANSACTION_SPLIT_FEATURE.md)** - 父子交易拆分
- **[交易标签页功能](features/TRANSACTION_TABS_FEATURE.md)** - 多标签页管理
- **[父子交易搜索功能](features/PARENT_CHILD_SEARCH_FEATURE.md)** - 关联搜索
- **[重新拆分更新功能](features/RE_SPLIT_UPDATE_FEATURE.md)** - 拆分后更新
- **[活动财务关系分析](guides/EVENT_FINANCIAL_RELATIONSHIP_ANALYSIS.md)** - 活动与财务关系详解

### 活动管理
- **[活动账户批量输入设计](features/EVENT_ACCOUNT_BULK_INPUT_DESIGN.md)** - 批量财务记录
- **[活动批量分类功能](features/EVENT_BATCH_CLASSIFY_FEATURE.md)** - 批量分类交易
- **[活动详情抽屉功能](features/EVENT_DETAIL_DRAWER_FEATURE.md)** - 侧边详情面板
- **[活动财务分类功能](features/EVENT_FINANCE_CLASSIFICATION_FEATURE.md)** - 财务分类管理
- **[活动预测功能](features/EVENT_FORECAST_FEATURE_COMPLETE.md)** - 活动收支预测
- **[董事会成员活动功能](features/BOARD_MEMBER_EVENT_FEATURE.md)** - 董事会专属功能

### 搜索功能
- **[搜索功能指南](guides/SEARCH_FEATURE_GUIDE.md)** - 全局搜索实现
- **[搜索增强完成报告](guides/SEARCH_ENHANCEMENT_COMPLETE.md)** - 搜索优化总结

### 数据迁移
- **[Firestore 集合重命名指南](guides/FIRESTORE_COLLECTION_RENAME_GUIDE.md)** - 集合名称标准化迁移（v4.0）
- **[迁移快速参考](guides/MIGRATION_QUICK_REFERENCE.md)** - 数据迁移步骤
- **[subCategory 到 txAccount 迁移](guides/DATA_MIGRATION_SUBCATEGORY_TO_TXACCOUNT.md)** - 字段重命名迁移指南

---

## 🔧 修复记录

### 余额相关修复
- **[余额计算修复](fixes/BALANCE_CALCULATION_FIX.md)** - 余额算法修复
- **[余额调试指南](fixes/BALANCE_DEBUGGING_GUIDE.md)** - 调试方法
- **[余额顺序修复](fixes/BALANCE_ORDER_FIX.md)** - 排序问题修复
- **[余额字段移除完成](fixes/BALANCE_FIELD_REMOVAL_COMPLETE.md)** - 清理冗余字段

### 交易相关修复
- **[子交易描述修复](fixes/CHILD_TRANSACTION_DESCRIPTION_FIX.md)** - 描述显示问题
- **[子交易显示诊断](fixes/CHILD_TRANSACTION_DISPLAY_DIAGNOSIS.md)** - 显示问题诊断
- **[子交易显示指南](fixes/CHILD_TRANSACTION_DISPLAY_GUIDE.md)** - 显示逻辑说明
- **[子交易顺序修复](fixes/CHILD_TRANSACTION_ORDER_FIX.md)** - 排序修复
- **[状态字段修复](fixes/STATUS_FIELD_FIX.md)** - 状态管理修复
- **[内存过滤修复](fixes/IN_MEMORY_FILTER_FIX.md)** - 性能优化
- **[银行交易显示修复](fixes/BANK_TRANSACTION_DISPLAY_FIX.md)** - 交易列表显示问题

### UI 相关修复
- **[✅ 输入框背景完全修复](fixes/✅_输入框背景完全修复.md)** - 输入框样式修复
- **[✨ 深色模式阴影优化](fixes/✨_深色模式阴影优化.md)** - 深色模式改进
- **[🎯 布局组件完整修复](fixes/🎯_布局组件完整修复.md)** - 布局问题修复
- **[活动页面修复](fixes/EVENT_PAGES_FIX.md)** - 活动页面问题修复

### 清理和重构
- **[清理最终总结](fixes/CLEANUP_FINAL_SUMMARY.md)** - 代码清理总结
- **[数据工具清理完成](fixes/DATA_TOOLS_CLEANUP_COMPLETE.md)** - 工具清理
- **[位置和余额清理完成](fixes/POSITION_AND_BALANCE_CLEANUP_COMPLETE.md)** - 字段清理

---

## 🧪 测试和监控

- **[快速测试指南](../QUICK_TEST_GUIDE.md)** - 功能测试步骤
- **[性能监控](guides/PERFORMANCE_MONITORING.md)** - 性能监控指标
- **[验证最终报告](guides/VERIFICATION_FINAL_REPORT.md)** - 验证测试报告
- **[UI 检查清单](guides/UI_CHECKLIST.md)** - UI 验证清单

---

## 📊 架构和设计

### 数据模型
- **[会员 Firestore 数据模型](guides/MEMBER_FIRESTORE_SCHEMA.md)** - 52 个集合的完整架构

### 系统配置
- **[全局配置说明](../README.md)** - 系统配置和使用

---

## 🔍 文档维护

### 文档组织原则
1. **guides/** - 功能使用指南、教程和架构文档
2. **features/** - 新功能说明文档
3. **fixes/** - 问题修复记录
4. **deployment/** - 部署相关文档

### 清理记录
**最近清理 (2025-10-20)**：
- ✅ 删除 9 个过时/临时文档
- ✅ 删除 4 个无用脚本（调试工具）
- ✅ 移动 10 个文档到正确目录
- ✅ 保留 5 个生产脚本

**保留的生产脚本**：
- `initializeFiscalYear.ts` - 财年初始化
- `seedGlobalSettings.ts` - 全局设置初始化
- `migrateSubCategoryToTxAccount.ts` - 数据迁移
- `backupFirestore.ts` - Firestore 备份
- `initializeFinancialCategories.ts` - 财务类别初始化

### 更新日期
- 最后更新：2025-10-20
- 文档版本：4.0
- 清理版本：1.0
- 集合重命名：v4.0 (2025-10-20)

---

## 📞 支持

如有问题，请参考：
1. 先查看 [故障排查文档](../TROUBLESHOOTING.md)
2. 查看相关功能的指南文档
3. 查看修复记录了解已知问题

---

**返回**: [项目主页](../README.md)

