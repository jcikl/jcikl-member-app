@echo off
echo ====================================
echo 🔥 Firestore 规则部署脚本
echo ====================================
echo.

echo 📋 步骤 1: 检查 Firebase CLI...
firebase --version
if errorlevel 1 (
    echo ❌ Firebase CLI 未安装
    echo 请运行: npm install -g firebase-tools
    pause
    exit /b 1
)
echo ✅ Firebase CLI 已安装
echo.

echo 📋 步骤 2: 验证 Firebase 登录状态...
firebase login:list
echo.
echo 如果未登录，请运行: firebase login
echo.

echo 📋 步骤 3: 确认项目...
firebase use
echo.

echo 📋 步骤 4: 部署 Firestore 规则...
firebase deploy --only firestore:rules
echo.

if errorlevel 1 (
    echo ❌ 部署失败
    echo.
    echo 💡 故障排查:
    echo 1. 确保已登录: firebase login
    echo 2. 确保项目已选择: firebase use jci-kl-membership-app
    echo 3. 检查 firestore.rules 文件是否存在
    pause
    exit /b 1
) else (
    echo.
    echo ====================================
    echo ✅ 部署成功！
    echo ====================================
    echo.
    echo 📝 下一步:
    echo 1. 等待 1-2 分钟让规则生效
    echo 2. 清除浏览器缓存 (Ctrl+Shift+Delete)
    echo 3. 刷新页面 (Ctrl+F5)
    echo 4. 测试注册功能
    echo.
    pause
)

