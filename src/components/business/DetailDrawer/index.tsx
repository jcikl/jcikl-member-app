import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Tabs,
  Button,
  Space,
  Skeleton,
  Typography,
} from 'antd';
import {
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';


// 类型定义
import type { DetailDrawerProps, ActionButton } from './types';

// 样式
import './styles.css';

const { Title, Text } = Typography;

/**
 * DetailDrawer Component
 * 详情抽屉组件
 * 
 * @description 支持标签页展示、内嵌操作、权限控制、加载状态等功能
 */
export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  tabs,
  actions = [],
  footerActions = [],
  loading = false,
  onRefresh,
  width = 720,
  defaultActiveTab,
  destroyOnClose = true,
  maskClosable = false,
  className = '',
}) => {
  const [activeTabKey, setActiveTabKey] = useState<string>(
    defaultActiveTab || (tabs.length > 0 ? tabs[0].key : '')
  );

  // 当 tabs 变化时，确保 activeTabKey 有效
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.key === activeTabKey)) {
      setActiveTabKey(tabs[0].key);
    }
  }, [tabs, activeTabKey]);

  // 重置 activeTab 当 defaultActiveTab 改变时
  useEffect(() => {
    if (defaultActiveTab) {
      setActiveTabKey(defaultActiveTab);
    }
  }, [defaultActiveTab]);

  /**
   * 处理标签页切换
   */
  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  /**
   * 渲染操作按钮
   */
  const renderActionButton = (action: ActionButton) => {
    // 权限控制：如果 visible 为 false，不渲染按钮
    if (action.visible === false) {
      return null;
    }

    return (
      <Button
        key={action.key}
        type={action.type || 'default'}
        danger={action.danger}
        icon={action.icon}
        onClick={action.onClick}
        disabled={action.disabled}
        loading={action.loading}
        className={`detail-drawer__action-button ${action.danger ? 'danger' : ''}`}
      >
        {action.label}
      </Button>
    );
  };

  /**
   * 渲染头部额外操作
   */
  const renderHeaderExtra = () => {
    if (actions.length === 0 && !onRefresh) {
      return null;
    }

    return (
      <Space className="detail-drawer__header-actions">
        {/* 刷新按钮 */}
        {onRefresh && (
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
            title="刷新"
          />
        )}
        
        {/* 自定义操作按钮 */}
        {actions.map(renderActionButton)}
        
        {/* 关闭按钮 */}
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          className="detail-drawer__close-button"
        />
      </Space>
    );
  };

  /**
   * 渲染标签页内容
   */
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="detail-drawer__loading">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      );
    }

    const activeTab = tabs.find(tab => tab.key === activeTabKey);
    
    if (!activeTab) {
      return (
        <div className="detail-drawer__empty">
          <Text type="secondary">暂无内容</Text>
        </div>
      );
    }

    if (activeTab.loading) {
      return (
        <div className="detail-drawer__loading">
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      );
    }

    return (
      <div className="detail-drawer__tab-content">
        {activeTab.content}
      </div>
    );
  };

  /**
   * 渲染底部操作栏
   */
  const renderFooter = () => {
    if (footerActions.length === 0) {
      return null;
    }

    return (
      <div className="detail-drawer__footer">
        <Space>
          {footerActions.map(renderActionButton)}
        </Space>
      </div>
    );
  };

  // 转换 tabs 为 Ant Design Tabs 格式
  const tabItems = tabs.map(tab => ({
    key: tab.key,
    label: (
      <span>
        {tab.icon && <span className="detail-drawer__tab-icon">{tab.icon}</span>}
        {tab.label}
      </span>
    ),
    children: null, // 内容由 renderTabContent() 统一渲染
  }));

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <div className="detail-drawer__title-wrapper">
          <div className="detail-drawer__title-content">
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" className="detail-drawer__subtitle">
                {subtitle}
              </Text>
            )}
          </div>
          {renderHeaderExtra()}
        </div>
      }
      width={width}
      destroyOnClose={destroyOnClose}
      maskClosable={maskClosable}
      closable={false}
      footer={renderFooter()}
      className={`detail-drawer ${className}`}
      styles={{
        header: {
          padding: '24px',
          borderBottom: '1px solid #f0f0f0',
        },
        body: {
          padding: 0,
        },
        footer: {
          padding: '16px 24px',
          borderTop: '1px solid #f0f0f0',
        },
      }}
    >
      {/* 标签页导航 */}
      <div className="detail-drawer__tabs-wrapper">
        <Tabs
          activeKey={activeTabKey}
          onChange={handleTabChange}
          items={tabItems}
          className="detail-drawer__tabs"
          tabBarStyle={{
            padding: '0 24px',
            margin: 0,
          }}
        />
      </div>

      {/* 内容区域 */}
      <div className="detail-drawer__content">
        {renderTabContent()}
      </div>
    </Drawer>
  );
};

export default DetailDrawer;

