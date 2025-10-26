/**
 * BaseModal Types
 * 基础弹窗组件类型定义
 */

export interface BaseModalProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onOk?: () => void | Promise<void>;
  onCancel: () => void;
  onClose?: () => void;
  loading?: boolean;
  confirmLoading?: boolean;
  okText?: string;
  cancelText?: string;
  okButtonProps?: any;
  cancelButtonProps?: any;
  width?: number | string;
  centered?: boolean;
  destroyOnClose?: boolean;
  maskClosable?: boolean;
  closable?: boolean;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  // 确认相关
  confirm?: boolean;
  confirmTitle?: string;
  confirmContent?: string;
  confirmOkText?: string;
  confirmCancelText?: string;
  confirmOkType?: 'primary' | 'danger';
  // 成功回调
  onSuccess?: (result?: any) => void;
  // 错误处理
  onError?: (error: Error) => void;
}

export interface BaseModalRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}
