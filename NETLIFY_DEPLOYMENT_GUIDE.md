# 🚀 Netlify Functions 部署指南

## ✅ 已完成的准备工作

1. ✅ Netlify CLI 已安装
2. ✅ Netlify 函数已创建 (`netlify/functions/cloudinary-signature.js`)
3. ✅ Netlify 配置文件已创建 (`netlify.toml`)
4. ✅ 前端代码已更新（调用 Netlify Function）

---

## 📋 部署步骤

### 步骤 1：登录 Netlify

```bash
netlify login
```

- 这会打开浏览器，登录您的 Netlify 账户
- 如果没有账户，先注册：https://app.netlify.com/signup
- **完全免费，无需信用卡**

---

### 步骤 2：初始化 Netlify 项目

```bash
netlify init
```

按照提示操作：
1. 选择 "Create & configure a new site"
2. 选择您的团队（通常是您的用户名）
3. 输入站点名称（例如：`jcikl-membership-app`）
4. 确认构建命令：`npm run build`
5. 确认发布目录：`dist`

---

### 步骤 3：设置环境变量

**方法 A：通过命令行**

```bash
netlify env:set CLOUDINARY_CLOUD_NAME drpa1zcmp
netlify env:set CLOUDINARY_API_KEY 659937865548447
netlify env:set CLOUDINARY_API_SECRET 7Sb7nOCHF2NOo07J4L6cypiIpFM
```

**方法 B：通过 Netlify Dashboard**

1. 访问：https://app.netlify.com/
2. 选择您的站点
3. 进入 "Site settings" → "Environment variables"
4. 点击 "Add a variable"
5. 添加以下 3 个变量：
   - `CLOUDINARY_CLOUD_NAME` = `drpa1zcmp`
   - `CLOUDINARY_API_KEY` = `659937865548447`
   - `CLOUDINARY_API_SECRET` = `7Sb7nOCHF2NOo07J4L6cypiIpFM`

---

### 步骤 4：部署到 Netlify

```bash
netlify deploy --prod
```

等待部署完成（约 1-2 分钟）

---

### 步骤 5：获取您的站点 URL

部署成功后，您会看到：

```
✔ Deployed to production!
   https://your-site-name.netlify.app
```

记下这个 URL！

---

### 步骤 6：测试 Netlify Function

打开浏览器开发者工具（F12），访问您的应用，上传一张海报，观察日志：

**预期成功日志**：
```javascript
🔐 [Cloudinary] Requesting signature from Netlify Function
✅ [Cloudinary] Signature received from Netlify
🔐 [Cloudinary] Using signed upload
♻️ [Cloudinary] Will overwrite existing image
✅ [Cloudinary] Upload successful: {
  wasOverwritten: true,
  uploadMode: 'signed'
}
💬 "图片已更新（覆盖旧图片，节省存储空间）"
```

---

## 🧪 本地测试（可选）

如果想在本地测试 Netlify Functions：

```bash
# 1. 创建本地环境变量文件
# 创建 .env 文件，内容如下：
CLOUDINARY_CLOUD_NAME=drpa1zcmp
CLOUDINARY_API_KEY=659937865548447
CLOUDINARY_API_SECRET=7Sb7nOCHF2NOo07J4L6cypiIpFM

# 2. 启动 Netlify Dev 服务器
netlify dev

# 这会同时启动：
# - 前端开发服务器（Vite）
# - Netlify Functions 服务器
# 访问: http://localhost:8888
```

---

## 🔧 故障排除

### 问题 1：Netlify Function 404 错误

**解决方案**：
```bash
# 重新部署
netlify deploy --prod
```

### 问题 2：环境变量未生效

**解决方案**：
1. 确认环境变量已在 Netlify Dashboard 设置
2. 重新部署：`netlify deploy --prod`
3. 清除浏览器缓存并刷新

### 问题 3：CORS 错误

**解决方案**：
- Netlify Functions 自动处理 CORS
- 确保 `netlify/functions/cloudinary-signature.js` 中的 CORS headers 正确

---

## 📊 Netlify 免费额度

- ✅ **Functions 调用**: 125,000 次/月
- ✅ **Functions 运行时间**: 100 小时/月
- ✅ **带宽**: 100 GB/月
- ✅ **构建分钟数**: 300 分钟/月

**您的预计使用**：约 100-500 次/月
**结论**：**完全在免费额度内** 💰

---

## 🎉 完成后的效果

✅ Cloudinary Signed Upload 正常工作
✅ 重新上传图片会自动覆盖旧文件
✅ 节省 Cloudinary 存储空间
✅ 更高的安全性
✅ 完全免费
✅ 无需信用卡

---

## 📞 获取帮助

如果遇到问题：
1. 检查 Netlify Functions 日志：https://app.netlify.com/ → 您的站点 → Functions
2. 检查浏览器控制台日志
3. 将错误信息告诉我

---

**祝您部署顺利！** 🚀

