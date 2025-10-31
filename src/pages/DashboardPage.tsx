import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Avatar, Tag, Progress, Select, Button, Tooltip, Badge } from 'antd';
import { UserOutlined, CalendarOutlined, DollarOutlined, TrophyOutlined, GiftOutlined, ShopOutlined, HeartOutlined, TeamOutlined, FilterOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// Components
import { MetricCard, PermissionGuard } from '@/components';

// Services
import { 
  getMemberStats, 
  getUpcomingBirthdays, 
  getBirthdaysByMonth,
  getIndustryDistribution, 
  getInterestDistribution,
  getMembers
} from '@/modules/member/services/memberService';

// Types
import type { Member, IndustryType } from '@/modules/member/types';

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
  
  // 🆕 会员列表相关状态
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(null);
  const [selectedAcceptIntl, setSelectedAcceptIntl] = useState<'Yes' | 'No' | 'Willing to explore' | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<IndustryType | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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
          getIndustryDistribution(selectedAcceptIntl || undefined),
          getInterestDistribution(),
        ]);

        console.log('📊 [Dashboard] industry distribution received:', industries);
        setIndustryDistribution(industries);
        console.log('📊 [Dashboard] interest distribution received:', interests);
        setInterestDistribution(interests);
      } catch (error) {
        console.error('Failed to fetch lists:', error);
      } finally {
        setListsLoading(false);
      }
    };

    fetchLists();
  }, [selectedAcceptIntl]);

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

  // 🆕 加载会员列表
  useEffect(() => {
    const loadMembers = async () => {
      setMembersLoading(true);
      try {
        const result = await getMembers({
          page: 1,
          limit: 100, // 加载前100个会员
          status: 'active', // 只显示活跃会员
        });
        setMembers(result.data);
        setFilteredMembers(result.data);
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, []);

  // 🆕 工具: 将行业/兴趣字段规范为字符串数组
  const normalizeToStringArray = (value: any): string[] => {
    let base: any[] = [];
    if (Array.isArray(value)) base = value as any[];
    else if (value && typeof value === 'object') base = Object.values(value as Record<string, unknown>);
    else if (typeof value === 'string' && value) base = [value];
    return base.filter((v): v is string => typeof v === 'string' && !!v);
  };

  // 🆕 根据筛选条件过滤会员
  useEffect(() => {
    let filtered = [...members];

    // 按行业筛选
    if (selectedIndustry) {
      filtered = filtered.filter(m => normalizeToStringArray(m.profile?.ownIndustry).includes(selectedIndustry));
    }

    // 按兴趣筛选
    if (selectedInterest) {
      filtered = filtered.filter(m => normalizeToStringArray(m.profile?.interestedIndustries).includes(selectedInterest));
    }

    // 按会员ID筛选(反向筛选)
    if (selectedMemberId) {
      filtered = filtered.filter(m => m.id === selectedMemberId);
    }

    setFilteredMembers(filtered);
  }, [selectedIndustry, selectedInterest, selectedMemberId, members]);

  // 🆕 处理行业点击
  const handleIndustryClick = (industry: string) => {
    if (selectedIndustry === industry) {
      setSelectedIndustry(null); // 取消筛选
    } else {
      setSelectedIndustry(industry as IndustryType);
      setSelectedInterest(null); // 清除兴趣筛选
      setSelectedMemberId(null); // 清除会员筛选
    }
  };

  // 🆕 处理兴趣点击
  const handleInterestClick = (interest: string) => {
    if (selectedInterest === interest) {
      setSelectedInterest(null); // 取消筛选
    } else {
      setSelectedInterest(interest as IndustryType);
      setSelectedIndustry(null); // 清除行业筛选
      setSelectedMemberId(null); // 清除会员筛选
    }
  };

  // 🆕 处理会员点击(反向筛选)
  const handleMemberClick = (member: Member) => {
    if (selectedMemberId === member.id) {
      setSelectedMemberId(null);
      setSelectedIndustry(null);
      setSelectedInterest(null);
    } else {
      setSelectedMemberId(member.id);
      // 反向筛选：如果会员有行业，高亮对应行业
      {
        const industries = normalizeToStringArray(member.profile?.ownIndustry);
        if (industries.length > 0) setSelectedIndustry(industries[0] as any);
      }
      // 反向筛选：如果会员有兴趣，高亮第一个兴趣
      {
        const interests = normalizeToStringArray(member.profile?.interestedIndustries);
        if (interests.length > 0) setSelectedInterest(interests[0] as any);
      }
    }
  };

  // 🆕 清除所有筛选
  const handleClearFilters = () => {
    setSelectedIndustry(null);
    setSelectedInterest(null);
    setSelectedMemberId(null);
  };

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

      {/* 会员生日列表：单独一行置顶 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={24} md={24} lg={24}>
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
            <div style={{
              maxHeight: 160,
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingBottom: 4,
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {(!listsLoading && upcomingBirthdays.length === 0) ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>
                    <div>{birthdayViewMode === 'upcoming' ? '未来30天无生日会员' : '本月无生日会员'}</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                      💡 请在会员管理中录入会员出生日期
                    </div>
                  </div>
                ) : (
                  upcomingBirthdays.slice(0, 10).map((item) => (
                    <div key={`${item.id}-${item.birthDate}`} style={{
                      minWidth: 220,
                      maxWidth: 260,
                      padding: '8px 10px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}>
                      <Avatar src={item.avatar} icon={<UserOutlined />} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                          {birthdayViewMode === 'upcoming' ? (
                            <Tag color={item.daysUntilBirthday === 0 ? 'red' : item.daysUntilBirthday! <= 7 ? 'orange' : 'blue'}>
                              {item.daysUntilBirthday === 0 ? '今天' : `${item.daysUntilBirthday}天后`}
                            </Tag>
                          ) : (
                            <Tag color="blue">{item.day}日</Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.birthDate}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {upcomingBirthdays.length > 0 && (
              <div style={{ 
                marginTop: 12, 
                padding: '8px 12px', 
                backgroundColor: '#f0f5ff', 
                borderRadius: 4,
                fontSize: '12px',
                color: '#595959'
              }}>
                💡 共找到 {upcomingBirthdays.length} 位会员，显示前 10 位
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 会员行业分布、兴趣分布、会员列表：三卡片同排 */}
      <Row gutter={[16, 16]}>
        {/* 会员行业分布 */}
        <Col xs={8} sm={8} md={8} lg={8}>
          <Card 
            title={
              <span>
                <ShopOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                会员行业分布
              </span>
            } 
            className="content-card"
            extra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Select
                  size="small"
                  placeholder="跨境业务"
                  style={{ width: 130 }}
                  value={(selectedAcceptIntl ?? 'ALL') as any}
                  onChange={(val) => {
                    if (val === 'ALL') {
                      setSelectedAcceptIntl(null);
                    } else {
                      setSelectedAcceptIntl(val as any);
                    }
                  }}
                  options={[
                    { label: 'All', value: 'ALL' },
                    { label: 'Yes', value: 'Yes' },
                    { label: 'No', value: 'No' },
                    { label: 'Willing to explore', value: 'Willing to explore' },
                  ]}
                />
                <Badge 
                  count={selectedIndustry ? <FilterOutlined style={{ color: '#1890ff' }} /> : 0}
                  offset={[-5, 5]}
                >
                  <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {selectedAcceptIntl ? `筛: ${selectedAcceptIntl}` : '全部'}
                  </span>
                </Badge>
              </div>
            }
          >
            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <List
              loading={listsLoading}
              dataSource={industryDistribution}
              locale={{ emptyText: '暂无行业数据' }}
              renderItem={item => (
                <List.Item 
                  style={{ 
                    padding: '8px 0', 
                    display: 'block',
                    cursor: 'pointer',
                    backgroundColor: selectedIndustry === item.industry ? '#e6f7ff' : 'transparent',
                    borderRadius: 4,
                    paddingLeft: selectedIndustry === item.industry ? 8 : 0,
                    paddingRight: selectedIndustry === item.industry ? 8 : 0,
                    transition: 'all 0.3s',
                  }}
                  onClick={() => handleIndustryClick(item.industry)}
                >
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tooltip title="点击筛选会员">
                        <span style={{ 
                          fontSize: '13px', 
                          color: selectedIndustry === item.industry ? '#1890ff' : '#262626',
                          fontWeight: selectedIndustry === item.industry ? 600 : 400,
                        }}>
                          {selectedIndustry === item.industry && '👉 '}
                          {item.industry}
                        </span>
                      </Tooltip>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.count} 人
                      </span>
                    </div>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    strokeColor={selectedIndustry === item.industry ? '#1890ff' : '#91d5ff'}
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
            </div>
          </Card>
        </Col>

        {/* 会员兴趣分布 */}
        <Col xs={8} sm={8} md={8} lg={8}>
          <Card 
            title={
              <span>
                <HeartOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                会员兴趣分布
              </span>
            } 
            className="content-card"
            extra={
              <Badge 
                count={selectedInterest ? <FilterOutlined style={{ color: '#52c41a' }} /> : 0}
                offset={[-5, 5]}
              >
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Top 10</span>
              </Badge>
            }
          >
            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <List
              loading={listsLoading}
              dataSource={interestDistribution}
              locale={{ emptyText: '暂无兴趣数据' }}
              renderItem={item => (
                <List.Item 
                  style={{ 
                    padding: '8px 0', 
                    display: 'block',
                    cursor: 'pointer',
                    backgroundColor: selectedInterest === item.industry ? '#f6ffed' : 'transparent',
                    borderRadius: 4,
                    paddingLeft: selectedInterest === item.industry ? 8 : 0,
                    paddingRight: selectedInterest === item.industry ? 8 : 0,
                    transition: 'all 0.3s',
                  }}
                  onClick={() => handleInterestClick(item.industry)}
                >
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tooltip title="点击筛选会员">
                        <span style={{ 
                          fontSize: '13px', 
                          color: selectedInterest === item.industry ? '#52c41a' : '#262626',
                          fontWeight: selectedInterest === item.industry ? 600 : 400,
                        }}>
                          {selectedInterest === item.industry && '👉 '}
                          {item.industry}
                        </span>
                      </Tooltip>
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {item.count} 人
                      </span>
                    </div>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    size="small" 
                    strokeColor={selectedInterest === item.industry ? '#52c41a' : '#95de64'}
                    showInfo={false}
                  />
                </List.Item>
              )}
            />
            </div>
          </Card>
        </Col>
      {/* 🆕 会员列表卡片 */}
        <Col xs={8} sm={8} md={8} lg={8}>
          <Card 
            title={
              <span>
                <TeamOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                会员列表
                {(selectedIndustry || selectedInterest || selectedMemberId) && (
                  <Tag color="blue" style={{ marginLeft: 12 }}>
                    已筛选 {filteredMembers.length} / {members.length}
                  </Tag>
                )}
              </span>
            } 
            className="content-card"
            extra={
              (selectedIndustry || selectedInterest || selectedMemberId) ? (
                <Button 
                  type="link" 
                  size="small" 
                  icon={<CloseCircleOutlined />}
                  onClick={handleClearFilters}
                >
                  清除筛选
                </Button>
              ) : null
            }
          >
            {/* 筛选条件显示 */}
            {(selectedIndustry || selectedInterest) && (
              <div style={{ 
                marginBottom: 16, 
                padding: '12px 16px', 
                backgroundColor: '#f0f5ff', 
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <FilterOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontSize: '13px', color: '#595959' }}>当前筛选：</span>
                {selectedIndustry && (
                  <Tag color="blue" closable onClose={() => setSelectedIndustry(null)}>
                    行业：{selectedIndustry}
                  </Tag>
                )}
                {selectedInterest && (
                  <Tag color="green" closable onClose={() => setSelectedInterest(null)}>
                    兴趣：{selectedInterest}
                  </Tag>
                )}
              </div>
            )}

            <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <List
              loading={membersLoading}
              dataSource={filteredMembers.slice(0, 20)} // 只显示前20个
              locale={{ emptyText: '暂无会员数据' }}
              itemLayout="horizontal"
              renderItem={member => (
                <List.Item
                  style={{
                    padding: '8px 4px',
                    cursor: 'pointer',
                    backgroundColor: selectedMemberId === member.id ? '#fff7e6' : 'transparent',
                    borderRadius: selectedMemberId === member.id ? 4 : 0,
                    transition: 'background-color 0.2s ease',
                  }}
                  onClick={() => handleMemberClick(member)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={member.profile?.avatar} 
                        icon={<UserOutlined />}
                        size={40}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#262626',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          paddingRight: 8,
                        }}>
                          {member.name}
                        </span>
                        <span>
                          {member.category && (
                            <Tag 
                              color={
                                member.category === 'Official Member' ? 'blue' :
                                member.category === 'Associate Member' ? 'green' :
                                member.category === 'Alumni' ? 'orange' : 'default'
                              }
                              style={{ fontSize: '10px', lineHeight: '16px', height: 18 }}
                            >
                              {member.category}
                            </Tag>
                          )}
                        </span>
                      </div>
                    }
                    description={
                      <div style={{
                        fontSize: '11px',
                        color: '#8c8c8c',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {member.profile?.ownIndustry?.[0] || '未设置行业'}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            </div>
            {filteredMembers.length > 20 && (
              <div style={{ 
                marginTop: 16, 
                padding: '8px 12px', 
                backgroundColor: '#f0f5ff', 
                borderRadius: 4,
                fontSize: '12px',
                color: '#595959',
                textAlign: 'center',
              }}>
                💡 共找到 {filteredMembers.length} 位会员，显示前 20 位
              </div>
            )}
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
