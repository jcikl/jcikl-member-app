import { message as staticMessage } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { globalSystemService } from '@/config';

/**
 * Error Helper Functions
 * 错误处理辅助函数
 * 
 * 注意：这些函数接受可选的 message 实例参数
 * 推荐在 React 组件中使用 App.useApp() 获取 message 实例并传入
 * 如果不传入，将使用静态 API(会有弃用警告)
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
 * @param error - Error object
 * @param customMessage - Custom error message (optional)
 * @param messageInstance - Message instance from App.useApp() (optional, recommended)
 */
export const showError = (
  error: any, 
  customMessage?: string,
  messageInstance?: MessageInstance
): void => {
  const errorMessage = customMessage || handleFirebaseError(error);
  const msgApi = messageInstance || staticMessage;
  msgApi.error(errorMessage);
  globalSystemService.logError(error instanceof Error ? error : new Error(String(error)));
};

/**
 * Show success message
 * @param msg - Success message
 * @param messageInstance - Message instance from App.useApp() (optional, recommended)
 */
export const showSuccess = (msg: string, messageInstance?: MessageInstance): void => {
  const msgApi = messageInstance || staticMessage;
  msgApi.success(msg);
};

/**
 * Show warning message
 * @param msg - Warning message
 * @param messageInstance - Message instance from App.useApp() (optional, recommended)
 */
export const showWarning = (msg: string, messageInstance?: MessageInstance): void => {
  const msgApi = messageInstance || staticMessage;
  msgApi.warning(msg);
};

/**
 * Show info message
 * @param msg - Info message
 * @param messageInstance - Message instance from App.useApp() (optional, recommended)
 */
export const showInfo = (msg: string, messageInstance?: MessageInstance): void => {
  const msgApi = messageInstance || staticMessage;
  msgApi.info(msg);
};

/**
 * Handle async operation with error handling
 * @param operation - Async operation to execute
 * @param successMessage - Success message (optional)
 * @param errorMessage - Error message (optional)
 * @param messageInstance - Message instance from App.useApp() (optional, recommended)
 */
export const handleAsyncOperation = async <T>(
  operation: () => Promise<T>,
  successMessage?: string,
  errorMessage?: string,
  messageInstance?: MessageInstance
): Promise<T | null> => {
  try {
    const result = await operation();
    if (successMessage) {
      showSuccess(successMessage, messageInstance);
    }
    return result;
  } catch (error) {
    showError(error, errorMessage, messageInstance);
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




