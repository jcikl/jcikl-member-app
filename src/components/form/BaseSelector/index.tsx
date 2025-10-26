import React, { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { UserOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
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

const { Option } = Select;

/**
 * BaseSelector Component
 * 基础选择器组件
 * 
 * @description 统一的选择器基础组件，提供标准化的选择行为
 */
export const BaseSelector: React.FC<BaseSelectorProps> = ({
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  allowClear = true,
  showSearch = true,
  loading = false,
  className = '',
  style = {},
  options = [],
  loadData,
  filterOption,
  onSearch,
  mode = 'single',
  maxTagCount = 3,
}) => {
  const [internalOptions, setInternalOptions] = useState<SelectorOption[]>(options);
  const [internalLoading, setInternalLoading] = useState(false);

  /**
   * 加载数据
   */
  useEffect(() => {
    if (loadData) {
      setInternalLoading(true);
      loadData()
        .then(data => {
          setInternalOptions(data);
        })
        .catch(error => {
          console.error('[BaseSelector] 加载数据失败:', error);
          message.error('加载数据失败');
        })
        .finally(() => {
          setInternalLoading(false);
        });
    }
  }, [loadData]);

  /**
   * 默认搜索过滤函数
   */
  const defaultFilterOption = (input: string, option: any) => {
    const label = option?.children?.toString() || '';
    return label.toLowerCase().includes(input.toLowerCase());
  };

  /**
   * 处理搜索
   */
  const handleSearch = (searchValue: string) => {
    onSearch?.(searchValue);
  };

  const selectProps = {
    value,
    onChange,
    placeholder,
    disabled,
    allowClear,
    showSearch,
    loading: loading || internalLoading,
    className: `base-selector ${className}`,
    style,
    filterOption: filterOption || defaultFilterOption,
    onSearch: onSearch ? handleSearch : undefined,
    mode: mode === 'multiple' ? 'multiple' : undefined,
    maxTagCount: mode === 'multiple' ? maxTagCount : undefined,
  };

  return (
    <Select {...selectProps}>
      {internalOptions.map(option => (
        <Option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </Option>
      ))}
    </Select>
  );
};

/**
 * MemberSelector Component
 * 会员选择器
 */
export interface MemberSelectorProps extends Omit<BaseSelectorProps, 'loadData'> {
  status?: 'active' | 'inactive' | 'all';
  onMemberChange?: (memberId: string, member: any) => void;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  status = 'active',
  onMemberChange,
  ...props
}) => {
  const loadMembers = async (): Promise<SelectorOption[]> => {
    try {
      const { getMembers } = await import('@/modules/member/services/memberService');
      const result = await getMembers({ 
        page: 1, 
        limit: 1000, 
        status: status === 'all' ? undefined : status 
      });
      
      return result.data.map(member => ({
        label: `${member.name} - ${member.email}`,
        value: member.id,
        extra: member,
      }));
    } catch (error) {
      console.error('[MemberSelector] 加载会员失败:', error);
      return [];
    }
  };

  const handleChange = (value: string) => {
    props.onChange?.(value);
    if (onMemberChange) {
      const member = internalOptions.find(opt => opt.value === value)?.extra;
      onMemberChange(value, member);
    }
  };

  return (
    <BaseSelector
      {...props}
      placeholder={props.placeholder || '选择会员'}
      loadData={loadMembers}
      onChange={handleChange}
    />
  );
};

/**
 * EventSelector Component
 * 活动选择器
 */
export interface EventSelectorProps extends Omit<BaseSelectorProps, 'loadData'> {
  status?: 'Published' | 'Draft' | 'all';
  year?: string;
  onEventChange?: (eventId: string, event: any) => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  status = 'Published',
  year,
  onEventChange,
  ...props
}) => {
  const loadEvents = async (): Promise<SelectorOption[]> => {
    try {
      const { getEvents } = await import('@/modules/event/services/eventService');
      const result = await getEvents({ 
        page: 1, 
        limit: 1000, 
        status: status === 'all' ? undefined : status 
      });
      
      let events = result.data;
      
      // 按年份过滤
      if (year && year !== 'all') {
        events = events.filter(event => {
          if (!event.startDate) return false;
          return new Date(event.startDate).getFullYear().toString() === year;
        });
      }
      
      return events.map(event => ({
        label: `${event.name}${event.startDate ? ` (${new Date(event.startDate).getFullYear()})` : ''}`,
        value: event.id,
        extra: event,
      }));
    } catch (error) {
      console.error('[EventSelector] 加载活动失败:', error);
      return [];
    }
  };

  const handleChange = (value: string) => {
    props.onChange?.(value);
    if (onEventChange) {
      const event = internalOptions.find(opt => opt.value === value)?.extra;
      onEventChange(value, event);
    }
  };

  return (
    <BaseSelector
      {...props}
      placeholder={props.placeholder || '选择活动'}
      loadData={loadEvents}
      onChange={handleChange}
    />
  );
};

/**
 * YearSelector Component
 * 年份选择器
 */
export interface YearSelectorProps extends Omit<BaseSelectorProps, 'loadData'> {
  startYear?: number;
  endYear?: number;
  fiscalYear?: boolean;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  startYear,
  endYear,
  fiscalYear = false,
  ...props
}) => {
  const generateYearOptions = (): SelectorOption[] => {
    const currentYear = new Date().getFullYear();
    const start = startYear || (currentYear - 10);
    const end = endYear || (currentYear + 5);
    
    const options: SelectorOption[] = [];
    
    for (let year = end; year >= start; year--) {
      const label = fiscalYear ? `FY ${year}` : year.toString();
      options.push({
        label,
        value: year.toString(),
      });
    }
    
    return options;
  };

  return (
    <BaseSelector
      {...props}
      placeholder={props.placeholder || '选择年份'}
      options={generateYearOptions()}
    />
  );
};

export default BaseSelector;
