import React from 'react';
import { Space, Button, Popconfirm } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteConfirmTitle?: string;
  extra?: React.ReactNode;
  size?: 'small' | 'middle' | 'large';
}

/**
 * Action Buttons Component
 * 操作按钮组
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onView,
  onEdit,
  onDelete,
  deleteConfirmTitle = '确定要删除吗？',
  extra,
  size = 'small',
}) => {
  return (
    <Space size="small">
      {onView && (
        <Button
          type="link"
          size={size}
          icon={<EyeOutlined />}
          onClick={onView}
        >
          查看
        </Button>
      )}

      {onEdit && (
        <Button
          type="link"
          size={size}
          icon={<EditOutlined />}
          onClick={onEdit}
        >
          编辑
        </Button>
      )}

      {onDelete && (
        <Popconfirm
          title={deleteConfirmTitle}
          onConfirm={onDelete}
          okText="删除"
          cancelText="取消"
          okType="danger"
        >
          <Button
            type="link"
            size={size}
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>
      )}

      {extra}
    </Space>
  );
};

export default ActionButtons;

