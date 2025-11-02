@echo off
REM ============================================================
REM Firebase Cloud Functions 配置脚本
REM 用于设置 Cloudinary API 凭证
REM ============================================================

echo.
echo ================================================
echo Firebase Cloud Functions - Cloudinary 配置
echo ================================================
echo.

REM 检查是否登录 Firebase
echo 检查 Firebase 登录状态...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 您尚未登录 Firebase
    echo 请先运行: firebase login
    pause
    exit /b 1
)

echo ✅ Firebase 登录成功
echo.

REM 提示用户输入 Cloudinary 凭证
echo 请从 Cloudinary Dashboard 获取以下信息:
echo https://cloudinary.com/console/settings/api-keys
echo.

set /p CLOUD_NAME="请输入 Cloud Name (drpa1zcmp): "
if "%CLOUD_NAME%"=="" set CLOUD_NAME=drpa1zcmp

set /p API_KEY="请输入 API Key: "
if "%API_KEY%"=="" (
    echo ❌ API Key 不能为空
    pause
    exit /b 1
)

set /p API_SECRET="请输入 API Secret (点击眼睛图标显示): "
if "%API_SECRET%"=="" (
    echo ❌ API Secret 不能为空
    pause
    exit /b 1
)

echo.
echo 正在配置 Firebase Functions...
echo.

REM 设置环境变量
firebase functions:config:set cloudinary.cloud_name="%CLOUD_NAME%" cloudinary.api_key="%API_KEY%" cloudinary.api_secret="%API_SECRET%"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 配置成功！
    echo.
    echo 当前配置：
    firebase functions:config:get
    echo.
    echo 下一步：
    echo 1. 运行 'cd functions' 进入函数目录
    echo 2. 运行 'npm run build' 构建函数
    echo 3. 返回项目根目录 'cd ..'
    echo 4. 运行 'firebase deploy --only functions' 部署函数
) else (
    echo ❌ 配置失败，请检查错误信息
)

echo.
pause

