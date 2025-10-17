# JCI KL 会员管理系统

超级国际青年商会吉隆坡分会会员管理系统

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 到 `.env`，填入您的 Firebase 配置：
```env
VITE_FIREBASE_API_KEY=你的API密钥
VITE_FIREBASE_AUTH_DOMAIN=你的认证域
VITE_FIREBASE_PROJECT_ID=你的项目ID
VITE_FIREBASE_STORAGE_BUCKET=你的存储桶
VITE_FIREBASE_MESSAGING_SENDER_ID=你的发送者ID
VITE_FIREBASE_APP_ID=你的应用ID
```

### 3. 配置 Firestore 规则（重要！）
```bash
# 登录 Firebase
npm run firebase:login

# 部署 Firestore 规则
npm run firebase:deploy:rules
```

或者访问 Firebase Console 手动部署：
```
https://console.firebase.google.com/project/你的项目ID/firestore/rules
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## 📋 核心功能

- ✅ 用户认证（邮箱/密码 + Google 登录）
- ✅ 会员管理
- ✅ 财务系统
- ✅ 活动管理
- ✅ 权限系统（RBAC）
- ✅ 问卷系统
- ✅ 奖项系统
- ✅ 图片管理
- ✅ 系统设置

## 🛠️ 技术栈

- React 18 + TypeScript
- Vite 5
- Ant Design 5
- Firebase (Auth + Firestore + Storage)
- Zustand (状态管理)
- React Router 6

## 📦 项目结构

```
src/
├── components/     # 通用组件
├── modules/        # 功能模块
├── services/       # 服务层
├── stores/         # 状态管理
├── config/         # 全局配置
└── utils/          # 工具函数
```

## 🔧 常用命令

```bash
npm run dev              # 开发服务器
npm run build            # 生产构建
npm run preview          # 预览生产版本
npm run lint             # 代码检查
npm run type-check       # TypeScript 检查
```

## 📝 详细文档

- **配置指南**: `SETUP.md` - Firebase 和项目配置
- **故障排查**: `TROUBLESHOOTING.md` - 常见问题解决

## 📄 许可证

MIT
