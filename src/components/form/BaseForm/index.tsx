import React from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Radio,
  Checkbox,
  Button,
  Space,
} from 'antd';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
export interface BaseFormField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'textarea'
    | 'select'
    | 'date'
    | 'dateRange'
    | 'switch'
    | 'radio'
    | 'checkbox';
  placeholder?: string;
  rules?: any[];
  options?: { label: string; value: any; disabled?: boolean }[];
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  tooltip?: string;
  initialValue?: any;
  dependencies?: string[];
}

export interface BaseFormProps {
  fields: BaseFormField[];
  onSubmit: (values: any) => void | Promise<void>;
  onCancel?: () => void;
  initialValues?: Record<string, any>;
  layout?: 'horizontal' | 'vertical' | 'inline';
  loading?: boolean;
  submitText?: string;
  showCancel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const { TextArea } = Input;
const { RangePicker } = DatePicker;

/**
 * BaseForm Component
 * 基础表单组件
 * 
 * @description 统一的表单基础组件，提供标准化的表单行为
 */
export const BaseForm: React.FC<BaseFormProps> = ({
  fields,
  onSubmit,
  onCancel,
  initialValues,
  layout = 'vertical',
  loading = false,
  submitText = '提交',
  showCancel = true,
  className = '',
  style = {},
}) => {
  const [form] = Form.useForm();
  const formConfig = globalComponentService.getFormConfig({ layout });

  /**
   * 渲染表单控件
   */
  const renderFormControl = (field: BaseFormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
        return <Input placeholder={field.placeholder} disabled={field.disabled} />;

      case 'password':
        return <Input.Password placeholder={field.placeholder} disabled={field.disabled} />;

      case 'number':
        return (
          <InputNumber
            placeholder={field.placeholder}
            disabled={field.disabled}
            style={{ width: '100%' }}
          />
        );

      case 'textarea':
        return (
          <TextArea
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={4}
            showCount
          />
        );

      case 'select':
        return (
          <Select
            placeholder={field.placeholder}
            disabled={field.disabled}
            options={field.options}
          />
        );

      case 'date':
        return (
          <DatePicker
            placeholder={field.placeholder}
            disabled={field.disabled}
            style={{ width: '100%' }}
          />
        );

      case 'dateRange':
        return <RangePicker disabled={field.disabled} style={{ width: '100%' }} />;

      case 'switch':
        return <Switch disabled={field.disabled} />;

      case 'radio':
        return (
          <Radio.Group disabled={field.disabled}>
            {field.options?.map(opt => (
              <Radio key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </Radio>
            ))}
          </Radio.Group>
        );

      case 'checkbox':
        return (
          <Checkbox.Group disabled={field.disabled} options={field.options} />
        );

      default:
        return <Input placeholder={field.placeholder} disabled={field.disabled} />;
    }
  };

  return (
    <Form
      form={form}
      {...formConfig}
      initialValues={initialValues}
      onFinish={onSubmit}
      className={`base-form ${className}`}
      style={style}
    >
      {fields
        .filter(field => !field.hidden)
        .map(field => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.rules}
            required={field.required}
            tooltip={field.tooltip}
            dependencies={field.dependencies}
          >
            {renderFormControl(field)}
          </Form.Item>
        ))}

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {submitText}
          </Button>
          {showCancel && onCancel && (
            <Button onClick={onCancel}>取消</Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default BaseForm;
