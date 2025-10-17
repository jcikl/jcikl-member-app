/**
 * Data Helper Functions
 * 数据辅助函数
 * 
 * ⚠️ CRITICAL: Always use cleanUndefinedValues before Firebase writes
 */

/**
 * Clean undefined values from object
 * Firebase does not accept undefined values, must convert to null
 * 
 * @param obj - Object to clean
 * @returns Cleaned object with undefined → null
 */
export const cleanUndefinedValues = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else if (value === null) {
        cleaned[key] = null;
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(cleanUndefinedValues);
      } else if (typeof value === 'object') {
        cleaned[key] = cleanUndefinedValues(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned as T;
  }

  return obj;
};

/**
 * Remove null and undefined values from object
 */
export const removeNullish = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result as Partial<T>;
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string') return obj.trim().length === 0;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Get nested object value safely
 */
export const getNestedValue = (obj: any, path: string, defaultValue?: any): any => {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result ?? defaultValue;
};

/**
 * Set nested object value
 */
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format number with thousand separator
 */
export const formatNumber = (num: number, decimals = 0): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format currency (RM)
 */
export const formatCurrency = (amount: number, decimals = 2): string => {
  return `RM ${formatNumber(amount, decimals)}`;
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (currencyString: string): number => {
  return parseFloat(currencyString.replace(/[^0-9.-]+/g, ''));
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calculate name similarity (for matching)
 */
export const calculateNameSimilarity = (name1: string, name2: string): number => {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longerLength - editDistance) / longerLength;
};

/**
 * Calculate edit distance (Levenshtein distance)
 */
const getEditDistance = (s1: string, s2: string): number => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
};

console.log('✅ Data Helpers Loaded');


