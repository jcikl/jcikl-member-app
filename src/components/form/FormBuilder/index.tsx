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
import { globalComponentService } from '@/config';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

export interface FormField {
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

interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (values: any) => void | Promise<void>;
  onCancel?: () => void;
  initialValues?: any;
  layout?: 'horizontal' | 'vertical' | 'inline';
  loading?: boolean;
  submitText?: string;
  showCancel?: boolean;
}

/**
 * Form Builder Component
 * 动态表单构建器
 */
export const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  onSubmit,
  onCancel,
  initialValues,
  layout = 'vertical',
  loading = false,
  submitText = '提交',
  showCancel = true,
}) => {
  const [form] = Form.useForm();
  const formConfig = globalComponentService.getFormConfig({ layout });

  const renderFormControl = (field: FormField) => {
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

export default FormBuilder;


