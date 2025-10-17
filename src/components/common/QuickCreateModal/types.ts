/**
 * QuickCreateModal Types
 */

export interface QuickFormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: any }[];
  rules?: any[];
}

export interface QuickCreateModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  fields: QuickFormField[];
  onSubmit: (values: any) => Promise<string>;
  onSuccess?: (id: string) => void;
  initialValues?: any;
  twoStep?: boolean;
  loading?: boolean;
  className?: string;
}

