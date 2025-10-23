import React from 'react';
import { Card, Typography, Tag, Space, Divider, Image, List, Avatar } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import type { Event } from '../../types';
import { EVENT_STATUS_OPTIONS, EVENT_LEVEL_OPTIONS } from '../../types';
import { globalDateService } from '@/config/globalDateSettings';

const { Title, Text, Paragraph } = Typography;

interface EventPreviewProps {
  event: Event;
}

const EventPreview: React.FC<EventPreviewProps> = ({ event }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'success';
      case 'Draft': return 'default';
      case 'Cancelled': return 'error';
      case 'Completed': return 'processing';
      default: return 'default';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'JCI': return 'purple';
      case 'National': return 'blue';
      case 'Area': return 'green';
      case 'Local': return 'orange';
      default: return 'default';
    }
  };

  const statusOption = EVENT_STATUS_OPTIONS.find(opt => opt.value === event.status);
  const levelOption = EVENT_LEVEL_OPTIONS.find(opt => opt.value === event.level);

  return (
    <div className="event-preview">
      {/* 活动海报 */}
      {event.posterImage && (
        <Card className="mb-4" bodyStyle={{ padding: 0 }}>
          <Image
            src={event.posterImage}
            alt={event.name}
            style={{ width: '100%', height: 200, objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          />
        </Card>
      )}

      {/* 基本信息 */}
      <Card title="活动信息" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
              {event.name}
            </Title>
            <Space>
              <Tag color={getStatusColor(event.status)}>
                {statusOption?.label || event.status}
              </Tag>
              <Tag color={getLevelColor(event.level)}>
                {levelOption?.label || event.level}
              </Tag>
              {event.category && (
                <Tag>{event.category}</Tag>
              )}
            </Space>
          </div>

          {event.description && (
            <Paragraph ellipsis={{ rows: 3 }}>
              {event.description}
            </Paragraph>
          )}

          <Divider style={{ margin: '12px 0' }} />

          {/* 时间信息 */}
          <div>
            <Text strong>
              <CalendarOutlined style={{ marginRight: 8 }} />
              活动时间
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">
                开始：{globalDateService.formatDate(event.startDate, 'display')}
              </Text>
              <br />
              <Text type="secondary">
                结束：{globalDateService.formatDate(event.endDate, 'display')}
              </Text>
              {event.registrationStartDate && (
                <>
                  <br />
                  <Text type="secondary">
                    报名开始：{globalDateService.formatDate(event.registrationStartDate, 'display')}
                  </Text>
                </>
              )}
              {event.registrationDeadline && (
                <>
                  <br />
                  <Text type="secondary">
                    报名截止：{globalDateService.formatDate(event.registrationDeadline, 'display')}
                  </Text>
                </>
              )}
            </div>
          </div>

          {/* 地点信息 */}
          {!event.isOnline && event.location && (
            <div>
              <Text strong>
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                活动地点
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">{event.location}</Text>
                {event.venue && (
                  <>
                    <br />
                    <Text type="secondary">{event.venue}</Text>
                  </>
                )}
                {event.address && (
                  <>
                    <br />
                    <Text type="secondary">{event.address}</Text>
                  </>
                )}
              </div>
            </div>
          )}

          {event.isOnline && event.onlineLink && (
            <div>
              <Text strong>
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                线上活动
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">{event.onlineLink}</Text>
              </div>
            </div>
          )}

          {/* 参与信息 */}
          <div>
            <Text strong>
              <UserOutlined style={{ marginRight: 8 }} />
              参与信息
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">
                当前参与：{event.currentParticipants} 人
              </Text>
              {event.maxParticipants && (
                <>
                  <br />
                  <Text type="secondary">
                    最大参与：{event.maxParticipants} 人
                  </Text>
                </>
              )}
              {event.waitlistEnabled && (
                <>
                  <br />
                  <Text type="secondary">已启用候补名单</Text>
                </>
              )}
              {event.isPrivate && (
                <>
                  <br />
                  <Text type="secondary">私人活动</Text>
                </>
              )}
            </div>
          </div>

          {/* 费用信息 */}
          {!event.isFree && (
            <div>
              <Text strong>费用信息</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">
                  访客：RM {event.pricing.regularPrice}
                </Text>
                <br />
                <Text type="secondary">
                  会员：RM {event.pricing.memberPrice}
                </Text>
                {event.pricing.alumniPrice > 0 && (
                  <>
                    <br />
                    <Text type="secondary">
                      校友：RM {event.pricing.alumniPrice}
                    </Text>
                  </>
                )}
                {event.pricing.committeePrice > 0 && (
                  <>
                    <br />
                    <Text type="secondary">
                      委员会：RM {event.pricing.committeePrice}
                    </Text>
                  </>
                )}
              </div>
            </div>
          )}

          {event.isFree && (
            <div>
              <Text strong>费用信息</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">免费活动</Text>
              </div>
            </div>
          )}
        </Space>
      </Card>

      {/* 组织者信息 */}
      <Card title="组织者信息" className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 🆕 负责理事 */}
          {event.responsibleOfficer && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e6f7ff', 
              border: '1px solid #91d5ff',
              borderRadius: '4px',
              marginBottom: '12px'
            }}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ color: '#1890ff' }}>负责理事</Text>
              </div>
              <div style={{ marginBottom: 4 }}>
                <Text strong>{event.responsibleOfficer.name}</Text>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {event.responsibleOfficer.position}
                </Tag>
              </div>
              {event.responsibleOfficer.email && (
                <div>
                  <Text type="secondary">邮箱：{event.responsibleOfficer.email}</Text>
                </div>
              )}
              {event.responsibleOfficer.phone && (
                <div>
                  <Text type="secondary">电话：{event.responsibleOfficer.phone}</Text>
                </div>
              )}
            </div>
          )}
          
          <div>
            <Text strong>{event.organizerName}</Text>
            {event.coOrganizers && event.coOrganizers.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">协办组织：</Text>
                <div style={{ marginTop: 4 }}>
                  {event.coOrganizers.map((org, index) => (
                    <Tag key={index} style={{ marginBottom: 4 }}>
                      {org}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>

          {event.contactPerson && (
            <div>
              <Text strong>联系人：{event.contactPerson}</Text>
            </div>
          )}

          {event.contactPhone && (
            <div>
              <Text type="secondary">电话：{event.contactPhone}</Text>
            </div>
          )}

          {event.contactEmail && (
            <div>
              <Text type="secondary">邮箱：{event.contactEmail}</Text>
            </div>
          )}
        </Space>
      </Card>

      {/* 委员会成员 */}
      {event.committeeMembers && event.committeeMembers.length > 0 && (
        <Card title="委员会成员" className="mb-4">
          <List
            size="small"
            dataSource={event.committeeMembers}
            renderItem={(member) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<TeamOutlined />} />}
                  title={member.name}
                  description={
                    <Space>
                      <Text type="secondary">{member.position}</Text>
                      {member.canEditEvent && <Tag color="blue">编辑权限</Tag>}
                      {member.canApproveTickets && <Tag color="green">票务权限</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 讲师信息 */}
      {event.speakers && event.speakers.length > 0 && (
        <Card title="讲师信息" className="mb-4">
          <List
            size="small"
            dataSource={event.speakers}
            renderItem={(speaker) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    speaker.photo ? (
                      <Avatar src={speaker.photo} />
                    ) : (
                      <Avatar icon={<UserOutlined />} />
                    )
                  }
                  title={speaker.name}
                  description={
                    <Space direction="vertical" size="small">
                      {speaker.title && <Text type="secondary">{speaker.title}</Text>}
                      {speaker.bio && (
                        <Text type="secondary" ellipsis>
                          {speaker.bio}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default EventPreview;
