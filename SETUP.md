# 项目配置指南

## 🔥 Firebase 配置

### 1. 创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 创建新项目或选择现有项目
3. 添加 Web 应用

### 2. 启用 Firebase Authentication

访问：Authentication → Sign-in method

启用以下登录方式：
- ✅ Email/Password
- ✅ Google

### 3. 创建 Firestore 数据库

1. 访问：Firestore Database
2. 创建数据库（选择测试模式）
3. 选择服务器位置

### 4. 部署 Firestore 安全规则

**方法 1：使用 Firebase CLI（推荐）**

```bash
# 登录
npm run firebase:login

# 部署规则
npm run firebase:deploy:rules
```

**方法 2：手动部署**

1. 访问：Firestore → Rules
2. 复制 `firestore.rules` 文件内容
3. 粘贴并发布

**核心规则说明：**
```javascript
// 允许新用户注册
match /members/{memberId} {
  allow create: if request.auth.uid == memberId;
  allow read: if request.auth != null;
  allow update: if request.auth.uid == memberId;
}
```

### 5. 配置环境变量

创建 `.env` 文件：

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=你的API密钥
VITE_FIREBASE_AUTH_DOMAIN=你的项目ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=你的项目ID
VITE_FIREBASE_STORAGE_BUCKET=你的项目ID.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=你的发送者ID
VITE_FIREBASE_APP_ID=你的应用ID
VITE_FIREBASE_MEASUREMENT_ID=

# Cloudinary Configuration (可选)
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_CLOUDINARY_API_KEY=
VITE_CLOUDINARY_FOLDER=
```

## 🌐 Cloudinary 配置（图片上传）

1. 访问 [Cloudinary](https://cloudinary.com/)
2. 创建账户
3. 获取 Cloud Name 和 Upload Preset
4. 填入 `.env` 文件

## 🎯 首次运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
http://localhost:3000

### 4. 注册第一个管理员账户

1. 访问注册页面
2. 注册账户
3. 在 Firestore Console 中手动将用户的 `role` 改为 `admin`
4. 将 `status` 改为 `active`

## 🔍 验证配置

### 检查 Firebase 连接

在浏览器控制台应该看到：
```
✅ Firebase 配置验证通过
✅ Firebase 初始化成功
```

### 测试注册功能

1. 访问 `/register`
2. 填写表单
3. 提交
4. 应该成功创建账户，无 "permission-denied" 错误

## 🚨 常见问题

### 问题：注册时提示 "permission-denied"
**原因**：Firestore 规则未部署
**解决**：运行 `npm run firebase:deploy:rules`

### 问题：Firebase 400 错误
**原因**：Authentication 未启用
**解决**：在 Firebase Console 启用 Email/Password 登录

### 问题：环境变量未加载
**原因**：.env 文件配置错误
**解决**：检查 .env 文件格式，确保以 `VITE_` 开头

## 📦 生产部署

### 1. 构建项目
```bash
npm run build
```

### 2. 部署到 Firebase Hosting

```bash
firebase deploy
```

### 3. 更新环境变量

确保生产环境的 `.env` 配置正确

## 🔐 安全建议

1. **不要**提交 `.env` 文件到 Git
2. 在生产环境使用严格的 Firestore 规则
3. 定期更新依赖包
4. 启用 Firebase App Check（可选）

## 📚 相关链接

- [Firebase 文档](https://firebase.google.com/docs)
- [Ant Design 文档](https://ant.design/)
- [React Router 文档](https://reactrouter.com/)

