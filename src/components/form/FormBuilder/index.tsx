import React from 'react';
import { BaseForm } from '../BaseForm';
import type { BaseFormField, BaseFormProps } from '../BaseForm/types';

// 兼容性类型定义
export interface FormField extends BaseFormField {}

interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (values: any) => void | Promise<void>;
  onCancel?: () => void;
  initialValues?: Record<string, any>;
  layout?: 'horizontal' | 'vertical' | 'inline';
  loading?: boolean;
  submitText?: string;
  showCancel?: boolean;
}

/**
 * Form Builder Component
 * 动态表单构建器(基于BaseForm)
 * 
 * @description 简化的动态表单构建器，提供基础的字段渲染功能
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
  return (
    <BaseForm
      fields={fields}
      onSubmit={onSubmit}
      onCancel={onCancel}
      initialValues={initialValues}
      layout={layout}
      loading={loading}
      submitText={submitText}
      showCancel={showCancel}
    />
  );
};

export default FormBuilder;