@echo off
echo ========================================
echo Deploying Firebase Cloud Functions
echo ========================================
echo.

cd functions
echo Building TypeScript...
call npm run build
echo.

cd ..
echo Deploying to Firebase...
call firebase deploy --only functions
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
pause

