import dayjs from 'dayjs';

/**
 * Global System Settings
 * 全局系统设置
 */

export const GLOBAL_SYSTEM_CONFIG = {
  // ========== System Info ==========
  SYSTEM_NAME: 'JCI KL Membership System',
  SYSTEM_NAME_CN: '超级国际青年商会吉隆坡分会会员管理系统',
  SYSTEM_VERSION: '1.0.0',
  SYSTEM_LOCALE: 'zh-CN',

  // ========== Cache Configuration ==========
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
  CACHE_MAX_SIZE: 100, // Maximum cache entries

  // ========== File Upload Configuration ==========
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB for images
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  // ========== Pagination Configuration ==========
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,

  // ========== Date Format Configuration ==========
  DATE_FORMAT: {
    display: 'DD-MMM-YYYY', // 01-Jan-2024
    api: 'YYYY-MM-DD', // 2024-01-01
    datetime: 'YYYY-MM-DD HH:mm:ss', // 2024-01-01 12:00:00
    filename: 'YYYYMMDD', // 20240101
    iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO 8601
  },

  // ========== Fiscal Year Configuration ==========
  FISCAL_YEAR: {
    START_MONTH: 10, // October
    START_DAY: 1,
    END_MONTH: 9, // September
    END_DAY: 30,
  },

  // ========== Member Configuration ==========
  MEMBER: {
    ID_PREFIX: 'JCI-KL',
    MIN_AGE: 18,
    MAX_AGE: 40,
  },

  // ========== Transaction Configuration ==========
  TRANSACTION: {
    NUMBER_PREFIX: 'TXN',
    NUMBER_FORMAT: 'TXN-{YYYY}-{ACCT}-{SEQ}',
  },

  // ========== Session Configuration ==========
  SESSION: {
    TIMEOUT: 30 * 60 * 1000, // 30 minutes
    WARNING_TIME: 5 * 60 * 1000, // 5 minutes before timeout
  },
} as const;

/**
 * Global System Service
 * 全局系统服务
 */
export const globalSystemService = {
  /**
   * Get system configuration value
   */
  getConfig: <K extends keyof typeof GLOBAL_SYSTEM_CONFIG>(key: K) => {
    return GLOBAL_SYSTEM_CONFIG[key];
  },

  /**
   * Format date according to specified format
   */
  formatDate: (
    date: Date | string,
    format: keyof (typeof GLOBAL_SYSTEM_CONFIG)['DATE_FORMAT'] = 'display'
  ): string => {
    const formatString = GLOBAL_SYSTEM_CONFIG.DATE_FORMAT[format];
    return dayjs(date).format(formatString);
  },

  /**
   * Get current fiscal year
   */
  getFiscalYear: (date: Date | string = new Date()): number => {
    const d = dayjs(date);
    const year = d.year();
    const month = d.month() + 1; // dayjs months are 0-indexed

    if (month >= GLOBAL_SYSTEM_CONFIG.FISCAL_YEAR.START_MONTH) {
      return year; // Oct-Dec → Current year
    } else {
      return year - 1; // Jan-Sep → Previous year
    }
  },

  /**
   * Get fiscal year date range
   */
  getFiscalYearRange: (fiscalYear: number) => {
    const startDate = dayjs()
      .year(fiscalYear)
      .month(GLOBAL_SYSTEM_CONFIG.FISCAL_YEAR.START_MONTH - 1)
      .date(GLOBAL_SYSTEM_CONFIG.FISCAL_YEAR.START_DAY)
      .startOf('day');

    const endDate = dayjs()
      .year(fiscalYear + 1)
      .month(GLOBAL_SYSTEM_CONFIG.FISCAL_YEAR.END_MONTH - 1)
      .date(GLOBAL_SYSTEM_CONFIG.FISCAL_YEAR.END_DAY)
      .endOf('day');

    return {
      start: startDate.toDate(),
      end: endDate.toDate(),
      startISO: startDate.toISOString(),
      endISO: endDate.toISOString(),
    };
  },

  /**
   * Log error to console and tracking service
   */
  logError: (error: Error, context?: Record<string, unknown>) => {
    console.error('[System Error]', error, context);
    // TODO: Send to error tracking service (e.g., Sentry)
  },

  /**
   * Log message with level
   * @param level - Log level (info, warning, error)
   * @param message - Log message
   * @param source - Source location
   * @param context - Additional context
   */
  log: (level: 'info' | 'warning' | 'error', message: string, source: string, context?: Record<string, unknown>) => {
    const logData = { level, message, source, context, timestamp: new Date().toISOString() };
    
    if (level === 'error') {
      console.error(`[${source}]`, message, context);
    } else if (level === 'warning') {
      console.warn(`[${source}]`, message, context);
    } else {
      console.log(`[${source}]`, message, context);
    }
    
    // TODO: Send to logging service
  },

  /**
   * Validate file size
   */
  validateFileSize: (file: File, isImage = false): boolean => {
    const maxSize = isImage
      ? GLOBAL_SYSTEM_CONFIG.MAX_IMAGE_SIZE
      : GLOBAL_SYSTEM_CONFIG.MAX_FILE_SIZE;
    return file.size <= maxSize;
  },

  /**
   * Validate file type
   */
  validateFileType: (file: File, isImage = false): boolean => {
    const allowedTypes = isImage
      ? GLOBAL_SYSTEM_CONFIG.ALLOWED_IMAGE_TYPES
      : GLOBAL_SYSTEM_CONFIG.ALLOWED_FILE_TYPES;
    return allowedTypes.includes(file.type as any);
  },
};

console.log('✅ Global System Settings Loaded');

