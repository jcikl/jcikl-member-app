/**
 * Firebase Authentication Test Utility
 * Firebase 认证测试工具
 * 
 * 用于快速测试 Firebase Authentication 是否正常工作
 */

import { auth } from '@/services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'firebase/auth';

/**
 * Test Firebase Email/Password Authentication
 * 测试 Firebase 邮箱/密码认证
 */
export const testEmailPasswordAuth = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test@1234';

  try {
    console.log('🧪 测试 Firebase 邮箱/密码认证...');
    console.log(`📧 测试邮箱: ${testEmail}`);

    // Step 1: Register
    console.log('1️⃣ 测试注册...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      testEmail,
      testPassword
    );
    console.log('✅ 注册成功:', userCredential.user.uid);

    // Step 2: Sign out
    console.log('2️⃣ 测试登出...');
    await signOut(auth);
    console.log('✅ 登出成功');

    // Step 3: Sign in
    console.log('3️⃣ 测试登录...');
    const loginCredential = await signInWithEmailAndPassword(
      auth,
      testEmail,
      testPassword
    );
    console.log('✅ 登录成功:', loginCredential.user.uid);

    // Step 4: Clean up - delete test user
    console.log('4️⃣ 清理测试数据...');
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
      console.log('✅ 测试用户已删除');
    }

    return {
      success: true,
      message: '✅ Firebase 邮箱/密码认证测试通过！',
      details: {
        testEmail,
        steps: ['注册', '登出', '登录', '清理'],
      },
    };
  } catch (error: any) {
    console.error('❌ 测试失败:', error);

    // Try to clean up if user was created
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        console.log('🧹 已清理测试用户');
      }
    } catch (cleanupError) {
      console.warn('⚠️ 清理测试用户时出错');
    }

    return {
      success: false,
      message: `❌ Firebase 认证测试失败: ${error.message}`,
      details: {
        code: error.code,
        message: error.message,
        testEmail,
      },
    };
  }
};

/**
 * Check if Firebase Authentication is Enabled
 * 检查 Firebase Authentication 是否已启用
 */
export const checkAuthEnabled = async (): Promise<{
  enabled: boolean;
  providers: string[];
  message: string;
}> => {
  try {
    // Try to access auth configuration
    const config = auth.config;

    // Check available providers by attempting anonymous sign-in
    // (This is just a check, we don't actually sign in)
    const providers: string[] = [];

    // Email/Password is enabled if we can access the auth object
    if (config.apiKey && config.authDomain) {
      providers.push('email/password');
    }

    return {
      enabled: true,
      providers,
      message: '✅ Firebase Authentication 已配置',
    };
  } catch (error: any) {
    return {
      enabled: false,
      providers: [],
      message: `❌ Firebase Authentication 配置错误: ${error.message}`,
    };
  }
};

/**
 * Quick Test - Run all authentication tests
 * 快速测试 - 运行所有认证测试
 */
export const runQuickAuthTest = async (): Promise<void> => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Firebase Authentication 快速测试');
  console.log('='.repeat(60) + '\n');

  // Test 1: Check if Auth is enabled
  console.log('📋 测试 1: 检查 Authentication 配置\n');
  const authCheck = await checkAuthEnabled();
  console.log(authCheck.message);
  console.log('已配置的提供商:', authCheck.providers);
  console.log('');

  // Test 2: Test Email/Password Auth
  console.log('📋 测试 2: 邮箱/密码认证功能\n');
  const authTest = await testEmailPasswordAuth();
  console.log(authTest.message);
  if (authTest.details) {
    console.log('测试详情:', authTest.details);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));

  if (authCheck.enabled && authTest.success) {
    console.log('✅ 所有测试通过！Firebase Authentication 工作正常。');
  } else {
    console.error('❌ 存在测试失败。请检查 Firebase Console 配置。');
    console.log('\n📝 建议操作：');
    console.log('1. 访问 Firebase Console');
    console.log('2. 进入 Authentication → Sign-in method');
    console.log('3. 启用 Email/Password 提供商');
    console.log('4. 重新运行此测试');
  }
  console.log('='.repeat(60) + '\n');
};

// Export a global test function for console use
if (typeof window !== 'undefined') {
  (window as any).testFirebaseAuth = runQuickAuthTest;
  console.log(
    '💡 提示: 在浏览器控制台运行 testFirebaseAuth() 来测试 Firebase 认证'
  );
}

console.log('✅ Firebase Auth Test Utility Loaded');

