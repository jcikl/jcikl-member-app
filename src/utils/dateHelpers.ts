import { Timestamp } from 'firebase/firestore';
import { globalDateService } from '@/config/globalDateSettings';

/**
 * Date Helper Functions
 * 日期辅助函数
 */

/**
 * Safely convert Firestore Timestamp to ISO string
 * 
 * @param timestamp - Firestore Timestamp or Date or string
 * @returns ISO string
 */
export const safeTimestampToISO = (timestamp: any): string | undefined => {
  // Handle Firestore Timestamp - 检查 toDate 方法
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Handle Firestore Timestamp - 直接通过 seconds 构造（用于序列化的 Timestamp 对象）
  if (timestamp && typeof timestamp === 'object' && 
      'seconds' in timestamp && 'nanoseconds' in timestamp) {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return date.toISOString();
  }

  // Handle Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // Handle string
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }

  // Handle number (timestamp in ms)
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }

  // Fallback: return undefined (don't default to current time)
  return undefined;
};

/**
 * Convert ISO string or Date to Firestore Timestamp
 */
export const toFirestoreTimestamp = (date: Date | string): Timestamp => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  return Timestamp.fromDate(new Date(date));
};

/**
 * Get current timestamp for Firestore
 */
export const getCurrentTimestamp = (): Timestamp => {
  return Timestamp.now();
};

/**
 * Format Firestore Timestamp for display
 */
export const formatTimestamp = (
  timestamp: any,
  format: 'display' | 'datetime' | 'api' = 'display'
): string => {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return globalDateService.formatDate(date, format);
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is in current fiscal year
 */
export const isInCurrentFiscalYear = (date: Date | string): boolean => {
  const { start, end } = globalDateService.getCurrentFiscalYearRange();
  const checkDate = new Date(date);
  return checkDate >= start && checkDate <= end;
};

/**
 * Get age from birth date
 */
export const getAge = (birthDate: Date | string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Get date range for a period
 */
export const getDateRange = (
  period: 'today' | 'yesterday' | 'week' | 'month' | 'year'
): { start: Date; end: Date } => {
  const today = new Date();
  let start: Date;
  let end: Date = new Date();

  switch (period) {
    case 'today':
      start = globalDateService.startOf(today, 'day');
      end = globalDateService.endOf(today, 'day');
      break;
    case 'yesterday':
      start = globalDateService.startOf(
        globalDateService.subtractTime(today, 1, 'day'),
        'day'
      );
      end = globalDateService.endOf(
        globalDateService.subtractTime(today, 1, 'day'),
        'day'
      );
      break;
    case 'week':
      start = globalDateService.startOf(today, 'week');
      end = globalDateService.endOf(today, 'week');
      break;
    case 'month':
      start = globalDateService.startOf(today, 'month');
      end = globalDateService.endOf(today, 'month');
      break;
    case 'year':
      start = globalDateService.startOf(today, 'year');
      end = globalDateService.endOf(today, 'year');
      break;
    default:
      start = today;
      end = today;
  }

  return { start, end };
};

/**
 * Check if date is expired
 */
export const isExpired = (date: Date | string): boolean => {
  return new Date(date) < new Date();
};

/**
 * Get days until date
 */
export const getDaysUntil = (date: Date | string): number => {
  return globalDateService.diff(new Date(date), new Date(), 'day');
};

/**
 * Get hours until date
 */
export const getHoursUntil = (date: Date | string): number => {
  return globalDateService.diff(new Date(date), new Date(), 'hour');
};

/**
 * Format duration (in seconds) to human readable string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 
      ? `${hours} 小时 ${remainingMinutes} 分钟`
      : `${hours} 小时`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0
    ? `${days} 天 ${remainingHours} 小时`
    : `${days} 天`;
};

/**
 * Generate year options for dropdowns
 * 生成年份选项（用于下拉框）
 * 
 * @param startYear - Starting year (default: 2020)
 * @param futureYears - Number of future years to include (default: 2)
 * @returns Array of year strings in descending order
 */
export const generateYearOptions = (startYear: number = 2020, futureYears: number = 2): string[] => {
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + futureYears;
  const years: string[] = [];
  
  for (let year = endYear; year >= startYear; year--) {
    years.push(String(year));
  }
  
  return years;
};

/**
 * Generate fiscal year options for dropdowns
 * 生成财年选项（用于下拉框）
 * 
 * @param startYear - Starting year (default: 2020)
 * @param futureYears - Number of future years to include (default: 2)
 * @returns Array of fiscal year strings (e.g., "FY2025") in descending order
 */
export const generateFiscalYearOptions = (startYear: number = 2020, futureYears: number = 2): string[] => {
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + futureYears;
  const fiscalYears: string[] = [];
  
  for (let year = endYear; year >= startYear; year--) {
    fiscalYears.push(`FY${year}`);
  }
  
  return fiscalYears;
};

console.log('✅ Date Helpers Loaded');


