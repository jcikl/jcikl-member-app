import React from 'react';
import { Layout, Button, Dropdown, Avatar, Space } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useGlobalStore } from '@/stores/globalStore';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

const { Header: AntHeader } = Layout;

/**
 * Header Component
 * 顶部栏组件
 */
const Header: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useGlobalStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      className="app-header"
      style={{
        padding: '0 16px',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background-color 0.3s ease',
      }}
    >
      <Button
        type="text"
        icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggleSidebar}
        style={{
          fontSize: '16px',
          width: 64,
          height: 64,
          color: 'var(--text-primary)',
        }}
      />

      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar
            size="default"
            icon={<UserOutlined />}
            src={user?.avatar}
            alt={user?.name}
          />
          <span style={{ color: 'var(--text-primary)' }}>{user?.name}</span>
        </Space>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;


