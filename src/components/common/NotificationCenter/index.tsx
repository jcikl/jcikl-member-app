import React, { useState } from 'react';
import { Badge, Dropdown, List, Button, Tabs, Empty, Avatar } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';

// 全局配置
import { globalDateService } from '@/config/globalDateSettings';

// 类型定义
import type { NotificationCenterProps, NotificationType } from './types';

// 样式
import './styles.css';

/**
 * NotificationCenter Component
 * 通知中心组件
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onNotificationClick,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

  const menuContent = (
    <div className="notification-center__dropdown">
      <div className="notification-center__header">
        <h3>通知</h3>
        <Button type="link" size="small" onClick={onMarkAllRead}>
          全部标为已读
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as any)}
        items={[
          { key: 'all', label: '全部' },
          { key: 'system', label: '系统' },
          { key: 'approval', label: '审批' },
          { key: 'event', label: '活动' },
          { key: 'message', label: '消息' },
        ]}
      />

      <List
        className="notification-center__list"
        dataSource={filteredNotifications}
        renderItem={(item) => (
          <List.Item
            className={!item.read ? 'unread' : ''}
            onClick={() => onNotificationClick(item)}
            actions={[
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(item.id);
                }}
              />,
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              />,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar>{item.type[0].toUpperCase()}</Avatar>}
              title={item.title}
              description={globalDateService.fromNow(item.timestamp)}
            />
          </List.Item>
        )}
        locale={{ emptyText: <Empty description="暂无通知" /> }}
      />
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => menuContent}
      trigger={['click']}
      placement="bottomRight"
      className={className}
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined />}
          shape="circle"
          size="large"
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;

