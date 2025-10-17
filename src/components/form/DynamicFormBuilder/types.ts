/**
 * DynamicFormBuilder Types
 * 动态表单构建器类型定义
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';

export type FormMode = 'design' | 'preview' | 'fill';

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'min' | 'max' | 'pattern';
  value?: any;
  message?: string;
}

export interface ConditionalLogic {
  dependsOn: string;
  condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface FormFieldConfig {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  validation?: ValidationRule[];
  options?: { label: string; value: any }[];
  conditional?: ConditionalLogic;
  grid?: {
    span: number;
    offset?: number;
  };
  order: number;
}

export interface FormSchema {
  id: string;
  name: string;
  fields: FormFieldConfig[];
  settings?: {
    layout?: 'horizontal' | 'vertical' | 'inline';
    submitText?: string;
    showReset?: boolean;
  };
}

export interface DynamicFormBuilderProps {
  mode: FormMode;
  schema?: FormSchema;
  onSchemaChange?: (schema: FormSchema) => void;
  onSubmit?: (values: any) => void;
  initialValues?: any;
  loading?: boolean;
  className?: string;
}

export interface FieldPaletteItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
}

