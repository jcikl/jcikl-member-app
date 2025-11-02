@echo off
REM ============================================================
REM 部署 Firebase Cloud Functions
REM ============================================================

echo.
echo ================================================
echo 部署 Firebase Cloud Functions
echo ================================================
echo.

REM 1. 构建 TypeScript
echo [1/3] 构建 TypeScript...
cd functions
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ 构建成功
echo.

REM 2. 部署到 Firebase
echo [2/3] 部署到 Firebase...
firebase deploy --only functions
if %errorlevel% neq 0 (
    echo ❌ 部署失败
    pause
    exit /b 1
)
echo ✅ 部署成功
echo.

REM 3. 验证部署
echo [3/3] 验证部署...
firebase functions:list
echo.

echo ================================================
echo 🎉 部署完成！
echo ================================================
echo.
echo 已部署的函数:
echo - generateCloudinarySignature (签名生成)
echo - deleteCloudinaryImage (图片删除)
echo.
echo 下一步: 在应用中测试图片上传功能
echo.
pause

