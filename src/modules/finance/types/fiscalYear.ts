/**
 * Fiscal Year Module Type Definitions
 * 财年模块类型定义
 */

import { BaseEntity } from '@/types';

// ========== Fiscal Year Configuration ==========
export interface FiscalYearConfig extends BaseEntity {
  id: string;
  name: string;           // 财年名称，如 "JCI KL 财年"
  startMonth: number;     // 起始月份 (1-12)
  startDay: number;       // 起始日期 (1-31)
  isActive: boolean;      // 是否启用
  isDefault: boolean;     // 是否为默认配置
  description?: string;   // 描述
  organizationId?: string; // 组织ID（支持多组织）
}

// ========== Fiscal Year Period ==========
export interface FiscalYearPeriod {
  fiscalYear: string;     // 财年标识，如 "2024-2025"
  displayName: string;    // 显示名称，如 "FY2024-25"
  startDate: string;      // 开始日期 (ISO格式)
  endDate: string;        // 结束日期 (ISO格式)
  year: number;          // 财年开始年份
  isCurrent: boolean;     // 是否为当前财年
  isCompleted: boolean;   // 是否已完成
  progressPercentage: number; // 财年进度百分比
  daysRemaining: number;  // 剩余天数
  daysElapsed: number;    // 已过天数
  totalDays: number;      // 总天数
}

// ========== Fiscal Year Status ==========
export interface FiscalYearStatus {
  currentPeriod: FiscalYearPeriod | null;
  nextPeriod: FiscalYearPeriod | null;
  previousPeriod: FiscalYearPeriod | null;
  config: FiscalYearConfig;
  suggestions: FiscalYearSuggestion[];
}

// ========== Fiscal Year Suggestion ==========
export interface FiscalYearSuggestion {
  type: 'current' | 'next' | 'previous' | 'custom';
  period: FiscalYearPeriod;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// ========== Fiscal Year Calculation Options ==========
export interface FiscalYearCalculationOptions {
  config: FiscalYearConfig;
  targetYear?: number;    // 目标年份（可选）
  includeProgress?: boolean; // 是否包含进度信息
  includeSuggestions?: boolean; // 是否包含建议
}

// ========== Fiscal Year Statistics ==========
export interface FiscalYearStatistics {
  period: FiscalYearPeriod;
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  growthRate?: number;    // 相比上一财年的增长率
  completionRate: number; // 财年完成率
}

// ========== Constants ==========
export const FISCAL_YEAR_CONFIG_DEFAULTS: Partial<FiscalYearConfig> = {
  startMonth: 10,
  startDay: 1,
  isActive: true,
  isDefault: true,
  description: 'JCI KL 财年从每年10月1日开始'
};

export const FISCAL_YEAR_DISPLAY_FORMATS = {
  short: 'FY{year}-{nextYear}',      // FY2024-25
  long: '{year}-{nextYear}',         // 2024-2025
  full: '{year}年财年',              // 2024年财年
  range: '{startDate} 至 {endDate}'  // 2024-10-01 至 2025-09-30
} as const;

// ========== Export all types ==========
export type {
  FiscalYearConfig,
  FiscalYearPeriod,
  FiscalYearStatus,
  FiscalYearSuggestion,
  FiscalYearCalculationOptions,
  FiscalYearStatistics
};
