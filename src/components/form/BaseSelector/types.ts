/**
 * BaseSelector Types
 * 基础选择器组件类型定义
 */

export interface SelectorOption {
  label: string;
  value: string;
  disabled?: boolean;
  extra?: any;
}

export interface BaseSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showSearch?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  // 数据相关
  options?: SelectorOption[];
  loadData?: () => Promise<SelectorOption[]>;
  // 搜索相关
  filterOption?: (input: string, option: any) => boolean;
  onSearch?: (value: string) => void;
  // 其他
  mode?: 'single' | 'multiple';
  maxTagCount?: number;
}

export interface MemberSelectorProps extends Omit<BaseSelectorProps, 'loadData'> {
  status?: 'active' | 'inactive' | 'all';
  onMemberChange?: (memberId: string, member: any) => void;
}

export interface EventSelectorProps extends Omit<BaseSelectorProps, 'loadData'> {
  status?: 'Published' | 'Draft' | 'all';
  year?: string;
  onEventChange?: (eventId: string, event: any) => void;
}

export interface YearSelectorProps extends Omit<BaseSelectorProps, 'loadData'> {
  startYear?: number;
  endYear?: number;
  fiscalYear?: boolean;
}

export interface BaseSelectorRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}
