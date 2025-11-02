# 🚀 Cloudinary Signed Upload 部署指南

## 📋 概述

本指南将帮助您部署 Firebase Cloud Functions，实现 Cloudinary 的签名上传功能，从而支持图片覆盖上传以节省存储空间。

---

## ✅ 前置条件

1. ✅ 已安装 Firebase CLI（`npm install -g firebase-tools`）
2. ✅ 已登录 Firebase（`firebase login`）
3. ✅ 拥有 Cloudinary 账号并知道 API 凭证

---

## 📝 部署步骤

### 步骤 1：配置 Cloudinary API 凭证

#### 1.1 获取 Cloudinary API 凭证

1. 登录 [Cloudinary Dashboard](https://cloudinary.com/console)
2. 点击右上角的 **设置图标** ⚙️
3. 导航到 **API Keys** 部分
4. 找到以下信息：
   - **Cloud Name**: `drpa1zcmp`（应该已经显示）
   - **API Key**: 一串数字（例如：`123456789012345`）
   - **API Secret**: 点击 👁️ 图标显示（例如：`AbCdEfGhIjKlMnOpQrStUvWxYz`）

#### 1.2 运行配置脚本

**方法 A：使用自动化脚本**（推荐）
```bash
cd functions
setup-config.bat
```

按提示输入：
- Cloud Name: `drpa1zcmp`
- API Key: `您的 API Key`
- API Secret: `您的 API Secret`

**方法 B：手动配置**
```bash
firebase functions:config:set \
  cloudinary.cloud_name="drpa1zcmp" \
  cloudinary.api_key="YOUR_API_KEY" \
  cloudinary.api_secret="YOUR_API_SECRET"
```

#### 1.3 验证配置
```bash
firebase functions:config:get
```

应该看到：
```json
{
  "cloudinary": {
    "cloud_name": "drpa1zcmp",
    "api_key": "123456...",
    "api_secret": "AbCdEf..."
  }
}
```

---

### 步骤 2：部署 Cloud Functions

#### 2.1 使用自动化脚本（推荐）
```bash
# 在项目根目录执行
deploy-functions.bat
```

脚本会自动：
1. 构建 TypeScript → JavaScript
2. 部署到 Firebase
3. 验证部署成功

#### 2.2 手动部署
```bash
# 1. 进入 functions 目录
cd functions

# 2. 构建
npm run build

# 3. 返回根目录
cd ..

# 4. 部署
firebase deploy --only functions
```

#### 2.3 验证部署
```bash
# 查看已部署的函数
firebase functions:list
```

应该看到：
```
✔ functions(asia-east1)
  - generateCloudinarySignature(asia-east1)
  - deleteCloudinaryImage(asia-east1)
```

---

### 步骤 3：测试覆盖上传功能

#### 3.1 测试新上传
1. 打开应用：`http://localhost:5173`
2. 导航到：活动管理 → 创建活动
3. 上传海报图片
4. 观察控制台日志：

**期望日志**：
```javascript
🔐 [Cloudinary] Requesting signature from Cloud Function
✅ [Cloudinary] Signature received
☁️ [Cloudinary] Starting signed upload
📁 [Cloudinary] Will upload to folder: project poster
📤 [Cloudinary] Sending signed request
📡 [Cloudinary] Response status: 200 OK
✅ [Cloudinary] Signed upload successful
```

#### 3.2 测试覆盖上传
1. 编辑刚才创建的活动
2. 重新上传海报
3. 观察控制台日志：

**期望日志**：
```javascript
🔍 [Cloudinary] Extracted publicId: {
  publicId: 'project poster/image_xyz'
}
🔐 [Cloudinary] Requesting signature (overwrite mode)
✅ [Cloudinary] Signature received
♻️ [Cloudinary] Will overwrite existing image
📤 [Cloudinary] Sending signed request
✅ [Cloudinary] Signed upload successful: {
  wasOverwritten: true  ← 关键！
}
📝 图片已更新（覆盖旧图片）
```

4. 在 Cloudinary Dashboard 确认：
   - 文件数量没有增加 ✅
   - 图片已更新为新内容 ✅

---

## 🔍 故障排查

### 问题 1：配置未生效
```bash
# 检查配置
firebase functions:config:get

# 如果为空，重新运行配置脚本
cd functions
setup-config.bat
```

### 问题 2：部署失败
```bash
# 查看详细错误
firebase deploy --only functions --debug

# 检查 TypeScript 编译
cd functions
npm run build
```

### 问题 3：签名生成失败
**错误**: `Cloudinary configuration is missing`

**解决**:
```bash
# 确保配置已设置
firebase functions:config:get

# 重新部署（让配置生效）
firebase deploy --only functions --force
```

### 问题 4：前端调用失败
**错误**: `Function not found: generateCloudinarySignature`

**解决**:
1. 确认函数已部署：`firebase functions:list`
2. 检查 Firebase 初始化是否正确
3. 确保用户已登录（Cloud Function 需要认证）

---

## 📊 功能验证清单

部署完成后，请验证以下功能：

### ✅ 新上传
- [ ] 图片成功上传到 `project poster/` 文件夹
- [ ] 控制台显示签名生成日志
- [ ] Cloudinary Dashboard 中看到新图片

### ✅ 覆盖上传
- [ ] 重新上传时，publicId 被正确提取
- [ ] 签名生成包含 overwrite 参数
- [ ] 旧图片被覆盖（文件数量不增加）
- [ ] 图片内容更新为新上传的内容

### ✅ 错误处理
- [ ] 未登录用户无法调用 Cloud Function
- [ ] 上传失败时显示友好错误提示
- [ ] 网络错误时不会导致应用崩溃

---

## 💰 成本说明

### Firebase Functions 免费额度
- **调用次数**: 200万次/月
- **计算时间**: 400,000 GB-秒/月
- **网络流出**: 5GB/月

### 本项目预估使用量
- **月上传次数**: ~100次
- **每次调用时长**: <1秒
- **月成本**: **$0**（在免费额度内）

### Cloudinary 存储节省
- **覆盖上传前**: 每月增长 ~500MB（假设100次上传，每张5MB）
- **覆盖上传后**: 每月增长 ~50MB（10个新活动）
- **年度节省**: ~5.4GB 存储空间

---

## 🔐 安全性说明

### ✅ 已实施的安全措施
1. **API Secret 隐藏**: 只存储在 Firebase Functions 环境变量中
2. **认证检查**: 只有登录用户可以获取签名
3. **签名验证**: Cloudinary 服务器验证签名有效性
4. **HTTPS 加密**: 所有通信使用 HTTPS

### 🛡️ 建议的额外措施
1. **权限检查**: 检查用户是否有上传权限
2. **配额限制**: 限制每个用户的上传次数（例如：每天10次）
3. **文件大小限制**: 在 Cloud Function 中验证文件大小
4. **审计日志**: 记录所有上传操作

---

## 📚 相关文档

- [Firebase Cloud Functions 文档](https://firebase.google.com/docs/functions)
- [Cloudinary Signed Upload 文档](https://cloudinary.com/documentation/upload_images#signed_upload)
- `functions/README.md` - Cloud Functions 详细文档

---

## 🎯 下一步

部署完成后，您可以：
1. ✅ 测试图片上传和覆盖功能
2. ✅ 在 Cloudinary Dashboard 中查看存储空间变化
3. ✅ 设置存储空间监控和告警
4. ✅ 定期检查 Cloud Function 日志

---

**部署完成后，所有活动海报重新上传时将自动覆盖旧图片，节省存储空间！** 🎉

