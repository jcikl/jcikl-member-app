# 财年配置页面功能说明

## 📋 概述

财年配置页面（`FiscalYearManagementPage`）提供了财年管理功能，包括配置财年起始时间、查看当前财年状态、智能建议和财年预览等功能。

---

## 🎯 核心功能

### 1️⃣ 智能建议卡片

#### 功能描述
智能建议卡片会自动分析当前财年状态，为用户提供针对性的建议。

#### 显示条件
- 只在有建议时显示
- 建议来自 `smartFiscalYearService.generateSuggestions()` 方法

#### 建议类型

1. **当前财年建议**（优先级：高）
   - **触发条件**：当前正在某个财年期间
   - **建议内容**：建议查看当前财年数据
   - **显示样式**：绿色成功提示
   - **图标**：💡（BulbOutlined）

2. **下一财年建议**（优先级：中）
   - **触发条件**：当前财年进度 > 80%
   - **建议内容**：当前财年即将结束，建议准备下一财年数据
   - **显示样式**：蓝色信息提示
   - **图标**：💡（BulbOutlined）

3. **上一财年建议**（优先级：低）
   - **触发条件**：上一财年已完成
   - **建议内容**：查看上一财年的完整数据，用于对比分析
   - **显示样式**：黄色警告提示
   - **图标**：💡（BulbOutlined）

#### 代码示例
```typescript
// 建议数据结构
interface FiscalYearSuggestion {
  type: 'current' | 'next' | 'previous';
  period: FiscalYearPeriod;
  reason: string;  // 建议理由
  priority: 'high' | 'medium' | 'low';
}
```

#### 使用场景
- **财务管理**：提醒财务人员关注当前财年进度
- **预算规划**：在财年结束时提醒准备下一财年预算
- **数据分析**：建议查看历史财年数据进行对比

---

### 2️⃣ 财年预览卡片

#### 功能描述
财年预览卡片显示过去5个财年的历史记录，帮助用户了解财年时间线和状态。

#### 显示内容

每个财年显示以下信息：

1. **状态图标**
   - ✅ 已完成（绿色）- `CheckCircleOutlined`
   - ⏰ 进行中（蓝色）- `ClockCircleOutlined`
   - ⚠️ 未开始（灰色）- `ExclamationCircleOutlined`

2. **财年名称**
   - 格式：`FY{年份}-{下一年份}`
   - 示例：`FY2024-25`
   - 当前财年显示为粗体

3. **状态标签**
   - `已完成` - 绿色标签
   - `进行中` - 蓝色标签
   - `未开始` - 灰色标签

4. **日期范围**
   - 格式：`YYYY-MM-DD 至 YYYY-MM-DD`
   - 示例：`2024-10-01 至 2025-09-30`

5. **进度条**（仅当前财年显示）
   - 进度百分比
   - 剩余天数
   - 动态进度条效果

#### 财年数据结构
```typescript
interface FiscalYearPeriod {
  fiscalYear: string;           // "2024-2025"
  displayName: string;          // "FY2024-25"
  startDate: string;            // "2024-10-01"
  endDate: string;              // "2025-09-30"
  year: number;                 // 起始年份
  isCurrent: boolean;           // 是否当前财年
  isCompleted: boolean;         // 是否已完成
  progressPercentage: number;   // 进度百分比 0-100
  daysRemaining: number;        // 剩余天数
  daysElapsed: number;          // 已过天数
  totalDays: number;            // 总天数
}
```

#### 使用场景
- **历史查询**：快速查看过去5年的财年配置
- **进度跟踪**：实时了解当前财年进度
- **数据范围确认**：查看财年的准确日期范围

---

## 🔧 技术实现

### 服务调用

```typescript
// 获取财年状态（包含建议）
const status = smartFiscalYearService.detectCurrentFiscalYearStatus();

// 获取财年历史
const history = smartFiscalYearService.getFiscalYearHistory(5);
```

### 数据流程

```
用户打开页面
    ↓
loadFiscalYearConfig()
    ↓
调用 smartFiscalYearService.detectCurrentFiscalYearStatus()
    ↓
生成财年状态（包含建议）
    ↓
调用 smartFiscalYearService.getFiscalYearHistory(5)
    ↓
获取过去5年的财年记录
    ↓
渲染到 UI
```

---

## 📊 配置参数

### 默认财年配置
- **起始月份**：10月
- **起始日期**：1日
- **财年范围**：10月1日至次年9月30日
- **示例**：2024财年 = 2024-10-01 至 2025-09-30

### 财年格式
- **短格式**：`FY2024-25`
- **长格式**：`2024-2025财年`
- **完整格式**：`2024-10-01 至 2025-09-30`

---

## 💡 用户交互

### 智能建议卡片
- **交互方式**：只读提示，无点击操作
- **自动更新**：保存配置后自动刷新
- **响应式**：根据财年进度自动调整建议

### 财年预览卡片
- **交互方式**：只读列表，无点击操作
- **滚动查看**：使用 Ant Design List 组件
- **状态标识**：清晰的颜色和图标区分

---

## 🎨 UI 组件

### 使用的 Ant Design 组件
- `Card` - 卡片容器
- `Alert` - 建议提示
- `List` - 财年列表
- `Progress` - 进度条
- `Tag` - 状态标签
- `Space` - 间距布局

---

## 📝 注意事项

1. **智能建议**只在满足条件时显示，并非一直可见
2. **财年预览**只显示过去5年，如需更多可通过后端API扩展
3. **当前财年**会显示实时进度，其他财年只显示状态
4. **配置保存**会立即触发UI刷新，更新所有相关数据
5. **日期格式**统一使用 `YYYY-MM-DD` 格式

---

## 🔗 相关文件

- **页面组件**：`src/modules/finance/pages/FiscalYearManagementPage/index.tsx`
- **服务类**：`src/modules/finance/services/smartFiscalYearService.ts`
- **类型定义**：`src/modules/finance/types/fiscalYear.ts`
- **配置存储**：`localStorage.fiscalYearConfig`

---

## 📅 最后更新

- **创建日期**：2025-01-13
- **版本**：1.0
- **作者**：AI Assistant
