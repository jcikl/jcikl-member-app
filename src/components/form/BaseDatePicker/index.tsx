import React from 'react';
import { DatePicker, Space } from 'antd';
import dayjs from 'dayjs';

// 全局配置
import { globalDateService } from '@/config/globalDateSettings';

// 类型定义
export interface BaseDatePickerProps {
  value?: Date | string | dayjs.Dayjs;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showTime?: boolean;
  format?: string;
  className?: string;
  style?: React.CSSProperties;
  // 验证相关
  disabledDate?: (current: dayjs.Dayjs) => boolean;
  // 其他
  size?: 'small' | 'middle' | 'large';
}

export interface BaseDateRangePickerProps {
  value?: [Date, Date] | [string, string] | [dayjs.Dayjs, dayjs.Dayjs];
  onChange?: (dates: [Date, Date] | null) => void;
  placeholder?: [string, string];
  disabled?: boolean;
  allowClear?: boolean;
  showTime?: boolean;
  format?: string;
  className?: string;
  style?: React.CSSProperties;
  // 验证相关
  disabledDate?: (current: dayjs.Dayjs) => boolean;
  // 其他
  size?: 'small' | 'middle' | 'large';
}

const { RangePicker } = DatePicker;

/**
 * BaseDatePicker Component
 * 基础日期选择器组件
 * 
 * @description 统一的日期选择器基础组件，提供标准化的日期处理行为
 */
export const BaseDatePicker: React.FC<BaseDatePickerProps> = ({
  value,
  onChange,
  placeholder = '请选择日期',
  disabled = false,
  allowClear = true,
  showTime = false,
  format,
  className = '',
  style = {},
  disabledDate,
  size = 'middle',
}) => {
  // 使用全局日期格式
  const dateFormat = format || globalDateService.formatDate(new Date(), 'display');

  /**
   * 处理日期变化
   */
  const handleChange = (date: dayjs.Dayjs | null) => {
    onChange?.(date ? date.toDate() : null);
  };

  /**
   * 转换值为dayjs对象
   */
  const dayjsValue = value ? dayjs(value) : null;

  return (
    <DatePicker
      value={dayjsValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      showTime={showTime}
      format={dateFormat}
      className={`base-date-picker ${className}`}
      style={style}
      disabledDate={disabledDate}
      size={size}
    />
  );
};

/**
 * BaseDateRangePicker Component
 * 基础日期范围选择器组件
 */
export const BaseDateRangePicker: React.FC<BaseDateRangePickerProps> = ({
  value,
  onChange,
  placeholder = ['开始日期', '结束日期'],
  disabled = false,
  allowClear = true,
  showTime = false,
  format,
  className = '',
  style = {},
  disabledDate,
  size = 'middle',
}) => {
  // 使用全局日期格式
  const dateFormat = format || globalDateService.formatDate(new Date(), 'display');

  /**
   * 处理日期范围变化
   */
  const handleChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (dates && dates[0] && dates[1]) {
      onChange?.([dates[0].toDate(), dates[1].toDate()]);
    } else {
      onChange?.(null);
    }
  };

  /**
   * 转换值为dayjs对象数组
   */
  const dayjsValue = value ? [dayjs(value[0]), dayjs(value[1])] as [dayjs.Dayjs, dayjs.Dayjs] : null;

  return (
    <RangePicker
      value={dayjsValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      showTime={showTime}
      format={dateFormat}
      className={`base-date-range-picker ${className}`}
      style={style}
      disabledDate={disabledDate}
      size={size}
    />
  );
};

/**
 * FiscalYearDatePicker Component
 * 财年日期选择器组件
 */
export interface FiscalYearDatePickerProps {
  value?: Date | string | dayjs.Dayjs;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const FiscalYearDatePicker: React.FC<FiscalYearDatePickerProps> = ({
  value,
  onChange,
  placeholder = '请选择财年日期',
  disabled = false,
  allowClear = true,
  className = '',
  style = {},
}) => {
  /**
   * 禁用非财年日期
   */
  const disabledDate = (current: dayjs.Dayjs) => {
    // 这里可以添加财年特定的日期禁用逻辑
    return false;
  };

  return (
    <BaseDatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      className={`fiscal-year-date-picker ${className}`}
      style={style}
      disabledDate={disabledDate}
    />
  );
};

/**
 * EventDatePicker Component
 * 活动日期选择器组件
 */
export interface EventDatePickerProps {
  value?: Date | string | dayjs.Dayjs;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showTime?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const EventDatePicker: React.FC<EventDatePickerProps> = ({
  value,
  onChange,
  placeholder = '请选择活动日期',
  disabled = false,
  allowClear = true,
  showTime = true,
  className = '',
  style = {},
}) => {
  /**
   * 禁用过去的日期
   */
  const disabledDate = (current: dayjs.Dayjs) => {
    return current && current < dayjs().startOf('day');
  };

  return (
    <BaseDatePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      showTime={showTime}
      className={`event-date-picker ${className}`}
      style={style}
      disabledDate={disabledDate}
    />
  );
};

export default BaseDatePicker;
