import React from 'react';
import { Layout, Menu, Badge } from 'antd';
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
  const [uncategorizedCount, setUncategorizedCount] = React.useState<number>(0);
  const [unpairedTransferCount, setUnpairedTransferCount] = React.useState<number>(0);

  React.useEffect(() => {
    const loadUncategorizedCount = async () => {
      try {
        const { getTransactions } = await import('@/modules/finance/services/transactionService');
        const res = await getTransactions({ category: 'uncategorized', limit: 10000 });
        setUncategorizedCount(res.total ?? res.data?.length ?? 0);
      } catch (e) {
        // ignore errors to avoid blocking layout
        setUncategorizedCount(0);
      }
    };
    const loadUnpairedTransferCount = async () => {
      try {
        const { getTransactions } = await import('@/modules/finance/services/transactionService');
        const res = await getTransactions({ limit: 10000 });
        const list = (res.data ?? []) as any[];
        const count = list.filter(t => t.isInternalTransfer === true && (!t.relatedTransferTransactionId || String(t.relatedTransferTransactionId).trim() === '')).length;
        setUnpairedTransferCount(count);
      } catch (e) {
        setUnpairedTransferCount(0);
      }
    };
    loadUncategorizedCount();
    loadUnpairedTransferCount();
  }, []);

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
        {
          key: '/events/registrations',
          label: '报名管理',
        },
        {
          key: '/events/accounts',
          label: '活动账户',
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
          label: (
            <span>
              交易记录{uncategorizedCount > 0 && (
                <Badge count={uncategorizedCount} overflowCount={9999} style={{ marginLeft: 8 }} />
              )}
            </span>
          ),
        },
        {
          key: '/finance/fiscal-years',
          label: '财年管理',
        },
        {
          key: '/finance/internal-transfer-pairing',
          label: (
            <span>
              内部转账配对{unpairedTransferCount > 0 && (
                <Badge count={unpairedTransferCount} overflowCount={9999} style={{ marginLeft: 8 }} />
              )}
            </span>
          ),
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
        {
          key: '/settings/financial-categories',
          label: '财务类别管理',
        },
      ],
    },
    {
      key: 'tools-menu',
      icon: <SettingOutlined />,
      label: '工具',
      children: [
        {
          key: '/settings/data-fix',
          label: '数据修复',
        },
        {
          key: '/settings/transaction-date-format-fix',
          label: '财务交易日期格式修复',
        },
        {
          key: '/settings/member-data-migration',
          label: '成员数据迁移',
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

