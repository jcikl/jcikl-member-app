import React, { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
  Collapse,
  Row,
  Col,
  Modal,
  message,
  Skeleton,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';

// 全局配置(优先导入)
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';

// 类型定义
import type { FilterPanelProps, FilterField, FilterPreset, FilterValues } from './types';

// 样式
import './styles.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * FilterPanel Component
 * 高级筛选面板组件
 * 
 * @description 支持多条件组合筛选、预设保存/加载、折叠展开等功能
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  fields,
  onFilter,
  onReset,
  defaultValues = {},
  storageKey = 'filter-presets',
  collapsible = true,
  defaultCollapsed = true,
  loading = false,
  showPresets = true,
  showSearch = true,
  searchPlaceholder = '快速搜索...',
  className = '',
}) => {
  const [form] = Form.useForm();
  const formConfig = globalComponentService.getFormConfig({ layout: 'vertical' });
  
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetModalVisible, setPresetModalVisible] = useState<boolean>(false);
  const [presetName, setPresetName] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | string[]>(
    defaultCollapsed ? ['filter-panel'] : []
  );

  // 按分组组织字段
  const groupedFields = useMemo(() => {
    const groups: Record<string, FilterField[]> = {};
    
    fields.forEach(field => {
      if (field.hidden) return;
      
      const groupName = field.group || '基本信息';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(field);
    });
    
    return groups;
  }, [fields]);

  // 加载预设
  useEffect(() => {
    loadPresets();
  }, [storageKey]);

  // 设置默认值
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      form.setFieldsValue(defaultValues);
    }
  }, [defaultValues, form]);

  /**
   * 从 localStorage 加载预设
   */
  const loadPresets = () => {
    try {
      const savedPresets = localStorage.getItem(storageKey);
      if (savedPresets) {
        const parsed = JSON.parse(savedPresets);
        setPresets(parsed);
      }
    } catch (error) {
      console.error('加载筛选预设失败:', error);
    }
  };

  /**
   * 保存预设到 localStorage
   */
  const savePreset = () => {
    if (!presetName.trim()) {
      message.warning('请输入预设名称');
      return;
    }

    const values = form.getFieldsValue();
    
    // 检查是否有有效的筛选条件
    const hasValues = Object.values(values).some(val => 
      val !== undefined && val !== null && val !== ''
    );
    
    if (!hasValues) {
      message.warning('请先设置筛选条件');
      return;
    }

    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      values,
      createdAt: new Date(),
    };

    const updatedPresets = [...presets, newPreset];
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      setPresetName('');
      setPresetModalVisible(false);
      message.success('预设保存成功');
    } catch (error) {
      console.error('保存预设失败:', error);
      message.error('保存预设失败');
    }
  };

  /**
   * 加载选中的预设
   */
  const loadPreset = () => {
    if (!selectedPreset) {
      message.warning('请选择要加载的预设');
      return;
    }

    const preset = presets.find(p => p.id === selectedPreset);
    if (preset) {
      form.setFieldsValue(preset.values);
      message.success(`已加载预设：${preset.name}`);
    }
  };


  /**
   * 应用筛选(自动触发)
   */
  const handleApplyFilter = async (values?: any) => {
    try {
      const formValues = values || form.getFieldsValue();
      
      // 清理空值和 undefined
      const cleanedValues: FilterValues = {};
      Object.keys(formValues).forEach(key => {
        const value = formValues[key];
        if (value !== undefined && value !== null && value !== '') {
          cleanedValues[key] = value;
        }
      });

      // 如果有搜索关键词，添加到筛选条件
      if (searchKeyword.trim()) {
        cleanedValues._search = searchKeyword.trim();
      }

      onFilter(cleanedValues);
    } catch (error) {
      console.error('筛选验证失败:', error);
    }
  };

  /**
   * 重置筛选
   */
  const handleReset = () => {
    form.resetFields();
    setSearchKeyword('');
    setSelectedPreset('');
    
    if (onReset) {
      onReset();
    } else {
      onFilter({});
    }
    
    message.info('筛选条件已重置');
  };


  /**
   * 渲染表单控件
   */
  const renderFormControl = (field: FilterField) => {
    const { type, placeholder, options, validation, disabled } = field;

    switch (type) {
      case 'text':
        return (
          <Input
            placeholder={placeholder || `请输入${field.label}`}
            disabled={disabled}
            allowClear
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            placeholder={placeholder || '请输入邮箱'}
            disabled={disabled}
            allowClear
          />
        );

      case 'number':
        return (
          <InputNumber
            placeholder={placeholder || `请输入${field.label}`}
            disabled={disabled}
            style={{ width: '100%' }}
            min={validation?.min}
            max={validation?.max}
          />
        );

      case 'select':
        return (
          <Select
            placeholder={placeholder || `请选择${field.label}`}
            disabled={disabled}
            allowClear
            showSearch
            style={{ width: '100%', minWidth: '120px' }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={options}
          />
        );

      case 'multiSelect':
        return (
          <Select
            mode="multiple"
            placeholder={placeholder || `请选择${field.label}`}
            disabled={disabled}
            allowClear
            showSearch
            style={{ width: '100%', minWidth: '120px' }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={options}
          />
        );

      case 'date':
        return (
          <DatePicker
            placeholder={placeholder || '请选择日期'}
            disabled={disabled}
            style={{ width: '100%' }}
            format={globalDateService.formatDate(new Date(), 'display')}
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            disabled={disabled}
            style={{ width: '100%' }}
            format={globalDateService.formatDate(new Date(), 'display')}
          />
        );

      case 'numberRange':
        return (
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              placeholder="最小值"
              disabled={disabled}
              style={{ width: '48%' }}
              min={validation?.min}
            />
            <Input
              placeholder="~"
              disabled
              style={{ width: '4%', borderLeft: 0, borderRight: 0, pointerEvents: 'none', backgroundColor: '#f5f5f5', textAlign: 'center' }}
            />
            <InputNumber
              placeholder="最大值"
              disabled={disabled}
              style={{ width: '48%' }}
              max={validation?.max}
            />
          </Space.Compact>
        );

      default:
        return (
          <Input
            placeholder={placeholder || `请输入${field.label}`}
            disabled={disabled}
            allowClear
          />
        );
    }
  };

  /**
   * 渲染表单内容
   */
  const renderFormContent = () => {
    if (loading) {
      return (
        <div className="filter-panel__loading">
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      );
    }

    return (
      <Form 
        form={form} 
        {...formConfig}
        onValuesChange={(_, allValues) => {
          // 字段变化时自动触发筛选
          handleApplyFilter(allValues);
        }}
      >
        {/* 横向布局：搜索 + 筛选字段 */}
        <div className="filter-panel__horizontal-layout">
          <Row gutter={[16, 16]} align="bottom">
            {/* 快速搜索 */}
            {showSearch && (
              <Col xs={24} sm={12} md={10} lg={8}>
                <Form.Item>
                  <Input
                    placeholder={searchPlaceholder}
                    prefix={<SearchOutlined />}
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      // 搜索框变化时也自动触发筛选
                      setTimeout(() => handleApplyFilter(), 300);
                    }}
                    onPressEnter={handleApplyFilter}
                    allowClear
                  />
                </Form.Item>
              </Col>
            )}

            {/* 分组字段 - 横向布局 */}
            {Object.entries(groupedFields).map(([, groupFields]) => 
              groupFields.map(field => (
                <Col xs={24} sm={12} md={7} lg={4} key={field.name}>
                  <Form.Item
                    name={field.name}
                    rules={[
                      {
                        required: field.required,
                        message: `请输入${field.label}`,
                      },
                      ...(field.validation?.pattern ? [{
                        pattern: field.validation.pattern,
                        message: field.validation.message || `${field.label}格式不正确`,
                      }] : []),
                    ]}
                  >
                    {renderFormControl(field)}
                  </Form.Item>
                </Col>
              ))
            )}

            {/* 重置按钮 - 与筛选条件同排 */}
            <Col xs={24} sm={12} md={7} lg={4}>
              <Form.Item>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleReset}
                  style={{ width: '100%' }}
                >
                  重置
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* 预设操作栏(仅在启用预设时显示)*/}
        {showPresets && (
          <div className="filter-panel__actions">
            <Space className="filter-panel__presets">
              <Input
                placeholder="预设名称"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                style={{ width: 150 }}
              />
              <Button
                icon={<SaveOutlined />}
                onClick={() => setPresetModalVisible(true)}
              >
                保存预设
              </Button>
              
              <Select
                placeholder="选择预设"
                value={selectedPreset}
                onChange={setSelectedPreset}
                style={{ width: 150 }}
                allowClear
              >
                {presets.map(preset => (
                  <Option key={preset.id} value={preset.id}>
                    {preset.name}
                  </Option>
                ))}
              </Select>
              
              <Button
                icon={<FolderOpenOutlined />}
                onClick={loadPreset}
                disabled={!selectedPreset}
              >
                加载
              </Button>
            </Space>
          </div>
        )}
      </Form>
    );
  };

  /**
   * 渲染内容
   */
  const renderContent = () => {
    if (!collapsible) {
      return (
        <div className={`filter-panel ${className}`}>
          <div className="filter-panel__content">
            {renderFormContent()}
          </div>
        </div>
      );
    }

    return (
      <div className={`filter-panel filter-panel--collapsible ${className}`}>
        <Collapse
          activeKey={activeKey}
          onChange={setActiveKey}
          bordered={true}
          expandIconPosition="end"
          items={[
            {
              key: 'filter-panel',
              label: (
                <div className="filter-panel__header">
                  <FilterOutlined className="filter-panel__icon" />
                  <span className="filter-panel__title">筛选条件</span>
                </div>
              ),
              children: (
                <div className="filter-panel__content">
                  {renderFormContent()}
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  };

  return (
    <>
      {renderContent()}

      {/* 保存预设确认弹窗 */}
      <Modal
        title="保存筛选预设"
        open={presetModalVisible}
        onOk={savePreset}
        onCancel={() => {
          setPresetModalVisible(false);
          setPresetName('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="请输入预设名称"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onPressEnter={savePreset}
          autoFocus
        />
      </Modal>
    </>
  );
};

export default FilterPanel;

