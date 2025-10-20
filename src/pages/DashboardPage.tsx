import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Avatar, Tag, Progress, Select } from 'antd';
import { UserOutlined, CalendarOutlined, DollarOutlined, TrophyOutlined, GiftOutlined, ShopOutlined, HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// Components
import { MetricCard, PermissionGuard } from '@/components';

// Services
import { 
  getMemberStats, 
  getUpcomingBirthdays, 
  getBirthdaysByMonth,
  getIndustryDistribution, 
  getInterestDistribution 
} from '@/modules/member/services/memberService';

const { Option } = Select;

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

  const [birthdayViewMode, setBirthdayViewMode] = useState<'upcoming' | 'month'>('upcoming');
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month()); // 0-11
  
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{
    id: string;
    name: string;
    birthDate: string;
    daysUntilBirthday?: number;
    day?: number;
    avatar?: string;
  }>>([]);

  const [industryDistribution, setIndustryDistribution] = useState<Array<{
    industry: string;
    count: number;
    percentage: number;
  }>>([]);

  const [interestDistribution, setInterestDistribution] = useState<Array<{
    industry: string;
    count: number;
    percentage: number;
  }>>([]);

  const [listsLoading, setListsLoading] = useState(true);

  // 月份选项
  const monthOptions = [
    { label: '一月 (January)', value: 0 },
    { label: '二月 (February)', value: 1 },
    { label: '三月 (March)', value: 2 },
    { label: '四月 (April)', value: 3 },
    { label: '五月 (May)', value: 4 },
    { label: '六月 (June)', value: 5 },
    { label: '七月 (July)', value: 6 },
    { label: '八月 (August)', value: 7 },
    { label: '九月 (September)', value: 8 },
    { label: '十月 (October)', value: 9 },
    { label: '十一月 (November)', value: 10 },
    { label: '十二月 (December)', value: 11 },
  ];

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

  useEffect(() => {
    const fetchLists = async () => {
      setListsLoading(true);
      try {
        const [industries, interests] = await Promise.all([
          getIndustryDistribution(),
          getInterestDistribution(),
        ]);

        setIndustryDistribution(industries);
        setInterestDistribution(interests);
      } catch (error) {
        console.error('Failed to fetch lists:', error);
      } finally {
        setListsLoading(false);
      }
    };

    fetchLists();
  }, []);

  // 加载生日数据
  useEffect(() => {
    const loadBirthdays = async () => {
      setListsLoading(true);
      try {
        if (birthdayViewMode === 'upcoming') {
          const birthdays = await getUpcomingBirthdays(30);
          setUpcomingBirthdays(birthdays);
        } else {
          const birthdays = await getBirthdaysByMonth(selectedMonth);
          setUpcomingBirthdays(birthdays);
        }
      } catch (error) {
        console.error('Failed to fetch birthdays:', error);
      } finally {
        setListsLoading(false);
      }
    };

    loadBirthdays();
  }, [birthdayViewMode, selectedMonth]);

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

      {/* 会员信息列表 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 会员生日列表 */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span>
                <GiftOutlined style={{ marginRight: 8, color: '#f5222d' }} />
                会员生日列表
              </span>
            } 
            className="content-card"
            extra={
              <Select
                size="small"
                value={birthdayViewMode === 'upcoming' ? 'upcoming' : selectedMonth}
                onChange={(value) => {
                  if (value === 'upcoming') {
                    setBirthdayViewMode('upcoming');
                  } else {
                    setBirthdayViewMode('month');
                    setSelectedMonth(value as number);
                  }
                }}
                style={{ width: 140 }}
              >
                <Option value="upcoming">即将到来</Option>
                {monthOptions.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label.split(' ')[0]}
                  </Option>
                ))}
              </Select>
            }
          >
            <List
              loading={listsLoading}
              dataSource={upcomingBirthdays.slice(0, 10)}
              locale={{ emptyText: birthdayViewMode === 'upcoming' ? '未来30天无生日会员' : '本月无生日会员' }}
              renderItem={item => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={item.avatar} 
                        icon={<UserOutlined />}
                        size="small"
                      />
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px' }}>{item.name}</span>
                        {birthdayViewMode === 'upcoming' ? (
                          <Tag color={item.daysUntilBirthday === 0 ? 'red' : item.daysUntilBirthday! <= 7 ? 'orange' : 'blue'}>
                            {item.daysUntilBirthday === 0 ? '今天' : `${item.daysUntilBirthday}天后`}
                          </Tag>
                        ) : (
                          <Tag color="blue">{item.day}日</Tag>
                        )}
                      </div>
                    }
                    description={
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.birthDate}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 会员行业分布 */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span>
                <ShopOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                会员行业分布
              </span>
            } 
            className="content-card"
            extra={<span style={{ fontSize: '12px', color: '#8c8c8c' }}>Top 10</span>}
          >
            <List
              loading={listsLoading}
              dataSource={industryDistribution}
              locale={{ emptyText: '暂无行业数据' }}
              renderItem={item => (
                <List.Item style={{ padding: '8px 0', display: 'block' }}>
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#262626' }}>
                        {item.industry}
                      </span>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.count} 人
                      </span>
                    </div>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    strokeColor="#1890ff"
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 会员兴趣分布 */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span>
                <HeartOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                会员兴趣分布
              </span>
            } 
            className="content-card"
            extra={<span style={{ fontSize: '12px', color: '#8c8c8c' }}>Top 10</span>}
          >
            <List
              loading={listsLoading}
              dataSource={interestDistribution}
              locale={{ emptyText: '暂无兴趣数据' }}
              renderItem={item => (
                <List.Item style={{ padding: '8px 0', display: 'block' }}>
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#262626' }}>
                        {item.industry}
                      </span>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.count} 人
                      </span>
                    </div>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    strokeColor="#52c41a"
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
          </Card>
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
