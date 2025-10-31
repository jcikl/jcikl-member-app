import React, { useEffect, useState } from 'react';
import { Result, Spin, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';


// 类型定义
import type { PermissionGuardProps } from './types';

/**
 * PermissionGuard Component
 * 权限守卫组件
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  mode = 'any',
  customCheck,
  fallback,
  loading = false,
  children,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    checkPermission();
  }, [permissions, mode]);

  /**
   * 检查权限
   */
  const checkPermission = async () => {
    setChecking(true);

    try {
      // 这里应该调用实际的权限检查服务
      // 暂时模拟检查逻辑
      const perms = Array.isArray(permissions) ? permissions : [permissions];
      
      if (customCheck) {
        // 使用自定义检查函数
        const userPermissions: string[] = []; // 从状态管理获取用户权限
        setHasPermission(customCheck(userPermissions));
      } else if (mode === 'all') {
        // 需要所有权限
        setHasPermission(perms.length > 0); // 简化逻辑
      } else {
        // 需要任意一个权限
        setHasPermission(perms.length > 0); // 简化逻辑
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      setHasPermission(false);
    } finally {
      setChecking(false);
    }
  };

  if (loading || checking) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ marginBottom: 16 }}>验证权限中...</div>
        <Spin />
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Result
        status="403"
        title="权限不足"
        subTitle="您没有访问此内容的权限"
        icon={<LockOutlined />}
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;

