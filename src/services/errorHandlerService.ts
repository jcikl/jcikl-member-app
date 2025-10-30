/**
 * Error Handler Service
 * 错误处理服务
 * 
 * 统一处理Firebase和应用错误，提供用户友好的错误消息
 */

import { FirebaseError } from 'firebase/app';
import { message } from 'antd';

/**
 * Firebase错误代码映射到用户友好的中文消息
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Authentication Errors
  'auth/email-already-in-use': '该邮箱已被注册',
  'auth/invalid-email': '邮箱格式不正确',
  'auth/user-disabled': '该账户已被禁用',
  'auth/user-not-found': '用户不存在',
  'auth/wrong-password': '密码错误',
  'auth/weak-password': '密码强度不够，至少需要6位字符',
  'auth/too-many-requests': '请求过于频繁，请稍后再试',
  'auth/network-request-failed': '网络连接失败，请检查您的网络',
  'auth/popup-blocked': '弹窗被浏览器阻止，请允许弹窗',
  'auth/popup-closed-by-user': '登录窗口已关闭',
  'auth/cancelled-popup-request': '登录请求已取消',
  'auth/requires-recent-login': '此操作需要重新登录',
  'auth/credential-already-in-use': '该凭证已被使用',

  // Firestore Errors
  'permission-denied': '权限不足，无法执行此操作',
  'not-found': '请求的数据不存在',
  'already-exists': '数据已存在',
  'resource-exhausted': '配额已用尽',
  'failed-precondition': '操作条件不满足',
  'aborted': '操作被中止',
  'out-of-range': '参数超出范围',
  'unimplemented': '功能未实现',
  'internal': '内部服务器错误',
  'unavailable': '服务暂时不可用，请稍后再试',
  'data-loss': '数据丢失',
  'unauthenticated': '未认证，请先登录',
  'deadline-exceeded': '请求超时',
  'cancelled': '操作已取消',
  'invalid-argument': '参数无效',

  // Storage Errors
  'storage/unauthorized': '无权访问存储',
  'storage/canceled': '上传已取消',
  'storage/unknown': '存储服务未知错误',
  'storage/object-not-found': '文件不存在',
  'storage/bucket-not-found': '存储桶不存在',
  'storage/project-not-found': '项目不存在',
  'storage/quota-exceeded': '存储配额已超出',
  'storage/unauthenticated': '未认证，无法访问存储',
  'storage/retry-limit-exceeded': '重试次数超限',
  'storage/invalid-checksum': '文件校验失败',
  'storage/invalid-event-name': '事件名称无效',
  'storage/invalid-url': 'URL格式无效',
  'storage/invalid-argument': '参数无效',
  'storage/no-default-bucket': '未配置默认存储桶',
  'storage/cannot-slice-blob': '文件切片失败',
  'storage/server-file-wrong-size': '服务器文件大小错误',
};

/**
 * 网络错误类型
 */
export enum NetworkErrorType {
  OFFLINE = 'offline',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown',
}

/**
 * 错误处理配置
 */
interface ErrorHandlerConfig {
  showNotification?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
  customMessage?: string;
}

/**
 * 处理Firebase错误
 */
export const handleFirebaseError = (
  error: FirebaseError | Error | unknown,
  config: ErrorHandlerConfig = {}
): string => {
  const {
    showNotification = true,
    logToConsole = true,
    customMessage,
  } = config;

  let errorMessage = customMessage || '操作失败，请稍后重试';

  // 处理Firebase错误
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as FirebaseError;
    errorMessage = FIREBASE_ERROR_MESSAGES[firebaseError.code] || errorMessage;

    if (logToConsole) {
      console.error('Firebase Error:', {
        code: firebaseError.code,
        message: firebaseError.message,
        customData: firebaseError.customData,
      });
    }
  }
  // 处理普通错误
  else if (error instanceof Error) {
    errorMessage = error.message || errorMessage;

    if (logToConsole) {
      console.error('Error:', error);
    }
  }
  // 处理未知错误
  else {
    if (logToConsole) {
      console.error('Unknown Error:', error);
    }
  }

  // 显示通知
  if (showNotification && !customMessage?.includes('popup-closed')) {
    message.error(errorMessage);
  }

  return errorMessage;
};

/**
 * 检测网络错误类型
 */
export const detectNetworkError = (error: any): NetworkErrorType => {
  if (!navigator.onLine) {
    return NetworkErrorType.OFFLINE;
  }

  if (error?.code === 'auth/network-request-failed' || 
      error?.code === 'unavailable') {
    return NetworkErrorType.TIMEOUT;
  }

  if (error?.code === 'internal' || 
      error?.code === 'unknown') {
    return NetworkErrorType.SERVER_ERROR;
  }

  return NetworkErrorType.UNKNOWN;
};

/**
 * 网络重试机制
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const networkErrorType = detectNetworkError(error);

      // 如果是离线错误，不再重试
      if (networkErrorType === NetworkErrorType.OFFLINE) {
        throw error;
      }

      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // 指数退避延迟
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`重试 ${attempt + 1}/${maxRetries} 在 ${delay}ms 后...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * 批量操作错误处理
 */
export const handleBatchErrors = (
  errors: Array<{ index: number; error: any }>,
  successCount: number
): void => {
  if (errors.length === 0) {
    message.success(`成功处理 ${successCount} 条数据`);
    return;
  }

  const failureCount = errors.length;
  
  if (successCount > 0) {
    message.warning(
      `部分成功：成功 ${successCount} 条，失败 ${failureCount} 条`
    );
  } else {
    message.error(`操作失败：${failureCount} 条数据处理失败`);
  }

  // 记录详细错误
  console.error('批量操作错误详情:', errors);
};

/**
 * 验证错误处理
 */
export const handleValidationError = (
  field: string,
  error: string
): string => {
  const validationMessages: Record<string, string> = {
    required: `${field}不能为空`,
    email: `${field}格式不正确`,
    phone: `${field}格式不正确`,
    minLength: `${field}长度不足`,
    maxLength: `${field}长度超出限制`,
    pattern: `${field}格式不符合要求`,
  };

  return validationMessages[error] || `${field}验证失败`;
};

/**
 * 离线状态检测
 */
export const setupOfflineDetection = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  const handleOnline = () => {
    message.success('网络已恢复连接');
    onOnline();
  };

  const handleOffline = () => {
    message.warning('网络连接已断开，正在使用离线模式');
    onOffline();
  };

  // 添加事件监听
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // 初始状态检查
  if (!navigator.onLine) {
    handleOffline();
  }

  // 返回清理函数
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * 错误日志记录(可选：发送到服务器)
 */
export const logErrorToServer = async (
  error: any,
  context: {
    userId?: string;
    action?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> => {
  try {
    // TODO: 实现错误日志发送到服务器
    console.log('错误日志:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
      timestamp: new Date().toISOString(),
    });
  } catch (loggingError) {
    console.error('错误日志记录失败:', loggingError);
  }
};

export default {
  handleFirebaseError,
  detectNetworkError,
  retryWithBackoff,
  handleBatchErrors,
  handleValidationError,
  setupOfflineDetection,
  logErrorToServer,
};

