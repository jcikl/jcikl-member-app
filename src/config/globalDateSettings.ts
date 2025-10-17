import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * Global Date Configuration
 * 全局日期配置
 */

export const GLOBAL_DATE_CONFIG = {
  // ========== Date Formats ==========
  FORMATS: {
    display: 'DD-MMM-YYYY', // 01-Jan-2024
    displayCN: 'YYYY年MM月DD日', // 2024年01月01日
    api: 'YYYY-MM-DD', // 2024-01-01
    datetime: 'YYYY-MM-DD HH:mm:ss', // 2024-01-01 12:00:00
    datetimeCN: 'YYYY年MM月DD日 HH:mm', // 2024年01月01日 12:00
    time: 'HH:mm:ss', // 12:00:00
    timeShort: 'HH:mm', // 12:00
    filename: 'YYYYMMDD', // 20240101
    iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO 8601
    month: 'YYYY-MM', // 2024-01
    monthCN: 'YYYY年MM月', // 2024年01月
    year: 'YYYY', // 2024
    dayOfWeek: 'dddd', // Monday
    dayOfWeekCN: 'dddd', // 星期一 (with zh-cn locale)
  },

  // ========== Timezone ==========
  TIMEZONE: 'Asia/Kuala_Lumpur', // Malaysia timezone

  // ========== Locale ==========
  LOCALE: 'zh-cn',
} as const;

/**
 * Global Date Service
 * 全局日期服务
 */
export const globalDateService = {
  /**
   * Format date according to specified format
   */
  formatDate: (
    date: Date | string | number,
    format: keyof typeof GLOBAL_DATE_CONFIG.FORMATS = 'display'
  ): string => {
    const formatString = GLOBAL_DATE_CONFIG.FORMATS[format];
    return dayjs(date).format(formatString);
  },

  /**
   * Parse date string
   */
  parseDate: (dateString: string, format?: string): Date => {
    if (format) {
      return dayjs(dateString, format).toDate();
    }
    return dayjs(dateString).toDate();
  },

  /**
   * Get current date/time
   */
  now: (): Date => {
    return dayjs().toDate();
  },

  /**
   * Get current ISO string
   */
  nowISO: (): string => {
    return dayjs().toISOString();
  },

  /**
   * Check if date is valid
   */
  isValid: (date: Date | string): boolean => {
    return dayjs(date).isValid();
  },

  /**
   * Add time to date
   */
  addTime: (
    date: Date | string,
    amount: number,
    unit: 'day' | 'week' | 'month' | 'year' | 'hour' | 'minute'
  ): Date => {
    return dayjs(date).add(amount, unit).toDate();
  },

  /**
   * Subtract time from date
   */
  subtractTime: (
    date: Date | string,
    amount: number,
    unit: 'day' | 'week' | 'month' | 'year' | 'hour' | 'minute'
  ): Date => {
    return dayjs(date).subtract(amount, unit).toDate();
  },

  /**
   * Get start of period
   */
  startOf: (date: Date | string, unit: 'day' | 'week' | 'month' | 'year'): Date => {
    return dayjs(date).startOf(unit).toDate();
  },

  /**
   * Get end of period
   */
  endOf: (date: Date | string, unit: 'day' | 'week' | 'month' | 'year'): Date => {
    return dayjs(date).endOf(unit).toDate();
  },

  /**
   * Calculate difference between dates
   */
  diff: (
    date1: Date | string,
    date2: Date | string,
    unit: 'day' | 'month' | 'year' | 'hour' | 'minute' = 'day'
  ): number => {
    return dayjs(date1).diff(dayjs(date2), unit);
  },

  /**
   * Check if date is before another date
   */
  isBefore: (date1: Date | string, date2: Date | string): boolean => {
    return dayjs(date1).isBefore(dayjs(date2));
  },

  /**
   * Check if date is after another date
   */
  isAfter: (date1: Date | string, date2: Date | string): boolean => {
    return dayjs(date1).isAfter(dayjs(date2));
  },

  /**
   * Check if date is between two dates
   */
  isBetween: (date: Date | string, start: Date | string, end: Date | string): boolean => {
    const d = dayjs(date);
    return d.isAfter(dayjs(start)) && d.isBefore(dayjs(end));
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  fromNow: (date: Date | string): string => {
    return dayjs(date).fromNow();
  },

  /**
   * Get date range for current fiscal year
   */
  getCurrentFiscalYearRange: (): { start: Date; end: Date } => {
    const today = dayjs();
    const currentYear = today.year();
    const currentMonth = today.month() + 1; // 1-12

    let fiscalYear = currentYear;
    if (currentMonth < 10) {
      fiscalYear = currentYear - 1;
    }

    const start = dayjs().year(fiscalYear).month(9).date(1).startOf('day'); // Oct 1
    const end = dayjs()
      .year(fiscalYear + 1)
      .month(8)
      .date(30)
      .endOf('day'); // Sep 30

    return {
      start: start.toDate(),
      end: end.toDate(),
    };
  },
};

console.log('✅ Global Date Settings Loaded');

