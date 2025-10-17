/**
 * FilterPanel Types
 * 筛选面板类型定义
 */

export type FilterFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'dateRange'
  | 'numberRange';

export interface FilterField {
  name: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: FilterOption[];
  required?: boolean;
  defaultValue?: any;
  disabled?: boolean;
  hidden?: boolean;
  group?: string; // 分组名称
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface FilterOption {
  label: string;
  value: any;
  disabled?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  values: Record<string, any>;
  createdAt: Date;
}

export interface FilterPanelProps {
  fields: FilterField[];
  onFilter: (values: Record<string, any>) => void;
  onReset?: () => void;
  defaultValues?: Record<string, any>;
  storageKey?: string; // localStorage key for saving presets
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  showPresets?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export interface FilterValues {
  [key: string]: any;
}

