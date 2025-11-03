import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import { CalendarOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons';

// 导入各个子页面组件
import EventListPage from '../EventListPage';
import EventRegistrationManagementPage from '../EventRegistrationManagementPage';
import EventAccountManagementPage from '../EventAccountManagementPage';

// 导入样式
import './styles.css';

/**
 * Event Management Page with Tabs
 * 活动管理页面（标签页模式）
 * 
 * 整合以下功能：
 * - 活动列表
 * - 报名管理
 * - 活动账户
 */
const EventManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('list');

  const tabItems = [
    {
      key: 'list',
      label: (
        <span>
          <CalendarOutlined />
          活动列表
        </span>
      ),
      children: (
        <div className="event-management-tab-content">
          <EventListPage />
        </div>
      ),
    },
    {
      key: 'registrations',
      label: (
        <span>
          <TeamOutlined />
          报名管理
        </span>
      ),
      children: (
        <div className="event-management-tab-content">
          <EventRegistrationManagementPage />
        </div>
      ),
    },
    {
      key: 'accounts',
      label: (
        <span>
          <BankOutlined />
          活动账户
        </span>
      ),
      children: (
        <div className="event-management-tab-content">
          <EventAccountManagementPage />
        </div>
      ),
    },
  ];

  return (
    <div className="event-management-page">
      <Card className="event-management-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default EventManagementPage;

