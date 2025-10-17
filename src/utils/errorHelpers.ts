import { message } from 'antd';
import { globalSystemService } from '@/config';

/**
 * Error Helper Functions
 * 错误处理辅助函数
 */

/**
 * Handle Firebase error
 */
export const handleFirebaseError = (error: any): string => {
  const errorMessages: Record<string, string> = {
    // Email/Password Auth - Login
    'auth/user-not-found': '用户不存在',
    'auth/wrong-password': '密码错误',
    'auth/invalid-email': '邮箱格式无效',
    'auth/too-many-requests': '请求过于频繁，请稍后再试',
    'auth/user-disabled': '账号已被禁用',
    'auth/invalid-credential': '登录凭证无效',

    // Email/Password Auth - Registration
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/weak-password': '密码强度不够，至少需要6位字符',
    'auth/operation-not-allowed': '邮箱注册未启用，请联系管理员',
    'auth/invalid-password': '密码格式不正确',
    'auth/password-does-not-meet-requirements': '密码不符合安全要求',

    // Google Auth
    'auth/popup-closed-by-user': '登录已取消',
    'auth/popup-blocked': '弹窗被浏览器阻止，请允许弹窗后重试',
    'auth/cancelled-popup-request': '登录请求已取消',
    'auth/account-exists-with-different-credential': '该邮箱已使用其他方式注册',
    'auth/credential-already-in-use': '该凭证已被其他账号使用',

    // Firestore
    'permission-denied': '权限不足',
    'not-found': '数据不存在',
    'already-exists': '数据已存在',
    'unavailable': '服务暂时不可用',
  };

  const errorCode = error.code || 'unknown';
  const errorMessage = errorMessages[errorCode] || error.message || '操作失败，请重试';

  return errorMessage;
};

/**
 * Show error message
 */
export const showError = (error: any, customMessage?: string): void => {
  const errorMessage = customMessage || handleFirebaseError(error);
  message.error(errorMessage);
  globalSystemService.logError(error instanceof Error ? error : new Error(String(error)));
};

/**
 * Show success message
 */
export const showSuccess = (msg: string): void => {
  message.success(msg);
};

/**
 * Show warning message
 */
export const showWarning = (msg: string): void => {
  message.warning(msg);
};

/**
 * Show info message
 */
export const showInfo = (msg: string): void => {
  message.info(msg);
};

/**
 * Handle async operation with error handling
 */
export const handleAsyncOperation = async <T>(
  operation: () => Promise<T>,
  successMessage?: string,
  errorMessage?: string
): Promise<T | null> => {
  try {
    const result = await operation();
    if (successMessage) {
      showSuccess(successMessage);
    }
    return result;
  } catch (error) {
    showError(error, errorMessage);
    return null;
  }
};

/**
 * Retry async operation
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
};

console.log('✅ Error Helpers Loaded');


