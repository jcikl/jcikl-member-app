/**
 * Global Validation Configuration
 * 全局验证配置
 */

export const GLOBAL_VALIDATION_CONFIG = {
  // ========== Validation Rules (Regex) ==========
  VALIDATION_RULES: {
    // Email
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

    // Phone Numbers (Multi-country)
    phone: {
      MY: /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/, // Malaysia
      CN: /^1[3-9]\d{9}$/, // China
      SG: /^(\+65)?[689]\d{7}$/, // Singapore
    },

    // Password (8+ chars, uppercase, lowercase, number)
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,

    // Member ID Format
    memberId: /^JCI-[A-Z]{2,3}-\d{6}$/,

    // Transaction Number Format
    transactionNumber: /^TXN-\d{4}-\d{4}-\d{4}$/,

    // URL
    url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,

    // Numbers
    number: /^\d+$/,
    decimal: /^\d+(\.\d+)?$/,
    positiveNumber: /^[1-9]\d*$/,
  },

  // ========== Error Messages ==========
  ERROR_MESSAGES: {
    email: '请输入有效的邮箱地址',
    phone: '请输入有效的电话号码',
    password: '密码必须包含大小写字母和数字，至少8位',
    required: '此字段为必填项',
    min: (min: number) => `最小长度为 ${min} 个字符`,
    max: (max: number) => `最大长度为 ${max} 个字符`,
    minValue: (min: number) => `最小值为 ${min}`,
    maxValue: (max: number) => `最大值为 ${max}`,
    url: '请输入有效的URL地址',
    number: '请输入数字',
    positiveNumber: '请输入正整数',
  },

  // ========== Field Length Limits ==========
  FIELD_LIMITS: {
    shortText: 50, // Names, titles
    mediumText: 200, // Descriptions
    longText: 1000, // Detailed descriptions
    richText: 5000, // Articles, content
  },
} as const;

/**
 * Global Validation Service
 * 全局验证服务
 */
export const globalValidationService = {
  /**
   * Validate email
   */
  validateEmail: (email: string): boolean => {
    return GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.email.test(email);
  },

  /**
   * Validate phone number
   */
  validatePhone: (phone: string, country: 'MY' | 'CN' | 'SG' = 'MY'): boolean => {
    return GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.phone[country].test(phone);
  },

  /**
   * Validate password strength
   */
  validatePassword: (password: string): boolean => {
    return GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.password.test(password);
  },

  /**
   * Validate member ID format
   */
  validateMemberId: (memberId: string): boolean => {
    return GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.memberId.test(memberId);
  },

  /**
   * Validate transaction number format
   */
  validateTransactionNumber: (txnNumber: string): boolean => {
    return GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.transactionNumber.test(txnNumber);
  },

  /**
   * Validate URL
   */
  validateUrl: (url: string): boolean => {
    return GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.url.test(url);
  },

  /**
   * Get error message
   */
  getErrorMessage: (type: keyof typeof GLOBAL_VALIDATION_CONFIG.ERROR_MESSAGES): string => {
    const message = GLOBAL_VALIDATION_CONFIG.ERROR_MESSAGES[type];
    return typeof message === 'string' ? message : '';
  },

  /**
   * Create Yup validation schema (helper)
   */
  createSchema: (fields: Record<string, 'email' | 'phone' | 'password' | 'required'>) => {
    // This will be implemented when integrating with Yup
    console.log('Schema fields:', fields);
    return fields;
  },
};

console.log('✅ Global Validation Settings Loaded');


