import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'antd';
import { UserOutlined, CalendarOutlined, DollarOutlined, TrophyOutlined } from '@ant-design/icons';

// Components
import { MetricCard, PermissionGuard } from '@/components';

// Services
import { getMemberStats } from '@/modules/member/services/memberService';

/**
 * Dashboard Page
 * 仪表板页面
 */
const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalEvents: 0,
    totalRevenue: 0,
    totalAwards: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch member statistics
        const memberStats = await getMemberStats();
        
        setStats({
          totalMembers: memberStats.total || 0,
          totalEvents: 0, // TODO: Implement event service
          totalRevenue: 0, // TODO: Implement finance service
          totalAwards: 0, // TODO: Implement award service
          loading: false,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <PermissionGuard permissions="DASHBOARD_VIEW">
      <div>
      <h1 style={{ marginBottom: 24 }}>欢迎来到 JCI KL 会员管理系统</h1>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="会员总数"
            value={stats.totalMembers}
            prefix={<UserOutlined />}
            color="#52c41a"
            loading={stats.loading}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="活动总数"
            value={stats.totalEvents}
            prefix={<CalendarOutlined />}
            color="#1890ff"
            loading={stats.loading}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="总收入"
            value={stats.totalRevenue}
            suffix="RM"
            prefix={<DollarOutlined />}
            color="#f5222d"
            loading={stats.loading}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            title="奖项数量"
            value={stats.totalAwards}
            prefix={<TrophyOutlined />}
            color="#faad14"
            loading={stats.loading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="系统状态" className="content-card">
            <p>✅ 全局设置系统已初始化</p>
            <p>✅ 深色模式主题已配置</p>
            <p>✅ 组件库已集成</p>
            <p>✅ Firebase 连接已建立</p>
            <p>✅ 权限系统已配置</p>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="快速操作" className="content-card">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>📊 查看会员统计</li>
              <li>👥 管理会员信息</li>
              <li>⚙️ 配置系统设置</li>
              <li>🎨 自定义主题</li>
              <li>🔐 权限管理</li>
            </ul>
          </Card>
        </Col>
      </Row>
      </div>
    </PermissionGuard>
  );
};

export default DashboardPage;


