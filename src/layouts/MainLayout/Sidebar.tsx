import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
}

/**
 * Sidebar Component
 * 侧边栏组件
 */
const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: 'members-menu',
      icon: <UserOutlined />,
      label: '会员管理',
      children: [
        {
          key: '/members',
          label: '会员列表',
        },
      ],
    },
    {
      key: 'events-menu',
      icon: <CalendarOutlined />,
      label: '活动管理',
      children: [
        {
          key: '/events',
          label: '活动列表',
        },
      ],
    },
    {
      key: 'finance-menu',
      icon: <DollarOutlined />,
      label: '财务管理',
      children: [
        {
          key: '/finance/overview',
          label: '财务概览',
        },
        {
          key: '/finance/bank-accounts',
          label: '银行账户',
        },
        {
          key: '/finance/transactions',
          label: '交易记录',
        },
        {
          key: '/finance/member-fees',
          label: '会员费用',
        },
        {
          key: '/finance/events',
          label: '活动财务',
        },
        {
          key: '/finance/accounts',
          label: '日常账户',
        },
        {
          key: '/finance/fiscal-years',
          label: '财年管理',
        },
        {
          key: '/finance/records',
          label: '财务记录',
        },
      ],
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/settings/global',
          label: '全局配置',
        },
      ],
    },
    
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      className="app-sider"
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={200}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border-color-light)',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div
        className="app-logo"
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold',
          borderBottom: '1px solid var(--border-color-light)',
        }}
      >
        {collapsed ? 'JCI' : 'JCI KL'}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          border: 'none',
        }}
      />
    </Sider>
  );
};

export default Sidebar;

