/**
 * Smart Fiscal Year Detection Service
 * 智能财年检测服务
 */

import { 
  FiscalYearConfig, 
  FiscalYearPeriod, 
  FiscalYearStatus, 
  FiscalYearSuggestion,
  FiscalYearCalculationOptions,
  FiscalYearStatistics,
  FISCAL_YEAR_DISPLAY_FORMATS
} from '../types/fiscalYear';
import { Transaction } from '../types';
import dayjs from 'dayjs';

export class SmartFiscalYearService {
  private static instance: SmartFiscalYearService;
  private config: FiscalYearConfig | null = null;

  private constructor() {}

  public static getInstance(): SmartFiscalYearService {
    if (!SmartFiscalYearService.instance) {
      SmartFiscalYearService.instance = new SmartFiscalYearService();
    }
    return SmartFiscalYearService.instance;
  }

  /**
   * 设置财年配置
   */
  public setConfig(config: FiscalYearConfig): void {
    this.config = config;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): FiscalYearConfig | null {
    return this.config;
  }

  /**
   * 智能检测当前财年状态
   */
  public detectCurrentFiscalYearStatus(): FiscalYearStatus | null {
    if (!this.config) {
      console.warn('Fiscal year config not set');
      return null;
    }

    const now = dayjs();
    const currentYear = now.year();
    const currentMonth = now.month() + 1;
    const currentDay = now.date();

    // 检测当前财年
    const currentPeriod = this.detectFiscalYearPeriod(currentYear);
    const nextPeriod = this.detectFiscalYearPeriod(currentYear + 1);
    const previousPeriod = this.detectFiscalYearPeriod(currentYear - 1);

    // 生成智能建议
    const suggestions = this.generateSuggestions(currentPeriod, nextPeriod, previousPeriod);

    return {
      currentPeriod,
      nextPeriod,
      previousPeriod,
      config: this.config,
      suggestions
    };
  }

  /**
   * 检测指定年份的财年期间
   */
  public detectFiscalYearPeriod(year: number): FiscalYearPeriod {
    if (!this.config) {
      throw new Error('Fiscal year config not set');
    }

    const startDate = dayjs(`${year}-${this.config.startMonth.toString().padStart(2, '0')}-${this.config.startDay.toString().padStart(2, '0')}`);
    const endDate = startDate.add(1, 'year').subtract(1, 'day');
    const now = dayjs();

    const isCurrent = now.isAfter(startDate) && now.isBefore(endDate.add(1, 'day'));
    const isCompleted = now.isAfter(endDate);
    
    const totalDays = endDate.diff(startDate, 'day') + 1;
    const daysElapsed = isCurrent ? now.diff(startDate, 'day') : (isCompleted ? totalDays : 0);
    const daysRemaining = totalDays - daysElapsed;
    const progressPercentage = Math.round((daysElapsed / totalDays) * 100);

    return {
      fiscalYear: `${year}-${year + 1}`,
      displayName: this.formatDisplayName(year, year + 1),
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      year,
      isCurrent,
      isCompleted,
      progressPercentage,
      daysRemaining: Math.max(0, daysRemaining),
      daysElapsed,
      totalDays
    };
  }

  /**
   * 计算财年范围（用于查询）
   */
  public calculateFiscalYearRange(year: number): { startDate: string; endDate: string } {
    const period = this.detectFiscalYearPeriod(year);
    return {
      startDate: period.startDate,
      endDate: period.endDate
    };
  }

  /**
   * 生成智能建议
   */
  private generateSuggestions(
    current: FiscalYearPeriod, 
    next: FiscalYearPeriod, 
    previous: FiscalYearPeriod
  ): FiscalYearSuggestion[] {
    const suggestions: FiscalYearSuggestion[] = [];

    // 当前财年建议
    if (current.isCurrent) {
      suggestions.push({
        type: 'current',
        period: current,
        reason: `当前正在${current.displayName}，建议查看当前财年数据`,
        priority: 'high'
      });
    }

    // 下一财年建议
    if (current.isCurrent && current.progressPercentage > 80) {
      suggestions.push({
        type: 'next',
        period: next,
        reason: `当前财年即将结束（${current.progressPercentage}%），建议准备下一财年数据`,
        priority: 'medium'
      });
    }

    // 上一财年建议
    if (previous.isCompleted) {
      suggestions.push({
        type: 'previous',
        period: previous,
        reason: `查看${previous.displayName}的完整数据，用于对比分析`,
        priority: 'low'
      });
    }

    return suggestions;
  }

  /**
   * 格式化显示名称
   */
  private formatDisplayName(year: number, nextYear: number): string {
    const nextYearShort = nextYear.toString().slice(-2);
    return FISCAL_YEAR_DISPLAY_FORMATS.short
      .replace('{year}', year.toString())
      .replace('{nextYear}', nextYearShort);
  }

  /**
   * 获取财年历史列表
   */
  public getFiscalYearHistory(count: number = 5): FiscalYearPeriod[] {
    if (!this.config) {
      return [];
    }

    const now = dayjs();
    const currentYear = now.year();
    const history: FiscalYearPeriod[] = [];

    for (let i = 0; i < count; i++) {
      const year = currentYear - i;
      history.push(this.detectFiscalYearPeriod(year));
    }

    return history;
  }

  /**
   * 获取财年选项列表（用于下拉选择）
   */
  public getFiscalYearOptions(count: number = 10): Array<{ label: string; value: string; period: FiscalYearPeriod }> {
    if (!this.config) {
      return [];
    }

    const now = dayjs();
    const currentYear = now.year();
    const options: Array<{ label: string; value: string; period: FiscalYearPeriod }> = [];

    for (let i = 0; i < count; i++) {
      const year = currentYear - i;
      const period = this.detectFiscalYearPeriod(year);
      
      options.push({
        label: `${period.displayName} (${period.startDate} - ${period.endDate})`,
        value: period.fiscalYear,
        period
      });
    }

    return options;
  }

  /**
   * 计算财年统计信息
   */
  public async calculateFiscalYearStatistics(
    period: FiscalYearPeriod, 
    transactions: Transaction[]
  ): Promise<FiscalYearStatistics> {
    const periodTransactions = transactions.filter(t => {
      const transactionDate = dayjs(t.transactionDate);
      return transactionDate.isAfter(dayjs(period.startDate).subtract(1, 'day')) && 
             transactionDate.isBefore(dayjs(period.endDate).add(1, 'day'));
    });

    const totalIncome = periodTransactions
      .filter(t => t.transactionType === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpense = periodTransactions
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const netIncome = totalIncome - totalExpense;
    const monthsElapsed = Math.max(1, Math.ceil(period.daysElapsed / 30));
    
    return {
      period,
      totalTransactions: periodTransactions.length,
      totalIncome,
      totalExpense,
      netIncome,
      averageMonthlyIncome: totalIncome / monthsElapsed,
      averageMonthlyExpense: totalExpense / monthsElapsed,
      completionRate: period.progressPercentage
    };
  }

  /**
   * 验证财年配置
   */
  public validateConfig(config: Partial<FiscalYearConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('财年名称不能为空');
    }

    if (!config.startMonth || config.startMonth < 1 || config.startMonth > 12) {
      errors.push('起始月份必须在1-12之间');
    }

    if (!config.startDay || config.startDay < 1 || config.startDay > 31) {
      errors.push('起始日期必须在1-31之间');
    }

    // 验证日期是否有效
    if (config.startMonth && config.startDay) {
      const testDate = new Date(2024, config.startMonth - 1, config.startDay);
      if (testDate.getMonth() !== config.startMonth - 1 || testDate.getDate() !== config.startDay) {
        errors.push('起始日期无效');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取财年进度信息
   */
  public getFiscalYearProgress(period: FiscalYearPeriod): {
    progressBar: string;
    statusText: string;
    statusColor: string;
  } {
    const progressBar = '█'.repeat(Math.floor(period.progressPercentage / 5)) + 
                       '░'.repeat(20 - Math.floor(period.progressPercentage / 5));

    let statusText = '';
    let statusColor = '';

    if (period.isCompleted) {
      statusText = '已完成';
      statusColor = 'green';
    } else if (period.isCurrent) {
      if (period.progressPercentage < 25) {
        statusText = '财年初期';
        statusColor = 'blue';
      } else if (period.progressPercentage < 75) {
        statusText = '财年中期';
        statusColor = 'orange';
      } else {
        statusText = '财年后期';
        statusColor = 'red';
      }
    } else {
      statusText = '未开始';
      statusColor = 'gray';
    }

    return {
      progressBar,
      statusText,
      statusColor
    };
  }
}

// 导出单例实例
export const smartFiscalYearService = SmartFiscalYearService.getInstance();
