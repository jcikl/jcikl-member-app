# JCI KL 会员管理系统

**超级国际青年商会吉隆坡分会会员管理系统**

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://jcikl2025.netlify.app)

---

## 🌟 项目简介

JCI KL 会员管理系统是一个企业级、生产就绪的 Web 应用程序，专为超级国际青年商会吉隆坡分会设计。系统拥有 30,000+ 行代码、200+ 组件和 52 个 Firestore 集合，提供完整的会员管理、财务追踪、活动组织和权限控制功能。

### 核心特性

- ✅ **用户认证** - 邮箱/密码登录 + Google OAuth 2.0
- ✅ **会员管理** - 完整的会员生命周期管理
- ✅ **财务系统** - 交易记录、余额追踪、财务报表
- ✅ **活动管理** - 活动创建、报名、财务追踪
- ✅ **权限系统** - 基于角色的访问控制（RBAC）
- ✅ **问卷系统** - 在线问卷和数据收集
- ✅ **奖项系统** - 奖项管理和颁发
- ✅ **图片管理** - Cloudinary 集成的图片上传
- ✅ **系统设置** - 全局配置和主题定制

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Firebase 项目（Firestore + Authentication + Storage）
- Cloudinary 账户（可选，用于图片上传）

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制 `.env.example` 到 `.env`，填入您的配置：

```env
# Firebase 配置
VITE_FIREBASE_API_KEY=你的API密钥
VITE_FIREBASE_AUTH_DOMAIN=你的认证域
VITE_FIREBASE_PROJECT_ID=你的项目ID
VITE_FIREBASE_STORAGE_BUCKET=你的存储桶
VITE_FIREBASE_MESSAGING_SENDER_ID=你的发送者ID
VITE_FIREBASE_APP_ID=你的应用ID

# Cloudinary 配置（可选）
VITE_CLOUDINARY_CLOUD_NAME=你的云名称
VITE_CLOUDINARY_UPLOAD_PRESET=你的上传预设
```

### 3. Firestore 规则部署

**⚠️ 重要：** Firestore 规则将于 **2025-10-10 过期**，请及时更新！

```bash
# 登录 Firebase
npm run firebase:login

# 部署 Firestore 规则和索引
npm run firebase:deploy:all
```

或者手动在 Firebase Console 中部署：
```
https://console.firebase.google.com/project/你的项目ID/firestore/rules
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

---

## 📦 技术栈

### 前端
- **React 18** - 用户界面库
- **TypeScript 5.2** - 类型安全
- **Vite 5.0** - 构建工具
- **Ant Design 5.12** - UI 组件库
- **React Router 6** - 路由管理
- **Zustand** - 轻量级状态管理

### 后端服务（BaaS）
- **Firebase Authentication** - 用户认证
- **Firestore** - NoSQL 数据库
- **Firebase Storage** - 文件存储
- **Cloudinary** - 图片 CDN

### 工具和库
- **React Hook Form** - 表单管理
- **Yup** - 数据验证
- **Day.js** - 日期处理
- **Axios** - HTTP 客户端
- **crypto-js** - 加密工具

---

## 📂 项目结构

```
src/
├── components/           # 通用组件
│   ├── common/          # 基础组件（按钮、卡片等）
│   ├── business/        # 业务组件（审批流程、过滤器等）
│   ├── form/            # 表单组件
│   └── charts/          # 图表组件
├── modules/             # 功能模块
│   ├── member/          # 会员管理模块
│   ├── finance/         # 财务管理模块
│   ├── event/           # 活动管理模块
│   ├── permission/      # 权限系统模块
│   ├── survey/          # 问卷系统模块
│   ├── award/           # 奖项系统模块
│   ├── image/           # 图片管理模块
│   └── system/          # 系统设置模块
├── services/            # 服务层（API 调用）
├── stores/              # 状态管理（Zustand）
├── config/              # 全局配置
│   ├── globalCollections.ts      # Firestore 集合定义
│   ├── globalPermissions.ts      # 权限配置
│   ├── globalSystemSettings.ts   # 系统设置
│   ├── globalComponentSettings.ts # UI 组件配置
│   ├── globalValidationSettings.ts # 验证规则
│   └── globalDateSettings.ts     # 日期格式配置
├── utils/               # 工具函数
├── types/               # TypeScript 类型定义
└── styles/              # 全局样式
```

---

## 🔧 常用命令

### 开发
```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建（包含类型检查）
npm run build:fast       # 快速构建（跳过类型检查）
npm run preview          # 预览生产构建
```

### 代码质量
```bash
npm run lint             # ESLint 代码检查
npm run type-check       # TypeScript 类型检查
```

### Firebase
```bash
npm run firebase:login                # Firebase 登录
npm run firebase:deploy:rules         # 部署 Firestore 规则
npm run firebase:deploy:indexes       # 部署 Firestore 索引
npm run firebase:deploy:all           # 部署规则和索引
```

### 数据库
```bash
npm run seed:settings    # 初始化全局设置
npm run backup:firestore # 备份 Firestore 数据
```

### 数据迁移
```bash
npm run migrate:subcategory:dry      # 预览迁移（不执行）
npm run migrate:subcategory          # 执行迁移
npm run migrate:subcategory:rollback # 回滚迁移
```

---

## 📚 文档

### 📖 快速开始
- **[项目设置指南](SETUP.md)** - 详细的环境配置和 Firebase 设置
- **[快速测试指南](QUICK_TEST_GUIDE.md)** - 功能验证和测试步骤
- **[Firebase 快速开始](QUICK_START_FIREBASE.md)** - Firebase 项目配置
- **[故障排查](TROUBLESHOOTING.md)** - 常见问题和解决方案

### 📂 完整文档索引
查看 **[文档索引](docs/INDEX.md)** 获取完整的文档列表，包括：

#### 部署文档
- [Netlify 部署指南](docs/deployment/NETLIFY_DEPLOYMENT.md) - SPA 路由、环境变量、部署步骤

#### 功能指南
- [会员 Firestore 数据模型](docs/guides/MEMBER_FIRESTORE_SCHEMA.md) - 52 个集合的完整架构
- [财务模块设置](docs/guides/FINANCE_MODULE_SETUP.md) - 财务系统配置
- [交易管理完整指南](docs/guides/TRANSACTION_MANAGEMENT_COMPLETE_GUIDE.md) - 交易、拆分、分类
- [余额计算实现](docs/guides/RUNNING_BALANCE_IMPLEMENTATION.md) - 累计余额算法
- [活动财务关系分析](docs/guides/EVENT_FINANCIAL_RELATIONSHIP_ANALYSIS.md) - 活动与财务关系详解

#### 功能文档
- [活动账户批量输入](docs/features/EVENT_ACCOUNT_BULK_INPUT_DESIGN.md)
- [活动预测功能](docs/features/EVENT_FORECAST_FEATURE_COMPLETE.md)
- [交易拆分功能](docs/features/TRANSACTION_SPLIT_FEATURE.md)
- [搜索功能指南](docs/guides/SEARCH_FEATURE_GUIDE.md)

#### 部署与迁移
- [服务账户设置](docs/deployment/SERVICE_ACCOUNT_SETUP.md) - Firebase Admin SDK 配置
- [数据迁移指南](docs/guides/DATA_MIGRATION_SUBCATEGORY_TO_TXACCOUNT.md) - 字段重命名迁移

---

## 🏗️ 架构特点

### 3 层架构
```
UI Layer (React Components)
    ↓
Business Logic Layer (Services)
    ↓
Data Access Layer (Firestore)
```

### 全局配置系统
所有配置集中管理，避免硬编码：
- ✅ 52 个 Firestore 集合统一定义
- ✅ 全局验证规则
- ✅ 统一的日期格式
- ✅ UI 组件默认配置
- ✅ 权限系统配置

### 关键业务规则
- **会员费用标准**: 官方会员 RM480/350，准会员 RM250/200
- **活动定价**: 4 层定价（访客、会员、校友、早鸟）
- **财政年度**: 10月1日 - 9月30日
- **交易编号**: `TXN-{YYYY}-{ACCT_LAST_4}-{SEQ_4}`

---

## 🎯 性能目标

- **首次内容绘制 (FCP)**: < 1.5s
- **可交互时间 (TTI)**: < 3s
- **列表渲染** (1000 项): < 200ms
- **表单提交响应**: < 500ms
- **初始包大小**: < 500KB (gzipped)

---

## 🔐 安全性

### 已实现
- ✅ Firebase Authentication
- ✅ Firestore 安全规则
- ✅ 基于角色的访问控制（RBAC）
- ✅ XSS 防护（Ant Design 自动转义）
- ✅ 输入验证（客户端 + 服务端）

### 最佳实践
- ⛔ **禁止硬编码** - 使用全局配置
- ⛔ **禁止传递 undefined 到 Firebase** - 使用 `cleanUndefinedValues()`
- ✅ **始终检查权限** - 使用 `globalPermissionService`
- ✅ **始终验证输入** - 使用 `globalValidationService`

---

## 🚀 部署

### Netlify 部署（推荐）
本项目已配置 Netlify 自动部署：

1. **连接 Git 仓库** - Netlify 会自动检测更新
2. **自动构建** - 推送代码后自动触发构建
3. **环境变量** - 在 Netlify Dashboard 中配置

详细步骤请参考 **[Netlify 部署指南](docs/deployment/NETLIFY_DEPLOYMENT.md)**

### 手动部署
```bash
# 构建生产版本
npm run build

# dist 目录即可部署
```

---

## 🧪 测试

### UI 测试清单
参考 [UI_CHECKLIST.md](docs/guides/UI_CHECKLIST.md) 进行手动测试。

### 快速测试
```bash
# 参考快速测试指南
# QUICK_TEST_GUIDE.md
```

### 主要测试点
- [ ] 用户登录/注册
- [ ] 会员 CRUD 操作
- [ ] 财务交易记录
- [ ] 活动创建和报名
- [ ] 权限控制验证

---

## 🐛 故障排查

常见问题及解决方案请参考 **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

### 紧急情况

#### Firestore 规则过期 (2025-10-10)
```bash
firebase deploy --only firestore:rules
```

#### 生产环境回滚
```bash
git revert [commit]
# 然后重新部署
```

---

## 📈 数据模型

### Firestore 集合 (52 个)

#### 会员域
- `members` - 会员主表
- `member_positions` - 职位记录
- `member_categories` - 类别变更
- `member_recruitment` - 招募追踪

#### 财务域
- `transactions` - 交易记录
- `bank_accounts` - 银行账户
- `transaction_purposes` - 交易用途
- `bill_payments` - 账单支付
- `budgets` - 预算管理

#### 活动域
- `events` - 活动主表
- `event_registrations` - 活动报名
- `event_participants` - 参与者记录

#### 权限域（RBAC）
- `rbac_permissions` - 权限定义
- `rbac_roles` - 角色定义
- `rbac_role_bindings` - 角色绑定

#### 系统域
- `global_settings` - 全局设置
- `audit_logs` - 审计日志
- `user_operation_logs` - 操作日志
- `online_users` - 在线用户
- `page_views` - 页面浏览统计

完整数据模型请参考 **[MEMBER_FIRESTORE_SCHEMA.md](docs/guides/MEMBER_FIRESTORE_SCHEMA.md)**

---

## 🤝 贡献指南

### 开发规范

#### 必须遵守
1. ✅ 使用 `GLOBAL_COLLECTIONS.*` 引用所有集合
2. ✅ 使用全局服务（validation, date, component）
3. ✅ 写入 Firebase 前清理 `undefined` 值
4. ✅ 添加明确的 TypeScript 类型
5. ✅ 实现权限检查
6. ✅ 严格遵循导入顺序

#### 禁止事项
1. ❌ 硬编码集合名称
2. ❌ 使用 `any` 类型
3. ❌ 跳过权限检查
4. ❌ 传递 `undefined` 到 Firebase
5. ❌ 使用默认导出
6. ❌ 在生产代码中保留 `console.log`

### 提交前检查
- [ ] TypeScript 类型检查通过
- [ ] ESLint 无错误
- [ ] 合规评分 ≥ 90/100
- [ ] 主要用户流程测试通过
- [ ] 更新了所有受影响的消费者

---

## 📊 项目统计

- **代码行数**: 30,000+
- **组件数量**: 200+
- **Firestore 集合**: 52
- **功能模块**: 8
- **支持语言**: 中文、English

---

## 📞 支持与联系

### 文档支持
1. 查看 [故障排查文档](TROUBLESHOOTING.md)
2. 查看 [完整文档索引](docs/INDEX.md)
3. 查看相关功能的指南文档

### 技术支持
- 项目仓库: [GitHub](https://github.com/your-org/jci-kl-membership-app)
- 在线演示: [jcikl2025.netlify.app](https://jcikl2025.netlify.app)

---

## 🧹 项目清理记录

### 最近清理 (2025-10-20)

#### 删除的脚本（4个）
- ❌ `checkFinancialRecords.ts` - 调试工具
- ❌ `resetFinancialRecords.ts` - 危险的开发工具
- ❌ `seedDatabase.ts` - 过时的种子数据
- ❌ `updateFinancialRecordsPayerInfo.ts` - 已完成的临时脚本

#### 保留的生产脚本（5个）
- ✅ `initializeFiscalYear.ts` - 财年初始化
- ✅ `seedGlobalSettings.ts` - 全局设置初始化
- ✅ `migrateSubCategoryToTxAccount.ts` - 数据迁移
- ✅ `backupFirestore.ts` - Firestore 备份
- ✅ `initializeFinancialCategories.ts` - 财务类别初始化

#### 文档整理
- ✅ 删除 9 个过时/临时文档
- ✅ 移动 10 个文档到正确的 docs/ 目录
- ✅ 更新文档索引和结构
- ✅ 修正所有文档路径引用

---

## 📝 更新日志

### 最近更新
- **2025-10-20**: 项目清理 - 删除无用脚本和文档，重新组织文档结构
- **2025-10-20**: 完成 `subCategory` → `txAccount` 数据迁移
- **2025-10-19**: 文档重组，创建结构化文档索引
- **2025-10-18**: 添加 Netlify 部署配置，修复 SPA 路由 404
- **2025-10-18**: 修复 Ant Design 静态 API 警告，更新到 Context API
- **2025-01-13**: 完成核心功能开发，系统上线

---

## 📄 许可证

MIT License

---

**JCI KL 会员管理系统** - 为超级国际青年商会吉隆坡分会打造的现代化管理平台

**版本**: 3.0  
**最后更新**: 2025-10-20
