# Firebase Cloud Functions - JCI KL Membership App

## 📦 Functions Overview

### `generateCloudinarySignature`
生成 Cloudinary 签名用于安全的图片上传（支持覆盖功能）

### `deleteCloudinaryImage`
删除 Cloudinary 上的图片

---

## 🚀 部署步骤

### 1. 安装依赖
```bash
cd functions
npm install
```

### 2. 配置 Cloudinary API Secret
```bash
# 设置 Cloudinary 配置（在项目根目录执行）
firebase functions:config:set \
  cloudinary.cloud_name="drpa1zcmp" \
  cloudinary.api_key="YOUR_API_KEY" \
  cloudinary.api_secret="YOUR_API_SECRET"

# 查看当前配置
firebase functions:config:get
```

**获取 API Secret**：
1. 登录 [Cloudinary Dashboard](https://cloudinary.com/console)
2. 点击右上角的设置图标 ⚙️
3. 导航到 **API Keys** 部分
4. 找到 **API Secret**（点击"眼睛"图标显示）
5. 复制并在上面的命令中替换 `YOUR_API_SECRET`

### 3. 构建 TypeScript
```bash
npm run build
```

### 4. 部署到 Firebase
```bash
# 在项目根目录执行
firebase deploy --only functions
```

### 5. 验证部署
```bash
# 查看函数日志
firebase functions:log --only generateCloudinarySignature
```

---

## 🧪 本地测试

### 1. 启动模拟器
```bash
# 在项目根目录执行
firebase emulators:start
```

### 2. 测试函数
```bash
# Functions 模拟器运行在 http://localhost:5001
# UI 控制台：http://localhost:4000
```

---

## 📊 函数详情

### `generateCloudinarySignature`
- **Region**: `asia-east1` (Hong Kong - 最接近马来西亚)
- **Auth**: Required (用户必须登录)
- **输入参数**:
  ```typescript
  {
    publicId?: string,  // 覆盖模式：提供旧图片 ID
    folder?: string,    // 新上传模式：指定文件夹
  }
  ```
- **返回值**:
  ```typescript
  {
    signature: string,
    timestamp: number,
    apiKey: string,
    cloudName: string,
    publicId?: string,
    folder?: string,
    overwrite?: boolean,
    invalidate?: boolean,
  }
  ```

### 签名算法
```typescript
// 参数排序后拼接
const paramsToSign = "folder=project poster&timestamp=1234567890"

// 添加 API Secret 并生成 SHA-256 hash
const signature = SHA256(paramsToSign + apiSecret)
```

---

## 🔒 安全性

### ✅ 已实施的安全措施
1. **认证检查**：只有登录用户可以调用
2. **API Secret 隐藏**：只存在于 Firebase Functions 环境变量中
3. **签名验证**：Cloudinary 服务器验证签名有效性
4. **Region 限制**：部署在亚太地区（低延迟）

### ⚠️ 建议的额外安全措施
1. **权限检查**：检查用户是否有上传权限
2. **文件类型限制**：在 Cloud Function 中验证文件类型
3. **配额限制**：限制每个用户的上传次数
4. **日志记录**：记录所有上传操作到 audit logs

---

## 💰 成本估算

### Firebase Functions 定价（按请求计费）
- **免费额度**: 200万次调用/月
- **超出后**: $0.40 / 100万次调用

### 预估使用量
- 假设每月 100 次活动海报上传
- 每次上传调用 1 次 Cloud Function
- **月成本**: $0（在免费额度内）

---

## 🐛 故障排查

### 问题：函数未找到
```bash
# 确认函数已部署
firebase functions:list

# 查看部署日志
firebase deploy --only functions --debug
```

### 问题：签名验证失败
```bash
# 检查配置
firebase functions:config:get

# 验证 API Secret 是否正确
```

### 问题：权限错误
```bash
# 确保用户已登录
# 检查 context.auth 是否存在
```

---

## 📝 更新日志

### v1.0.0 (2025-11-02)
- ✅ 初始实现 `generateCloudinarySignature`
- ✅ 实现 `deleteCloudinaryImage`
- ✅ 支持覆盖上传以节省存储空间
- ✅ 完整的错误处理和日志记录

