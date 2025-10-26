import React, { useState, useEffect } from 'react';
import {
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Card,
  Collapse,
  Row,
  Col,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
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

const { RangePicker } = DatePicker;
const { Panel } = Collapse;

/**
 * BaseSearchFilter Component
 * 基础搜索筛选组件
 * 
 * @description 统一的搜索筛选基础组件，提供标准化的搜索筛选行为
 */
export const BaseSearchFilter: React.FC<BaseSearchFilterProps> = ({
  fields,
  onSearch,
  onReset,
  onExport,
  presets = [],
  onPresetChange,
  layout = 'horizontal',
  collapsible = true,
  defaultCollapsed = true,
  showExport = false,
  showReset = true,
  showPresets = true,
  loading = false,
  disabled = false,
  className = '',
  style = {},
  storageKey = 'search-filter',
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  /**
   * 初始化表单值
   */
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialValues[field.key] = field.defaultValue;
      }
    });
    setFormValues(initialValues);
  }, [fields]);

  /**
   * 处理字段值变化
   */
  const handleFieldChange = (key: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    // 过滤空值
    const filteredValues = Object.entries(formValues).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    onSearch(filteredValues);
  };

  /**
   * 处理重置
   */
  const handleReset = () => {
    const resetValues: Record<string, any> = {};
    fields.forEach(field => {
      resetValues[field.key] = field.defaultValue;
    });
    setFormValues(resetValues);
    onReset?.();
  };

  /**
   * 处理预设选择
   */
  const handlePresetSelect = (preset: SearchFilterPreset) => {
    setFormValues(preset.values);
    onPresetChange?.(preset);
  };

  /**
   * 渲染字段
   */
  const renderField = (field: SearchFilterField) => {
    const commonProps = {
      placeholder: field.placeholder,
      disabled: disabled || field.disabled,
      value: formValues[field.key],
      onChange: (value: any) => handleFieldChange(field.key, value),
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} />;

      case 'number':
        return <Input type="number" {...commonProps} />;

      case 'select':
        return (
          <Select {...commonProps} options={field.options} allowClear />
        );

      case 'date':
        return <DatePicker {...commonProps} style={{ width: '100%' }} />;

      case 'dateRange':
        return <RangePicker {...commonProps} style={{ width: '100%' }} />;

      default:
        return <Input {...commonProps} />;
    }
  };

  /**
   * 渲染预设按钮
   */
  const renderPresets = () => {
    if (!showPresets || presets.length === 0) return null;

    return (
      <Space wrap>
        {presets.map(preset => (
          <Button
            key={preset.name}
            size="small"
            icon={preset.icon}
            onClick={() => handlePresetSelect(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </Space>
    );
  };

  /**
   * 渲染操作按钮
   */
  const renderActions = () => {
    return (
      <Space>
        {renderPresets()}
        
        {showReset && (
          <Button icon={<ClearOutlined />} onClick={handleReset}>
            重置
          </Button>
        )}
        
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          loading={loading}
        >
          搜索
        </Button>
        
        {showExport && onExport && (
          <Button icon={<ReloadOutlined />} onClick={onExport}>
            导出
          </Button>
        )}
      </Space>
    );
  };

  /**
   * 渲染筛选表单
   */
  const renderFilterForm = () => {
    return (
      <Row gutter={[16, 16]}>
        {fields.map(field => (
          <Col key={field.key} span={field.span || 6}>
            <div className="search-filter-field">
              <label className="search-filter-label">
                {field.label}
                {field.required && <span style={{ color: 'red' }}> *</span>}
              </label>
              {renderField(field)}
            </div>
          </Col>
        ))}
      </Row>
    );
  };

  /**
   * 渲染内容
   */
  const renderContent = () => {
    if (collapsible) {
      return (
        <Collapse
          activeKey={collapsed ? [] : ['filter']}
          onChange={(keys) => setCollapsed(keys.length === 0)}
        >
          <Panel
            header={
              <Space>
                <FilterOutlined />
                <span>筛选条件</span>
              </Space>
            }
            key="filter"
          >
            {renderFilterForm()}
          </Panel>
        </Collapse>
      );
    }

    return renderFilterForm();
  };

  return (
    <Card
      className={`base-search-filter ${className}`}
      style={style}
      bodyStyle={{ padding: '16px' }}
    >
      {renderContent()}
      
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        {renderActions()}
      </div>
    </Card>
  );
};

/**
 * TransactionSearchFilter Component
 * 交易搜索筛选组件
 */
export interface TransactionSearchFilterProps extends Omit<BaseSearchFilterProps, 'fields'> {
  onSearch: (values: {
    keyword?: string;
    category?: string;
    year?: string;
    dateRange?: [Date, Date];
    amountRange?: [number, number];
  }) => void;
}

export const TransactionSearchFilter: React.FC<TransactionSearchFilterProps> = ({
  onSearch,
  ...props
}) => {
  const fields: SearchFilterField[] = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'text',
      placeholder: '搜索交易描述、金额等',
      span: 8,
    },
    {
      key: 'category',
      label: '类别',
      type: 'select',
      placeholder: '选择类别',
      options: [
        { label: '会员费', value: 'member-fees' },
        { label: '活动财务', value: 'event-finance' },
        { label: '日常账户', value: 'general-accounts' },
      ],
      span: 6,
    },
    {
      key: 'year',
      label: '年份',
      type: 'select',
      placeholder: '选择年份',
      options: Array.from({ length: 10 }, (_, i) => ({
        label: (new Date().getFullYear() - i).toString(),
        value: (new Date().getFullYear() - i).toString(),
      })),
      span: 4,
    },
    {
      key: 'dateRange',
      label: '日期范围',
      type: 'dateRange',
      placeholder: ['开始日期', '结束日期'],
      span: 6,
    },
  ];

  return <BaseSearchFilter fields={fields} onSearch={onSearch} {...props} />;
};

/**
 * MemberSearchFilter Component
 * 会员搜索筛选组件
 */
export interface MemberSearchFilterProps extends Omit<BaseSearchFilterProps, 'fields'> {
  onSearch: (values: {
    keyword?: string;
    category?: string;
    status?: string;
    year?: string;
  }) => void;
}

export const MemberSearchFilter: React.FC<MemberSearchFilterProps> = ({
  onSearch,
  ...props
}) => {
  const fields: SearchFilterField[] = [
    {
      key: 'keyword',
      label: '关键词',
      type: 'text',
      placeholder: '搜索姓名、邮箱等',
      span: 8,
    },
    {
      key: 'category',
      label: '类别',
      type: 'select',
      placeholder: '选择类别',
      options: [
        { label: '正式会员', value: 'official' },
        { label: '准会员', value: 'associate' },
        { label: '荣誉会员', value: 'honorary' },
        { label: '访问会员', value: 'visiting' },
      ],
      span: 6,
    },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      placeholder: '选择状态',
      options: [
        { label: '活跃', value: 'active' },
        { label: '非活跃', value: 'inactive' },
      ],
      span: 4,
    },
    {
      key: 'year',
      label: '年份',
      type: 'select',
      placeholder: '选择年份',
      options: Array.from({ length: 10 }, (_, i) => ({
        label: (new Date().getFullYear() - i).toString(),
        value: (new Date().getFullYear() - i).toString(),
      })),
      span: 6,
    },
  ];

  return <BaseSearchFilter fields={fields} onSearch={onSearch} {...props} />;
};

export default BaseSearchFilter;
