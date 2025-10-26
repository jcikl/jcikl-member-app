/**
 * BaseSearchFilter Types
 * 基础搜索筛选组件类型定义
 */

export interface SearchFilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number';
  placeholder?: string;
  options?: { label: string; value: any }[];
  defaultValue?: any;
  disabled?: boolean;
  required?: boolean;
  // 验证相关
  rules?: any[];
  // 其他
  span?: number;
  dependencies?: string[];
}

export interface SearchFilterPreset {
  name: string;
  label: string;
  values: Record<string, any>;
  icon?: React.ReactNode;
}

export interface BaseSearchFilterProps {
  fields: SearchFilterField[];
  onSearch: (values: Record<string, any>) => void;
  onReset?: () => void;
  onExport?: () => void;
  // 预设相关
  presets?: SearchFilterPreset[];
  onPresetChange?: (preset: SearchFilterPreset) => void;
  // 布局相关
  layout?: 'horizontal' | 'vertical' | 'inline';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  // 操作相关
  showExport?: boolean;
  showReset?: boolean;
  showPresets?: boolean;
  // 状态相关
  loading?: boolean;
  disabled?: boolean;
  // 样式相关
  className?: string;
  style?: React.CSSProperties;
  // 存储相关
  storageKey?: string;
}

export interface TransactionSearchFilterProps extends Omit<BaseSearchFilterProps, 'fields'> {
  onSearch: (values: {
    keyword?: string;
    category?: string;
    year?: string;
    dateRange?: [Date, Date];
    amountRange?: [number, number];
  }) => void;
}

export interface MemberSearchFilterProps extends Omit<BaseSearchFilterProps, 'fields'> {
  onSearch: (values: {
    keyword?: string;
    category?: string;
    status?: string;
    year?: string;
  }) => void;
}

export interface BaseSearchFilterRef {
  search: () => void;
  reset: () => void;
  getValues: () => Record<string, any>;
  setValues: (values: Record<string, any>) => void;
}
