import React from 'react';
import { Button, Space, Modal, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

// 类型定义
import type { BulkOperationBarProps, BulkAction } from './types';

// 样式
import './styles.css';

const { Text } = Typography;

/**
 * BulkOperationBar Component
 * 批量操作栏组件
 */
export const BulkOperationBar: React.FC<BulkOperationBarProps> = ({
  visible,
  selectedCount,
  actions,
  onSelectAll,
  onDeselectAll,
  onClose,
  className = '',
}) => {
  /**
   * 处理操作
   */
  const handleAction = (action: BulkAction) => {
    if (action.confirmMessage) {
      Modal.confirm({
        title: '确认操作',
        content: action.confirmMessage,
        okText: '确认',
        cancelText: '取消',
        okType: action.danger ? 'danger' : 'primary',
        onOk: async () => {
          await action.onClick();
        },
      });
    } else {
      action.onClick();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div className={`bulk-operation-bar ${className}`}>
      <div className="bulk-operation-bar__content">
        <Text strong>已选择 {selectedCount} 项</Text>

        <Space>
          {actions.map(action => (
            <Button
              key={action.key}
              icon={action.icon}
              danger={action.danger}
              disabled={action.disabled}
              loading={action.loading}
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </Space>

        <Space>
          {onSelectAll && (
            <Button type="primary" onClick={onSelectAll}>
              全选
            </Button>
          )}
          <Button onClick={onDeselectAll}>
            取消选择
          </Button>
          {onClose && (
            <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
          )}
        </Space>
      </div>
    </div>
  );
};

export default BulkOperationBar;

