import React from 'react';
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import './styles.css';

interface EmptyStateProps {
  description?: string;
  image?: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

/**
 * Empty State Component
 * 空状态组件
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  description = '暂无数据',
  image,
  action,
}) => {
  return (
    <div className="empty-state-container">
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={description}
      >
        {action && (
          <Button
            type="primary"
            icon={action.icon || <PlusOutlined />}
            onClick={action.onClick}
          >
            {action.text}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;


