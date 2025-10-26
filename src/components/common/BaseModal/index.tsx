import React from 'react';
import { Modal, Button, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
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

/**
 * BaseModal Component
 * 基础弹窗组件
 * 
 * @description 统一的弹窗基础组件，提供标准化的弹窗行为
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  title,
  children,
  onOk,
  onCancel,
  onClose,
  loading = false,
  confirmLoading = false,
  okText = '确认',
  cancelText = '取消',
  okButtonProps = {},
  cancelButtonProps = {},
  width = 600,
  centered = true,
  destroyOnClose = true,
  maskClosable = true,
  closable = true,
  footer,
  className = '',
  style = {},
  confirm = false,
  confirmTitle = '确认操作',
  confirmContent = '确定要执行此操作吗？',
  confirmOkText = '确认',
  confirmCancelText = '取消',
  confirmOkType = 'primary',
  onSuccess,
  onError,
}) => {
  const modalConfig = globalComponentService.getModalConfig({
    width,
    centered,
    destroyOnClose,
    maskClosable,
  });

  /**
   * 处理确认操作
   */
  const handleOk = async () => {
    if (!onOk) return;

    try {
      if (confirm) {
        Modal.confirm({
          title: confirmTitle,
          content: confirmContent,
          icon: <ExclamationCircleOutlined />,
          okText: confirmOkText,
          cancelText: confirmCancelText,
          okType: confirmOkType,
          onOk: async () => {
            const result = await onOk();
            onSuccess?.(result);
          },
        });
      } else {
        const result = await onOk();
        onSuccess?.(result);
      }
    } catch (error) {
      console.error('[BaseModal] 操作失败:', error);
      onError?.(error as Error);
    }
  };

  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    onCancel();
    onClose?.();
  };

  /**
   * 渲染默认底部
   */
  const renderDefaultFooter = () => {
    if (footer !== undefined) return footer;

    return (
      <Space>
        <Button {...cancelButtonProps} onClick={handleCancel} disabled={loading || confirmLoading}>
          {cancelText}
        </Button>
        {onOk && (
          <Button
            type="primary"
            {...okButtonProps}
            onClick={handleOk}
            loading={confirmLoading}
            disabled={loading}
          >
            {okText}
          </Button>
        )}
      </Space>
    );
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      width={width}
      centered={centered}
      destroyOnClose={destroyOnClose}
      maskClosable={maskClosable}
      closable={closable}
      footer={renderDefaultFooter()}
      className={`base-modal ${className}`}
      style={style}
      {...modalConfig}
    >
      {children}
    </Modal>
  );
};

export default BaseModal;
