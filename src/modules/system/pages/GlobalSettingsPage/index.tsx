import React, { useState, useEffect } from 'react';
import { Card, Tabs, Alert, Button, Space, Spin, message } from 'antd';
import {
  BgColorsOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  SettingOutlined,
  // DatabaseOutlined, // 已删除（DataInitializer 组件已移除）
  UserOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components';
import { useAuthStore } from '@/stores/authStore';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config';
import ThemeSettings from './components/ThemeSettings';
import ComponentSettings from './components/ComponentSettings';
import ValidationSettings from './components/ValidationSettings';
import DateFormatSettings from './components/DateFormatSettings';
import SystemSettings from './components/SystemSettings';
import ConfigExport from './components/ConfigExport';
// import DataInitializer from '@/components/admin/DataInitializer'; // 已删除
import './styles.css';

/**
 * Global Settings Management Page
 * 全局设置管理页面
 */
const GlobalSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('theme');
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查登录用户信息
    console.log('🔍 登录用户信息检查:');
    console.log('👤 用户对象:', user);
    console.log('🆔 用户ID:', user?.id);
    console.log('📧 用户邮箱:', user?.email);
    console.log('👑 用户角色:', user?.role);
    console.log('📊 用户状态:', user?.status);
    
    // 如果用户已经加载且有admin角色，直接设置权限
    if (user?.role === 'admin') {
      console.log('✅ 直接从用户数据确认管理员权限');
      setHasPermission(true);
      setLoading(false);
      setError(null);
    } else {
      checkPermissions();
    }
  }, [user?.id, user?.role]);

  const checkPermissions = async () => {
    console.log('🔍 开始权限检查...');
    console.log('👤 当前用户:', user);
    console.log('🆔 用户ID:', user?.id);
    console.log('📧 用户邮箱:', user?.email);
    console.log('👑 用户角色:', user?.role);
    console.log('📊 用户状态:', user?.status);
    
    if (!user?.id) {
      console.log('❌ 用户未登录');
      setError('用户未登录');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📋 检查用户会员文档...');
      // 检查用户是否有 member 文档且 role 为 admin
      const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, user.id);
      const memberSnap = await getDoc(memberRef);

      console.log('📄 会员文档存在:', memberSnap.exists());
      
      if (memberSnap.exists()) {
        const memberData = memberSnap.data();
        console.log('👤 会员数据:', memberData);
        console.log('🔑 用户角色:', memberData.role);
        
        if (memberData.role === 'admin') {
          console.log('✅ 管理员权限确认');
          setHasPermission(true);
        } else {
          console.log('❌ 非管理员角色:', memberData.role);
          setError(`您没有管理员权限，无法访问全局设置页面。当前角色: ${memberData.role}`);
        }
      } else {
        console.log('❌ 用户没有会员文档');
        setError('用户没有会员文档，请联系系统管理员');
      }
    } catch (err: any) {
      console.error('❌ 权限检查失败:', err);
      setError(err.message || '权限检查失败');
    } finally {
      setLoading(false);
    }
  };

  const setAdminRole = async () => {
    if (!user?.id) {
      message.error('用户未登录');
      return;
    }

    try {
      const memberRef = doc(db, GLOBAL_COLLECTIONS.MEMBERS, user.id);
      const memberSnap = await getDoc(memberRef);
      
      if (memberSnap.exists()) {
        // 更新现有文档
        await setDoc(memberRef, {
          role: 'admin',
          status: 'active',
          updatedAt: new Date(),
        }, { merge: true });
      } else {
        // 创建新文档
        await setDoc(memberRef, {
          id: user.id,
          name: 'System Admin',
          email: user.email,
          role: 'admin',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      message.success('✅ 管理员权限设置成功！');
      // 重新检查权限
      await checkPermissions();
    } catch (error: any) {
      message.error(`❌ 设置失败: ${error.message}`);
      console.error('Set admin role error:', error);
    }
  };

  const tabItems = [
    {
      key: 'theme',
      label: (
        <span>
          <BgColorsOutlined />
          主题设置
        </span>
      ),
      children: <ThemeSettings />,
    },
    {
      key: 'component',
      label: (
        <span>
          <AppstoreOutlined />
          组件配置
        </span>
      ),
      children: <ComponentSettings />,
    },
    {
      key: 'validation',
      label: (
        <span>
          <SafetyCertificateOutlined />
          验证规则
        </span>
      ),
      children: <ValidationSettings />,
    },
    {
      key: 'date',
      label: (
        <span>
          <CalendarOutlined />
          日期格式
        </span>
      ),
      children: <DateFormatSettings />,
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined />
          系统设置
        </span>
      ),
      children: <SystemSettings />,
    },
    // 数据初始化标签页已移除（DataInitializer 组件已删除）
    // {
    //   key: 'database',
    //   label: (
    //     <span>
    //       <DatabaseOutlined />
    //       数据初始化
    //     </span>
    //   ),
    //   children: <DataInitializer />,
    // },
  ];

  return (
    <div className="global-settings-page">
      <PageHeader
        title="全局配置管理"
        subtitle="管理系统级别的配置项"
        breadcrumbs={[
          { title: '首页', path: '/dashboard' },
          { title: '系统设置', path: '/settings' },
          { title: '全局配置' },
        ]}
        extra={<ConfigExport />}
      />

      {/* 调试信息 */}
      <Card style={{ marginBottom: 16 }}>
        <h4>🔍 调试信息</h4>
        <p><strong>用户ID:</strong> {user?.id || '未登录'}</p>
        <p><strong>用户邮箱:</strong> {user?.email || '未知'}</p>
        <p><strong>用户角色:</strong> {user?.role || '未知'}</p>
        <p><strong>用户状态:</strong> {user?.status || '未知'}</p>
        <p><strong>加载状态:</strong> {loading ? '加载中' : '已完成'}</p>
        <p><strong>权限状态:</strong> {hasPermission ? '有权限' : '无权限'}</p>
        <p><strong>错误信息:</strong> {error || '无错误'}</p>
      </Card>

      {loading && (
        <Card>
          <div className="text-center py-8">
            <Spin size="large" />
            <p className="mt-4">检查权限中...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <Alert
            message="访问受限"
            description={error}
            type="error"
            showIcon
            action={
              <Space>
                <Button size="small" onClick={checkPermissions}>
                  重新检查
                </Button>
                <Button 
                  size="small" 
                  type="primary"
                  icon={<UserOutlined />}
                  onClick={setAdminRole}
                >
                  设置管理员权限
                </Button>
                <Button size="small" onClick={() => window.location.href = '/debug/permissions'}>
                  查看权限详情
                </Button>
              </Space>
            }
          />
        </Card>
      )}

      {hasPermission && !loading && (
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Card>
      )}
    </div>
  );
};

export default GlobalSettingsPage;

