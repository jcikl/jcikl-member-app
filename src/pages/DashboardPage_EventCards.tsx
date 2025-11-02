import React from 'react';
import { Card, Row, Col, Tag, Typography, Space, Button, Empty, Skeleton } from 'antd';
import { CalendarOutlined, UserOutlined, TeamOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { OptimizedEventImage } from '@/components/OptimizedImage';
import type { Event } from '@/modules/event/types';

interface EventCardsProps {
  events: Event[];
  eventFinancials: Map<string, any>;
  eventFinancialsLoaded: boolean;
  eventsLoading: boolean;
  emptyDescription?: string;
  cardColor?: string;
  gradientColors?: [string, string];
  icon?: React.ReactNode;
}

/**
 * Dashboard Event Cards Component
 * 仪表板活动卡片组件
 */
export const DashboardEventCards: React.FC<EventCardsProps> = ({
  events,
  eventFinancials,
  eventFinancialsLoaded,
  eventsLoading,
  emptyDescription = "暂无活动",
  cardColor = "blue",
  gradientColors = ['#667eea', '#764ba2'],
  icon = <CalendarOutlined />,
}) => {
  const navigate = useNavigate();

  if (eventsLoading) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map(i => (
          <Col xs={24} sm={12} lg={8} xl={6} key={i}>
            <Card>
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (events.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />;
  }

  return (
    <Row gutter={[16, 16]}>
      {events.map((event) => {
        const chairman = event.committeeMembers?.find(m => m.position === '筹委主席');
        const priceRange = event.isFree 
          ? 'FREE' 
          : `RM ${event.pricing?.committeePrice || 0} - RM ${event.pricing?.regularPrice || 0}`;
        const financial = eventFinancials.get(event.id);
        const imageUrl = event.posterImage || event.coverImage;
        
        return (
          <Col xs={24} sm={12} lg={8} xl={6} key={event.id}>
            <Card
              hoverable
              className="event-card"
              cover={
                imageUrl ? (
                  <OptimizedEventImage
                    src={imageUrl}
                    alt={event.name}
                    aspectRatio={16/9}
                  />
                ) : (
                  <div style={{
                    height: 180,
                    background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 48,
                  }}>
                    {icon}
                  </div>
                )
              }
              actions={[
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/events/${event.id}`);
                  }}
                >
                  查看
                </Button>,
              ]}
              onClick={() => navigate(`/events/${event.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <Card.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography.Text strong ellipsis style={{ flex: 1 }}>
                      {event.name}
                    </Typography.Text>
                    <Tag color={cardColor} style={{ marginLeft: 8 }}>{event.level}</Tag>
                  </div>
                }
                description={
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <div>
                      <CalendarOutlined style={{ marginRight: 6 }} />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(event.startDate).format('YYYY-MM-DD HH:mm')}
                      </Typography.Text>
                    </div>
                    
                    {event.boardMember && (
                      <div>
                        <UserOutlined style={{ marginRight: 6 }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {event.boardMember}
                        </Typography.Text>
                      </div>
                    )}
                    
                    <div>
                      <TeamOutlined style={{ marginRight: 6 }} />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {chairman?.name || '-'}
                      </Typography.Text>
                    </div>
                    
                    <div>
                      <DollarOutlined style={{ marginRight: 6 }} />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {priceRange}
                      </Typography.Text>
                    </div>
                    
                    {/* 财务数据（如果已加载） */}
                    {eventFinancialsLoaded && financial && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: '8px', 
                        background: '#f0f5ff', 
                        borderRadius: 4,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>💰 财务概览</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 11 }}>
                          <Typography.Text type="secondary">预算</Typography.Text>
                          <Typography.Text strong>RM {financial.budgetTotal.toFixed(0)}</Typography.Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <Typography.Text type="secondary">净利润</Typography.Text>
                          <Typography.Text 
                            strong 
                            style={{ color: financial.netProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
                          >
                            RM {financial.netProfit.toFixed(0)}
                          </Typography.Text>
                        </div>
                      </div>
                    )}
                  </Space>
                }
              />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

