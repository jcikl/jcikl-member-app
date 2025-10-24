# 智能财年检测系统 (Smart Fiscal Year Detection System)

## 📋 概述

智能财年检测系统是一个完整的财年管理解决方案，提供自动化的财年检测、智能建议和灵活的统计功能。系统支持多种财年配置，并能根据当前日期自动检测财年状态。

## 🎯 核心特性

### ✨ 智能检测
- **自动财年检测**: 根据当前日期自动识别当前财年
- **进度计算**: 实时计算财年完成进度和剩余天数
- **状态判断**: 自动判断财年状态（进行中/已完成/未开始）

### 🧠 智能建议
- **当前财年建议**: 优先显示当前财年数据
- **下一财年提醒**: 财年即将结束时提醒准备下一财年
- **历史对比**: 建议查看历史财年数据进行对比分析

### 📊 灵活统计
- **财年统计**: 基于财年配置的统计
- **自然年统计**: 基于1月1日-12月31日的统计
- **自定义范围**: 支持自定义日期范围统计

## 🏗️ 系统架构

```
src/modules/finance/
├── types/
│   └── fiscalYear.ts              # 财年类型定义
├── services/
│   └── smartFiscalYearService.ts  # 智能财年服务
├── components/
│   ├── SmartFiscalYearSelector/   # 智能财年选择器
│   └── FiscalYearStatisticsCard/  # 财年统计卡片
└── pages/
    ├── FiscalYearManagementPage/  # 财年管理页面
    ├── FiscalYearStatisticsPage/  # 财年统计页面
    └── TransactionManagementWithFiscalYear/ # 集成示例
```

## 🚀 快速开始

### 1. 基本使用

```typescript
import { smartFiscalYearService } from '@/modules/finance/services/smartFiscalYearService';
import { FiscalYearConfig } from '@/modules/finance/types/fiscalYear';

// 设置财年配置
const config: FiscalYearConfig = {
  id: 'jci-kl-fy',
  name: 'JCI KL 财年',
  startMonth: 10,    // 10月
  startDay: 1,       // 1日
  isActive: true,
  isDefault: true,
  description: 'JCI KL 财年从每年10月1日开始'
};

smartFiscalYearService.setConfig(config);

// 检测当前财年状态
const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
console.log('当前财年:', status.currentPeriod);
```

### 2. 在组件中使用

```typescript
import React, { useState, useEffect } from 'react';
import SmartFiscalYearSelector from '@/modules/finance/components/SmartFiscalYearSelector';
import { FiscalYearPeriod } from '@/modules/finance/types/fiscalYear';

const MyComponent: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalYearPeriod | null>(null);

  const handleFiscalYearChange = (period: FiscalYearPeriod) => {
    setSelectedPeriod(period);
    // 根据财年期间加载数据
    loadDataForPeriod(period);
  };

  return (
    <SmartFiscalYearSelector
      onFiscalYearChange={handleFiscalYearChange}
      onStatisticsTypeChange={(type) => console.log('统计类型:', type)}
      showSuggestions={true}
      showProgress={true}
    />
  );
};
```

## 📚 API 参考

### SmartFiscalYearService

#### 主要方法

```typescript
// 设置财年配置
setConfig(config: FiscalYearConfig): void

// 检测当前财年状态
detectCurrentFiscalYearStatus(): FiscalYearStatus | null

// 检测指定年份的财年期间
detectFiscalYearPeriod(year: number): FiscalYearPeriod

// 计算财年范围
calculateFiscalYearRange(year: number): { startDate: string; endDate: string }

// 获取财年历史
getFiscalYearHistory(count: number): FiscalYearPeriod[]

// 获取财年选项列表
getFiscalYearOptions(count: number): Array<{ label: string; value: string; period: FiscalYearPeriod }>

// 计算财年统计信息
calculateFiscalYearStatistics(period: FiscalYearPeriod, transactions: Transaction[]): Promise<FiscalYearStatistics>

// 验证财年配置
validateConfig(config: Partial<FiscalYearConfig>): { isValid: boolean; errors: string[] }
```

### 类型定义

#### FiscalYearConfig
```typescript
interface FiscalYearConfig {
  id: string;           // 配置ID
  name: string;          // 财年名称
  startMonth: number;   // 起始月份 (1-12)
  startDay: number;     // 起始日期 (1-31)
  isActive: boolean;     // 是否启用
  isDefault: boolean;    // 是否为默认配置
  description?: string;  // 描述
}
```

#### FiscalYearPeriod
```typescript
interface FiscalYearPeriod {
  fiscalYear: string;        // 财年标识 (如 "2024-2025")
  displayName: string;       // 显示名称 (如 "FY2024-25")
  startDate: string;         // 开始日期
  endDate: string;           // 结束日期
  year: number;             // 财年开始年份
  isCurrent: boolean;        // 是否为当前财年
  isCompleted: boolean;      // 是否已完成
  progressPercentage: number; // 财年进度百分比
  daysRemaining: number;     // 剩余天数
  daysElapsed: number;       // 已过天数
  totalDays: number;         // 总天数
}
```

## 🎨 组件使用

### SmartFiscalYearSelector

智能财年选择器组件，提供财年/自然年切换和智能建议。

```typescript
interface SmartFiscalYearSelectorProps {
  onFiscalYearChange?: (period: FiscalYearPeriod) => void;
  onStatisticsTypeChange?: (type: 'fiscal' | 'calendar') => void;
  defaultStatisticsType?: 'fiscal' | 'calendar';
  showSuggestions?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}
```

**示例:**
```typescript
<SmartFiscalYearSelector
  onFiscalYearChange={(period) => {
    console.log('选择的财年:', period.displayName);
    loadDataForPeriod(period);
  }}
  onStatisticsTypeChange={(type) => {
    console.log('统计类型:', type);
  }}
  showSuggestions={true}
  showProgress={true}
/>
```

### FiscalYearStatisticsCard

财年统计卡片组件，显示财年的详细统计信息。

```typescript
interface FiscalYearStatisticsCardProps {
  period: FiscalYearPeriod;
  transactions: Transaction[];
  loading?: boolean;
  showDetails?: boolean;
  showComparison?: boolean;
  previousPeriodStats?: FiscalYearStatistics;
}
```

**示例:**
```typescript
<FiscalYearStatisticsCard
  period={selectedPeriod}
  transactions={transactions}
  showDetails={true}
  showComparison={true}
  previousPeriodStats={previousStats}
/>
```

## 🔧 配置选项

### 默认财年配置

```typescript
const FISCAL_YEAR_CONFIG_DEFAULTS = {
  startMonth: 10,        // 10月
  startDay: 1,           // 1日
  isActive: true,
  isDefault: true,
  description: 'JCI KL 财年从每年10月1日开始'
};
```

### 显示格式

```typescript
const FISCAL_YEAR_DISPLAY_FORMATS = {
  short: 'FY{year}-{nextYear}',      // FY2024-25
  long: '{year}-{nextYear}',         // 2024-2025
  full: '{year}年财年',              // 2024年财年
  range: '{startDate} 至 {endDate}'  // 2024-10-01 至 2025-09-30
};
```

## 📊 使用场景

### 1. 财年管理页面
- 配置财年起始月份和日期
- 查看当前财年状态和进度
- 管理财年历史记录

### 2. 统计报告页面
- 选择财年或自然年进行统计
- 查看智能建议
- 生成财年对比报告

### 3. 交易管理页面
- 集成财年选择器
- 按财年筛选交易记录
- 显示财年进度和统计

## 🎯 最佳实践

### 1. 初始化
```typescript
// 在应用启动时初始化财年服务
useEffect(() => {
  const config = loadFiscalYearConfig(); // 从后端加载配置
  smartFiscalYearService.setConfig(config);
}, []);
```

### 2. 错误处理
```typescript
try {
  const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
  if (!status) {
    throw new Error('财年配置未设置');
  }
} catch (error) {
  console.error('财年检测失败:', error);
  // 显示错误提示
}
```

### 3. 性能优化
```typescript
// 缓存财年状态，避免重复计算
const [fiscalYearStatus, setFiscalYearStatus] = useState<FiscalYearStatus | null>(null);

useEffect(() => {
  const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
  setFiscalYearStatus(status);
}, []); // 只在组件挂载时计算一次
```

## 🔍 故障排除

### 常见问题

1. **财年检测失败**
   - 检查财年配置是否正确设置
   - 验证起始月份和日期是否有效

2. **进度计算不准确**
   - 确保系统时间正确
   - 检查财年配置的起始日期

3. **智能建议不显示**
   - 确认 `showSuggestions` 属性设置为 `true`
   - 检查财年状态是否正常检测

### 调试技巧

```typescript
// 启用调试日志
console.log('财年配置:', smartFiscalYearService.getConfig());
console.log('当前状态:', smartFiscalYearService.detectCurrentFiscalYearStatus());
console.log('财年历史:', smartFiscalYearService.getFiscalYearHistory(5));
```

## 🚀 未来计划

- [ ] 支持多财年配置
- [ ] 添加财年预算管理
- [ ] 集成财年报告模板
- [ ] 支持财年数据导出
- [ ] 添加财年提醒功能

## 📝 更新日志

### v1.0.0 (2025-01-13)
- ✨ 初始版本发布
- 🎯 智能财年检测功能
- 📊 财年统计组件
- 🧠 智能建议系统
- 📱 响应式设计支持
