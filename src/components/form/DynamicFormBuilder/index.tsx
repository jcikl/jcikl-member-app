import React, { useState, useCallback } from 'react';
import { Layout, Button, Space, Form, Input, Select, DatePicker, Checkbox, Radio, Upload, message } from 'antd';
import {
  FormOutlined,
  AlignLeftOutlined,
  NumberOutlined,
  CalendarOutlined,
  SelectOutlined,
  CheckSquareOutlined,
  FileOutlined,
  EyeOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
import type { DynamicFormBuilderProps, FormFieldConfig, FieldPaletteItem, FieldType } from './types';

// 样式
import './styles.css';

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;

/**
 * 字段调色板配置
 */
const FIELD_PALETTE: FieldPaletteItem[] = [
  { type: 'text', label: '文本输入', icon: <FormOutlined /> },
  { type: 'textarea', label: '多行文本', icon: <AlignLeftOutlined /> },
  { type: 'number', label: '数字', icon: <NumberOutlined /> },
  { type: 'date', label: '日期', icon: <CalendarOutlined /> },
  { type: 'select', label: '下拉选择', icon: <SelectOutlined /> },
  { type: 'radio', label: '单选按钮', icon: <CheckSquareOutlined /> },
  { type: 'checkbox', label: '复选框', icon: <CheckSquareOutlined /> },
  { type: 'file', label: '文件上传', icon: <FileOutlined /> },
];

/**
 * DynamicFormBuilder Component
 * 动态表单构建器组件
 */
export const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = ({
  mode = 'design',
  schema,
  onSchemaChange,
  onSubmit,
  initialValues,
  loading = false,
  className = '',
}) => {
  const [fields, setFields] = useState<FormFieldConfig[]>(schema?.fields || []);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [form] = Form.useForm();

  /**
   * 添加字段
   */
  const handleAddField = useCallback((fieldType: FieldType) => {
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}`,
      type: fieldType,
      name: `field_${fields.length + 1}`,
      label: `新字段 ${fields.length + 1}`,
      placeholder: '',
      required: false,
      order: fields.length,
    };

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setSelectedFieldId(newField.id);

    if (onSchemaChange && schema) {
      onSchemaChange({ ...schema, fields: updatedFields });
    }

    message.success('字段已添加');
  }, [fields, schema, onSchemaChange]);

  /**
   * 删除字段
   */
  const handleDeleteField = useCallback((fieldId: string) => {
    const updatedFields = fields.filter(f => f.id !== fieldId);
    setFields(updatedFields);
    
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }

    if (onSchemaChange && schema) {
      onSchemaChange({ ...schema, fields: updatedFields });
    }

    message.success('字段已删除');
  }, [fields, selectedFieldId, schema, onSchemaChange]);

  /**
   * 更新字段配置
   */
  const handleUpdateField = useCallback((fieldId: string, updates: Partial<FormFieldConfig>) => {
    const updatedFields = fields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    setFields(updatedFields);

    if (onSchemaChange && schema) {
      onSchemaChange({ ...schema, fields: updatedFields });
    }
  }, [fields, schema, onSchemaChange]);

  /**
   * 渲染字段(设计模式)
   */
  const renderFieldDesign = (field: FormFieldConfig) => {
    const isSelected = selectedFieldId === field.id;

    return (
      <div
        key={field.id}
        className={`dynamic-form-builder__field ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedFieldId(field.id)}
      >
        <div className="dynamic-form-builder__field-header">
          <Space>
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFieldId(field.id);
              }}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteField(field.id);
              }}
            />
          </Space>
        </div>

        <Form.Item
          label={field.label}
          required={field.required}
        >
          {renderFieldControl(field, true)}
        </Form.Item>
      </div>
    );
  };

  /**
   * 渲染字段控件
   */
  const renderFieldControl = (field: FormFieldConfig, isDesign: boolean = false) => {
    const commonProps = {
      placeholder: field.placeholder,
      disabled: isDesign,
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} />;
      case 'textarea':
        return <TextArea rows={4} {...commonProps} />;
      case 'number':
        return <Input type="number" {...commonProps} />;
      case 'date':
        return <DatePicker {...commonProps} style={{ width: '100%' }} />;
      case 'select':
        return <Select {...commonProps} options={field.options} />;
      case 'radio':
        return <Radio.Group options={field.options} disabled={isDesign} />;
      case 'checkbox':
        return <Checkbox.Group options={field.options} disabled={isDesign} />;
      case 'file':
        return <Upload {...commonProps}><Button icon={<UploadOutlined />}>上传文件</Button></Upload>;
      default:
        return <Input {...commonProps} />;
    }
  };

  /**
   * 渲染左侧工具栏
   */
  const renderToolbox = () => (
    <Sider width={280} className="dynamic-form-builder__toolbox">
      <div className="dynamic-form-builder__toolbox-content">
        <h3>字段类型</h3>
        <Space direction="vertical" style={{ width: '100%' }}>
          {FIELD_PALETTE.map(item => (
            <Button
              key={item.type}
              block
              icon={item.icon}
              onClick={() => handleAddField(item.type)}
              className="dynamic-form-builder__palette-item"
            >
              {item.label}
            </Button>
          ))}
        </Space>
      </div>
    </Sider>
  );

  /**
   * 渲染右侧属性编辑器
   */
  const renderProperties = () => {
    const selectedField = fields.find(f => f.id === selectedFieldId);

    if (!selectedField) {
      return (
        <div className="dynamic-form-builder__properties-empty">
          <p>选择一个字段以编辑其属性</p>
        </div>
      );
    }

    return (
      <div className="dynamic-form-builder__properties-content">
        <h3>字段属性</h3>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>字段标签</label>
            <Input
              value={selectedField.label}
              onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
            />
          </div>
          <div>
            <label>占位符</label>
            <Input
              value={selectedField.placeholder}
              onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
            />
          </div>
          <div>
            <Checkbox
              checked={selectedField.required}
              onChange={(e) => handleUpdateField(selectedField.id, { required: e.target.checked })}
            >
              必填字段
            </Checkbox>
          </div>
        </Space>
      </div>
    );
  };

  /**
   * 渲染设计模式
   */
  const renderDesignMode = () => (
    <Layout className="dynamic-form-builder__layout">
      {renderToolbox()}
      <Content className="dynamic-form-builder__canvas">
        <div className="dynamic-form-builder__canvas-content">
          {fields.length === 0 ? (
            <div className="dynamic-form-builder__empty">
              <p>从左侧拖拽字段开始构建表单</p>
            </div>
          ) : (
            fields.map(renderFieldDesign)
          )}
        </div>
      </Content>
      <Sider width={320} className="dynamic-form-builder__properties">
        {renderProperties()}
      </Sider>
    </Layout>
  );

  /**
   * 渲染预览/填写模式
   */
  const renderFormMode = () => {
    const formConfig = globalComponentService.getFormConfig();

    return (
      <div className="dynamic-form-builder__form">
        <Form form={form} {...formConfig} onFinish={onSubmit} initialValues={initialValues}>
          {fields.map(field => (
            <Form.Item
              key={field.id}
              name={field.name}
              label={field.label}
              rules={[{ required: field.required, message: `请输入${field.label}` }]}
            >
              {renderFieldControl(field)}
            </Form.Item>
          ))}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    );
  };

  return (
    <div className={`dynamic-form-builder ${className}`}>
      {/* 顶部工具栏 */}
      <Header className="dynamic-form-builder__header">
        <h1>表单构建器</h1>
        <Space>
          <Button icon={<EyeOutlined />}>预览</Button>
          <Button type="primary" icon={<SaveOutlined />}>保存表单</Button>
          <Button icon={<UploadOutlined />} />
          <Button icon={<DownloadOutlined />} />
        </Space>
      </Header>

      {/* 主内容 */}
      {mode === 'design' ? renderDesignMode() : renderFormMode()}
    </div>
  );
};

export default DynamicFormBuilder;

