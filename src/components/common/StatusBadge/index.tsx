import React from 'react';
import { Badge, Tag } from 'antd';
import { globalComponentService } from '@/config';
import type { Status } from '@/types';

interface StatusBadgeProps {
  status: Status;
  text?: string;
  showDot?: boolean;
}

/**
 * Status Badge Component
 * 状态徽章组件
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showDot = false,
}) => {
  const color = globalComponentService.getStatusColor(status);
  const defaultText = globalComponentService.getStatusText(status);
  const displayText = text || defaultText;

  if (showDot) {
    return <Badge status={color} text={displayText} />;
  }

  return <Tag color={color}>{displayText}</Tag>;
};

export default StatusBadge;


