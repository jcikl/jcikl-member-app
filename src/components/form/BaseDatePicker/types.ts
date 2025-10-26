/**
 * BaseDatePicker Types
 * 基础日期选择器组件类型定义
 */

import dayjs from 'dayjs';

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

export interface FiscalYearDatePickerProps {
  value?: Date | string | dayjs.Dayjs;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

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

export interface BaseDatePickerRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}
