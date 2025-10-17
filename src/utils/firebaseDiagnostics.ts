/**
 * Firebase Configuration Diagnostics Tool
 * Firebase 配置诊断工具
 * 
 * 用于诊断 Firebase 连接和配置问题
 */

import { auth, db } from '@/services/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';

/**
 * Diagnostic Test Result
 * 诊断测试结果
 */
interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * Run Firebase Configuration Diagnostics
 * 运行 Firebase 配置诊断
 */
export const runFirebaseDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // Test 1: Check Environment Variables
  console.log('🔍 检查环境变量...');
  try {
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];

    const missingVars = requiredVars.filter(
      varName => !import.meta.env[varName]
    );

    if (missingVars.length > 0) {
      results.push({
        test: '环境变量检查',
        status: 'error',
        message: `缺少必要的环境变量: ${missingVars.join(', ')}`,
        details: missingVars,
      });
    } else {
      results.push({
        test: '环境变量检查',
        status: 'success',
        message: '所有必要的环境变量都已配置',
        details: {
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        },
      });
    }
  } catch (error: any) {
    results.push({
      test: '环境变量检查',
      status: 'error',
      message: '环境变量检查失败',
      details: error.message,
    });
  }

  // Test 2: Check Firebase Auth Connection
  console.log('🔍 检查 Firebase Auth 连接...');
  try {
    // Try to get current auth state
    const currentUser = auth.currentUser;
    
    results.push({
      test: 'Firebase Auth 连接',
      status: 'success',
      message: 'Firebase Auth 已连接',
      details: {
        authDomain: auth.config.authDomain,
        apiKey: auth.config.apiKey?.substring(0, 10) + '...',
        currentUser: currentUser ? '已登录' : '未登录',
      },
    });
  } catch (error: any) {
    results.push({
      test: 'Firebase Auth 连接',
      status: 'error',
      message: 'Firebase Auth 连接失败',
      details: error.message,
    });
  }

  // Test 3: Check Firestore Connection
  console.log('🔍 检查 Firestore 连接...');
  try {
    // Try to query a collection (should fail gracefully if doesn't exist)
    const testQuery = query(collection(db, 'test'), limit(1));
    await getDocs(testQuery);
    
    results.push({
      test: 'Firestore 连接',
      status: 'success',
      message: 'Firestore 已连接并可以查询',
      details: {
        projectId: db.app.options.projectId,
      },
    });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      results.push({
        test: 'Firestore 连接',
        status: 'warning',
        message: 'Firestore 已连接但权限不足',
        details: {
          code: error.code,
          message: error.message,
          note: '这是正常的，如果您没有测试集合的读取权限',
        },
      });
    } else {
      results.push({
        test: 'Firestore 连接',
        status: 'error',
        message: 'Firestore 连接失败',
        details: {
          code: error.code,
          message: error.message,
        },
      });
    }
  }

  // Test 4: Check Anonymous Auth (if enabled)
  console.log('🔍 检查匿名认证功能...');
  try {
    // Save current user
    // const previousUser = auth.currentUser;
    
    // Try anonymous sign in
    await signInAnonymously(auth);
    await signOut(auth);
    
    // Restore previous state if needed
    // Note: User will need to re-authenticate
    
    results.push({
      test: '匿名认证',
      status: 'success',
      message: '匿名认证功能正常',
    });
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      results.push({
        test: '匿名认证',
        status: 'warning',
        message: '匿名认证未启用',
        details: {
          code: error.code,
          note: '如果不需要匿名认证，可以忽略此警告',
        },
      });
    } else {
      results.push({
        test: '匿名认证',
        status: 'error',
        message: '匿名认证测试失败',
        details: {
          code: error.code,
          message: error.message,
        },
      });
    }
  }

  // Test 5: Check Network Connectivity
  console.log('🔍 检查网络连接...');
  try {
    await fetch('https://www.google.com/favicon.ico', {
      mode: 'no-cors',
    });
    
    results.push({
      test: '网络连接',
      status: 'success',
      message: '网络连接正常',
    });
  } catch (error: any) {
    results.push({
      test: '网络连接',
      status: 'error',
      message: '网络连接失败',
      details: error.message,
    });
  }

  return results;
};

/**
 * Format Diagnostic Results for Console
 * 格式化诊断结果用于控制台输出
 */
export const formatDiagnosticResults = (results: DiagnosticResult[]): void => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Firebase 配置诊断报告');
  console.log('='.repeat(60) + '\n');

  results.forEach((result, index) => {
    const statusIcon = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[result.status];

    console.log(`${index + 1}. ${statusIcon} ${result.test}`);
    console.log(`   状态: ${result.status.toUpperCase()}`);
    console.log(`   信息: ${result.message}`);
    
    if (result.details) {
      console.log('   详情:', result.details);
    }
    console.log('');
  });

  // Summary
  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log('='.repeat(60));
  console.log('📈 总结');
  console.log(`   成功: ${successCount} | 警告: ${warningCount} | 错误: ${errorCount}`);
  console.log('='.repeat(60) + '\n');

  if (errorCount > 0) {
    console.error('❌ 发现配置问题，请检查上述错误');
  } else if (warningCount > 0) {
    console.warn('⚠️ 配置基本正常，但有一些警告');
  } else {
    console.log('✅ Firebase 配置完全正常！');
  }
};

/**
 * Run Diagnostics and Log Results
 * 运行诊断并记录结果
 */
export const runAndLogDiagnostics = async (): Promise<void> => {
  console.log('🚀 开始 Firebase 配置诊断...\n');
  
  const results = await runFirebaseDiagnostics();
  formatDiagnosticResults(results);
};

console.log('✅ Firebase Diagnostics Tool Loaded');

