/**
 * BaseForm Types
 * 基础表单组件类型定义
 */

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

export interface BaseFormRef {
  submit: () => void;
  reset: () => void;
  validate: () => Promise<any>;
  getFieldsValue: () => any;
  setFieldsValue: (values: any) => void;
}
