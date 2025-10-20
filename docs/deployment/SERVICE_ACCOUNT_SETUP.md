# 🔑 Firebase 服务账号设置指南

数据迁移脚本需要 Firebase Admin SDK，这需要服务账号凭证。

---

## 📥 获取服务账号密钥

### 步骤 1: 访问 Firebase Console

1. 打开 Firebase Console: https://console.firebase.google.com
2. 选择您的项目: **jci-kl-membership-app**

### 步骤 2: 生成服务账号密钥

1. 点击左侧菜单的 **⚙️ 项目设置** (Project Settings)
2. 切换到 **服务账号** (Service accounts) 标签
3. 找到 **Firebase Admin SDK** 部分
4. 点击 **生成新的私钥** (Generate new private key)
5. 在弹出的确认对话框中点击 **生成密钥** (Generate key)

### 步骤 3: 保存密钥文件

1. 下载的 JSON 文件会自动保存到您的下载文件夹
2. **重命名文件**为: `serviceAccountKey.json`
3. **移动文件**到项目根目录:
   ```
   C:\Users\User\Documents\Cursor projects\New folder\20251013-jcikl-membership-app\serviceAccountKey.json
   ```

### 步骤 4: 验证文件位置

确保文件结构如下：
```
20251013-jcikl-membership-app/
├── src/
├── public/
├── package.json
├── serviceAccountKey.json  ← 应该在这里
└── ...
```

---

## ⚠️ 安全警告

### ❌ 绝对不要
- ❌ 不要提交 `serviceAccountKey.json` 到 Git
- ❌ 不要分享这个文件给任何人
- ❌ 不要上传到公共位置
- ❌ 不要在代码中硬编码密钥内容

### ✅ 已采取的安全措施
- ✅ `.gitignore` 已配置忽略服务账号密钥
- ✅ 文件仅用于本地脚本执行
- ✅ 脚本会验证文件存在才运行

---

## 🔍 验证设置

运行以下命令验证设置是否正确：

```bash
# 测试备份脚本（会检查服务账号）
npm run backup:firestore

# 或测试迁移脚本（dry-run）
npm run migrate:subcategory:dry
```

**期望输出**:
```
✅ Service account key loaded
🔄 DATA MIGRATION: subCategory → txAccount
...
```

**如果看到错误**:
```
❌ serviceAccountKey.json not found!
📝 Please download it from Firebase Console...
```
说明文件位置不正确，请重新检查步骤 3。

---

## 📝 密钥文件格式

`serviceAccountKey.json` 应该包含以下内容（示例）：

```json
{
  "type": "service_account",
  "project_id": "jci-kl-membership-app",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@jci-kl-membership-app.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 🔒 密钥管理最佳实践

### 本地开发
- 将 `serviceAccountKey.json` 放在项目根目录
- `.gitignore` 会自动忽略它
- 仅在需要运行迁移/备份脚本时使用

### 生产环境
- **不要**在生产服务器上使用服务账号密钥
- 使用 Firebase Functions 或 Cloud Run（自动处理认证）
- 或使用 Application Default Credentials (ADC)

### 密钥轮换
如果密钥泄露：
1. 立即在 Firebase Console 删除该密钥
2. 生成新的密钥
3. 更新本地文件
4. 通知团队成员

---

## 🆘 常见问题

### Q: 没有权限生成服务账号密钥？
**A**: 您需要项目的 **编辑者** (Editor) 或 **所有者** (Owner) 角色。联系项目管理员授权。

### Q: 下载的文件名不是 serviceAccountKey.json？
**A**: 文件名可能类似 `jci-kl-membership-app-firebase-adminsdk-xxxxx.json`，请重命名为 `serviceAccountKey.json`。

### Q: 文件放在哪个目录？
**A**: 项目根目录，与 `package.json` 同级。

### Q: 可以和团队成员共享这个文件吗？
**A**: **绝对不可以！** 每个人应该自己从 Firebase Console 下载。如果多人需要，可以生成多个密钥。

### Q: CI/CD 怎么办？
**A**: 使用环境变量或密钥管理服务（如 GitHub Secrets）存储凭证，不要直接提交文件。

---

## ✅ 设置完成检查

- [ ] 从 Firebase Console 下载了服务账号密钥
- [ ] 重命名为 `serviceAccountKey.json`
- [ ] 移动到项目根目录
- [ ] 运行测试命令验证
- [ ] 确认文件未被 Git 追踪 (`git status` 不应显示该文件)

---

## 📞 获取帮助

如果遇到问题：
1. 检查 Firebase Console 的权限设置
2. 验证文件路径和文件名
3. 查看错误日志
4. 参考 [Firebase Admin SDK 文档](https://firebase.google.com/docs/admin/setup)

---

**设置完成后，您就可以运行数据迁移和备份脚本了！** 🎉

