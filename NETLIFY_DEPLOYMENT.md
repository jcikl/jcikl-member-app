# Netlify 部署指南

## 🚨 重要修复：SPA 路由 404 问题

本项目已添加 Netlify 配置文件来解决单页应用（SPA）路由 404 错误。

### 问题描述
当直接访问应用的子路由（如 `/login`、`/events`）时，Netlify 会返回 404 错误。这是因为 Netlify 尝试查找该路径的文件，但 SPA 的路由是由客户端的 React Router 处理的。

### 解决方案
已添加以下配置文件：

#### 1. `public/_redirects`
简单的重定向规则，将所有请求重定向到 `index.html`：
```
/*    /index.html   200
```

#### 2. `netlify.toml`
完整的 Netlify 配置文件，包含：
- ✅ 构建命令和发布目录配置
- ✅ SPA 路由重定向规则
- ✅ 安全响应头
- ✅ 静态资源缓存策略
- ✅ 资源压缩和优化

---

## 🚀 部署步骤

### 方法 1: 通过 Git 自动部署 (推荐)

1. **提交新增的配置文件**:
   ```bash
   git add public/_redirects netlify.toml
   git commit -m "fix: Add Netlify SPA routing configuration"
   git push origin main
   ```

2. **自动触发部署**:
   - Netlify 会自动检测到 Git 仓库的更新
   - 自动运行构建并部署
   - 等待 2-3 分钟完成部署

3. **验证**:
   - 访问 `https://jcikl2025.netlify.app/login`
   - 应该能正常显示登录页面，不再出现 404

---

### 方法 2: 手动构建并上传

如果 Git 自动部署不可用，可以手动上传：

1. **本地构建**:
   ```bash
   npm run build
   ```

2. **上传到 Netlify**:
   - 登录 [Netlify Dashboard](https://app.netlify.com/)
   - 找到 `jcikl2025` 站点
   - 点击 "Deploys" → "Deploy manually"
   - 拖拽 `dist` 文件夹到上传区域

3. **验证部署**:
   - 部署完成后测试所有路由

---

## 🔧 Netlify 配置说明

### 构建设置
- **构建命令**: `npm run build`
- **发布目录**: `dist`
- **Node 版本**: 18

### 重定向规则
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

这条规则的含义：
- 所有路径 (`/*`) 都会被重定向到 `index.html`
- HTTP 状态码 200（而不是 301/302），这样 URL 不会改变
- `force = false` 表示如果存在实际文件，优先使用实际文件

### 安全响应头
已配置以下安全响应头：
- `X-Frame-Options`: 防止点击劫持
- `X-Content-Type-Options`: 防止 MIME 类型嗅探
- `X-XSS-Protection`: XSS 过滤
- `Referrer-Policy`: 控制 Referrer 信息

### 缓存策略
- **HTML 文件**: 不缓存，始终获取最新版本
- **静态资源** (`/assets/*`): 缓存 1 年（使用内容哈希，安全缓存）

---

## 🧪 测试清单

部署完成后，请测试以下路由：

- [ ] https://jcikl2025.netlify.app/
- [ ] https://jcikl2025.netlify.app/login
- [ ] https://jcikl2025.netlify.app/register
- [ ] https://jcikl2025.netlify.app/events
- [ ] https://jcikl2025.netlify.app/members
- [ ] 刷新任意页面，应该不会出现 404

---

## 📝 环境变量配置

如果应用使用了环境变量，需要在 Netlify 中配置：

1. 进入 Netlify Dashboard → Site settings → Environment variables
2. 添加以下变量（根据实际情况）：
   ```
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx
   VITE_FIREBASE_PROJECT_ID=xxx
   VITE_FIREBASE_STORAGE_BUCKET=xxx
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
   VITE_FIREBASE_APP_ID=xxx
   ```

3. 重新部署以应用环境变量

---

## 🔍 常见问题

### Q: 部署后仍然出现 404？
**A**: 
1. 检查 `dist` 目录中是否包含 `_redirects` 文件
2. 查看 Netlify 构建日志，确认构建成功
3. 清除浏览器缓存并强制刷新 (Ctrl+Shift+R)

### Q: 为什么需要两个配置文件？
**A**: 
- `public/_redirects`: 简单快速，Vite 构建时会自动复制到 `dist` 目录
- `netlify.toml`: 功能完整，可以配置构建、优化、安全等多个方面

两者都保留，确保配置生效。

### Q: 如何查看部署日志？
**A**: 
1. 登录 Netlify Dashboard
2. 进入站点 → Deploys
3. 点击具体的部署记录
4. 查看 "Deploy log" 了解构建过程

---

## 📚 参考文档

- [Netlify SPA Redirects](https://docs.netlify.com/routing/redirects/rewrites-proxies/#history-pushstate-and-single-page-apps)
- [Netlify Configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)

---

**最后更新**: 2025-10-18

