@echo off
echo ======================================
echo 部署 financeEvents 权限规则
echo Deploying financeEvents Security Rules
echo ======================================
echo.

firebase deploy --only firestore:rules

echo.
echo ======================================
echo 部署完成！
echo Deployment Complete!
echo ======================================
pause

