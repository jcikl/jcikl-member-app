# 故障排查指南

## 🔴 常见错误

### 1. 注册时出现 "missing or insufficient permission"

**症状：**
```
FirebaseError: Missing or insufficient permissions
```

**原因：** Firestore 安全规则未配置或未部署

**解决方案：**

**方法 A：使用命令行（推荐）**
```bash
npm run firebase:login
npm run firebase:deploy:rules
```

**方法 B：使用 Firebase Console**
1. 访问：https://console.firebase.google.com/project/你的项目ID/firestore/rules
2. 点击"编辑规则"
3. 复制 `firestore.rules` 文件内容
4. 粘贴并点击"发布"
5. 等待 30 秒
6. 清除浏览器缓存并刷新

---

### 2. Firebase Authentication 400 错误

**症状：**
```
POST .../accounts:signUp 400 (Bad Request)
POST .../accounts:signInWithPassword 400 (Bad Request)
```

**原因：** Firebase Authentication 未启用

**解决方案：**
1. 访问 Firebase Console → Authentication → Sign-in method
2. 启用 **Email/Password** 提供商
3. 启用 **Google** 提供商
4. 保存设置
5. 重启开发服务器

---

### 3. 环境变量未加载

**症状：**
```
❌ 缺少必要的 Firebase 环境变量
```

**原因：** .env 文件配置错误或格式不正确

**解决方案：**
1. 确保 `.env` 文件在项目根目录
2. 确保所有变量以 `VITE_` 开头
3. 检查是否有空格或引号问题
4. 重启开发服务器（重要！）

**正确格式：**
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=项目ID.firebaseapp.com
```

**错误格式：**
```env
FIREBASE_API_KEY=...          # 缺少 VITE_ 前缀
VITE_FIREBASE_API_KEY = ...   # 有多余空格
VITE_FIREBASE_API_KEY="..."   # 不需要引号
```

---

### 4. Google 登录弹窗被阻止

**症状：**
```
auth/popup-blocked
```

**原因：** 浏览器阻止弹窗

**解决方案：**
1. 允许网站弹窗
2. 检查浏览器设置
3. 确认 localhost 在 Firebase 授权域名列表中

---

### 5. Firestore 连接失败

**症状：**
```
POST .../Firestore/Listen 400 (Bad Request)
```

**原因：** Firestore 未创建或配置错误

**解决方案：**
1. 访问 Firebase Console → Firestore Database
2. 如果没有数据库，点击"创建数据库"
3. 选择测试模式
4. 选择服务器位置
5. 部署安全规则

---

### 6. 构建失败

**症状：**
```
error during build
```

**常见原因和解决方案：**

**TypeScript 错误：**
```bash
npm run type-check
```
修复所有类型错误

**Lint 错误：**
```bash
npm run lint
```
修复代码风格问题

**依赖问题：**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## ⚠️ 警告信息（可忽略）

### Cross-Origin-Opener-Policy 警告

**信息：**
```
Cross-Origin-Opener-Policy policy would block the window.closed call
```

**说明：** 这是浏览器安全策略警告，**不影响 Google 登录功能**，可以安全忽略。

### React Router v7 警告

**信息：**
```
React Router Future Flag Warning: v7_startTransition
```

**说明：** 项目已配置 future flags，如果仍出现此警告，清除浏览器缓存即可。

---

## 🔍 调试技巧

### 1. 查看详细错误信息

打开浏览器控制台（F12），查看：
- **Console** 标签：查看错误日志
- **Network** 标签：查看 API 请求详情

### 2. 运行 Firebase 诊断

在浏览器控制台执行：
```javascript
const { runAndLogDiagnostics } = await import('/src/utils/firebaseDiagnostics.ts');
await runAndLogDiagnostics();
```

### 3. 检查 Firebase 规则

访问 Firebase Console 查看当前规则：
```
https://console.firebase.google.com/project/你的项目ID/firestore/rules
```

### 4. 验证环境变量

在浏览器控制台：
```javascript
console.log(import.meta.env);
```

应该看到所有 `VITE_` 开头的变量。

---

## 🆘 仍然无法解决？

### 检查清单

- [ ] Firebase Authentication 已启用 Email/Password 和 Google
- [ ] Firestore 数据库已创建
- [ ] Firestore 规则已部署
- [ ] .env 文件配置正确
- [ ] localhost 在 Firebase 授权域名列表中
- [ ] 已重启开发服务器
- [ ] 已清除浏览器缓存

### 获取帮助

如果以上都无法解决问题，请提供：
1. 完整的错误信息（浏览器控制台截图）
2. Network 标签中失败请求的详细信息
3. Firebase Console 配置截图
4. 当前 Firestore 规则内容

---

## 📚 相关资源

- [Firebase 文档](https://firebase.google.com/docs)
- [Firebase 状态页面](https://status.firebase.google.com/)
- [Firestore 规则指南](https://firebase.google.com/docs/firestore/security/rules-structure)

