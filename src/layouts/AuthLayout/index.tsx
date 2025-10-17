import React from 'react';
import { Layout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import './styles.css';

/**
 * Auth Layout Component
 * 认证布局组件
 */
const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <h1>JCI KL</h1>
          <p>超级国际青年商会吉隆坡分会</p>
        </div>
        
        <div className="auth-content">
          <Outlet />
        </div>
        
        <div className="auth-footer">
          <p>© {new Date().getFullYear()} JCI KL. All rights reserved.</p>
        </div>
      </div>
    </Layout>
  );
};

export default AuthLayout;


