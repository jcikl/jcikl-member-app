@echo off
echo ========================================
echo Netlify Deployment Script
echo JCI KL Membership App
echo ========================================
echo.

echo [1/4] Logging in to Netlify...
echo Opening browser for authentication...
call netlify login
echo.

echo [2/4] Initializing Netlify project...
echo Follow the prompts:
echo   - Create ^& configure a new site
echo   - Build command: npm run build
echo   - Publish directory: dist
echo.
call netlify init
echo.

echo [3/4] Setting environment variables...
echo.
echo Setting CLOUDINARY_CLOUD_NAME...
call netlify env:set CLOUDINARY_CLOUD_NAME drpa1zcmp
echo.
echo Setting CLOUDINARY_API_KEY...
call netlify env:set CLOUDINARY_API_KEY 659937865548447
echo.
echo Setting CLOUDINARY_API_SECRET...
call netlify env:set CLOUDINARY_API_SECRET 7Sb7nOCHF2NOo07J4L6cypiIpFM
echo.

echo [4/4] Deploying to production...
echo This may take 1-2 minutes...
echo.
call netlify deploy --prod
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy your site URL from above
echo 2. Open your site in browser
echo 3. Test image upload functionality
echo 4. Check browser console for logs
echo.
echo Expected log: "Signature received from Netlify"
echo ========================================
pause

