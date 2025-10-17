import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useGlobalStore } from '@/stores/globalStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import './styles.css';

const { Content } = Layout;

/**
 * Main Layout Component
 * 主布局组件
 */
const MainLayout: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { sidebarCollapsed } = useGlobalStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={sidebarCollapsed} />
      
      <Layout
        style={{
          marginLeft: sidebarCollapsed ? 80 : 200,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header />
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
        
        <Footer />
      </Layout>
    </Layout>
  );
};

export default MainLayout;


