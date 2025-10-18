/**
 * Event Detail Page
 * 活动详情页面
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Tabs,
  Modal,
  Empty,
  Spin,
  App,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components';
import { getEventById, deleteEvent, getEventRegistrations } from '../../services/eventService';
import type { Event, EventRegistration } from '../../types';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import { globalDateService } from '@/config/globalDateSettings';
import './styles.css';

/**
 * Event Detail Page Component
 */
const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchEvent();
      fetchRegistrations();
    }
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const eventData = await getEventById(id);
      if (eventData) {
        setEvent(eventData);
      } else {
        message.error('活动不存在');
        navigate('/events');
      }
    } catch (error) {
      message.error('获取活动信息失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!id) return;

    try {
      const registrationsData = await getEventRegistrations(id);
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('获取报名记录失败', error);
    }
  };

  const handleEdit = () => {
    if (id) {
      navigate(`/events/${id}/edit`);
    }
  };

  const handleDelete = () => {
    if (!id || !event) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除活动"${event.name}"吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await handleAsyncOperation(
            () => deleteEvent(id),
            '活动删除成功',
            '删除活动失败'
          );
          navigate('/events');
        } catch (error) {
          console.error('删除活动失败', error);
        }
      },
    });
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // const registrationColumns = [
  //   {
  //     title: '姓名',
  //     dataIndex: 'memberName',
  //     key: 'memberName',
  //   },
  //   {
  //     title: '邮箱',
  //     dataIndex: 'memberEmail',
  //     key: 'memberEmail',
  //   },
  //   {
  //     title: '报名时间',
  //     dataIndex: 'registeredAt',
  //     key: 'registeredAt',
  //     render: (date: string) => globalDateService.formatDate(date, 'display'),
  //   },
  //   {
  //     title: '状态',
  //     dataIndex: 'status',
  //     key: 'status',
  //     render: (status: string) => (
  //       <Tag color={status === 'Approved' ? 'success' : 'processing'}>
  //         {status === 'Approved' ? '已批准' : '待审核'}
  //       </Tag>
  //     ),
  //   },
  // ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Empty description="活动不存在" />
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      <PageHeader
        title={event.name}
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '活动管理', path: '/events' },
          { title: event.name },
        ]}
        extra={
          <Space>
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              编辑活动
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              删除活动
            </Button>
          </Space>
        }
      />

      {/* Main Content */}
      <div className="event-detail-content">
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          items={[
            {
              key: 'overview',
              label: '概览',
              children: (
                <>
                  <Card title="基本信息" className="mb-4">
                    <Descriptions column={2} bordered>
                      <Descriptions.Item label="活动编号" span={1}>
                        {event.eventCode || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="活动级别" span={1}>
                        <Tag>
                          {event.level === 'Local' ? '本地' : 
                           event.level === 'Area' ? '区域' : 
                           event.level === 'National' ? '国家级' : 
                           event.level === 'JCI' ? 'JCI' : event.level}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="活动状态" span={1}>
                        <Tag color={
                          event.status === 'Published' ? 'success' :
                          event.status === 'Draft' ? 'default' :
                          event.status === 'Cancelled' ? 'error' : 'processing'
                        }>
                          {event.status === 'Published' ? '已发布' :
                           event.status === 'Draft' ? '草稿' :
                           event.status === 'Cancelled' ? '已取消' : '已完成'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="活动类型" span={1}>
                        {event.category || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="活动描述" span={2}>
                        {event.description || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card title="时间信息" className="mb-4">
                    <Descriptions column={2} bordered>
                      <Descriptions.Item label="开始时间" span={1}>
                        <CalendarOutlined className="mr-2" />
                        {globalDateService.formatDate(event.startDate, 'display')}
                      </Descriptions.Item>
                      <Descriptions.Item label="结束时间" span={1}>
                        <CalendarOutlined className="mr-2" />
                        {globalDateService.formatDate(event.endDate, 'display')}
                      </Descriptions.Item>
                      {event.registrationDeadline && (
                        <Descriptions.Item label="报名截止" span={2}>
                          <CalendarOutlined className="mr-2" />
                          {globalDateService.formatDate(event.registrationDeadline, 'display')}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>

                  <Card title="地点信息" className="mb-4">
                    <Descriptions column={2} bordered>
                      <Descriptions.Item label="活动形式" span={2}>
                        {event.isOnline ? (
                          <Tag color="blue">线上活动</Tag>
                        ) : (
                          <Tag>线下活动</Tag>
                        )}
                      </Descriptions.Item>
                      {event.isOnline ? (
                        <Descriptions.Item label="线上链接" span={2}>
                          {event.onlineLink ? (
                            <a href={event.onlineLink} target="_blank" rel="noopener noreferrer">
                              {event.onlineLink}
                            </a>
                          ) : '-'}
                        </Descriptions.Item>
                      ) : (
                        <>
                          <Descriptions.Item label="地点" span={1}>
                            <EnvironmentOutlined className="mr-2" />
                            {event.location || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="场馆" span={1}>
                            {event.venue || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="详细地址" span={2}>
                            {event.address || '-'}
                          </Descriptions.Item>
                        </>
                      )}
                    </Descriptions>
                  </Card>

                  <Card title="参与信息" className="mb-4">
                    <Descriptions column={2} bordered>
                      <Descriptions.Item label="当前参与人数" span={1}>
                        <UserOutlined className="mr-2" />
                        {event.currentParticipants} 人
                      </Descriptions.Item>
                      <Descriptions.Item label="最大容量" span={1}>
                        {event.maxParticipants ? `${event.maxParticipants} 人` : '无限制'}
                      </Descriptions.Item>
                      <Descriptions.Item label="候补名单" span={2}>
                        {event.waitlistEnabled ? (
                          <Tag color="blue">已启用</Tag>
                        ) : (
                          <Tag>未启用</Tag>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {!event.isFree && (
                    <Card title="价格信息" className="mb-4">
                      <Descriptions column={2} bordered>
                        <Descriptions.Item label="访客价格" span={1}>
                          <DollarOutlined className="mr-2" />
                          {event.pricing.currency} {event.pricing.regularPrice}
                        </Descriptions.Item>
                        <Descriptions.Item label="会员价格" span={1}>
                          <DollarOutlined className="mr-2" />
                          {event.pricing.currency} {event.pricing.memberPrice}
                        </Descriptions.Item>
                        <Descriptions.Item label="校友价格" span={1}>
                          <DollarOutlined className="mr-2" />
                          {event.pricing.currency} {event.pricing.alumniPrice}
                        </Descriptions.Item>
                        <Descriptions.Item label="早鸟价格" span={1}>
                          <DollarOutlined className="mr-2" />
                          {event.pricing.currency} {event.pricing.earlyBirdPrice}
                        </Descriptions.Item>
                        <Descriptions.Item label="委员会价格" span={1}>
                          <DollarOutlined className="mr-2" />
                          {event.pricing.currency} {event.pricing.committeePrice}
                        </Descriptions.Item>
                        <Descriptions.Item label="早鸟截止" span={1}>
                          {event.pricing.earlyBirdDeadline 
                            ? globalDateService.formatDate(event.pricing.earlyBirdDeadline, 'display')
                            : '-'}
                        </Descriptions.Item>
                        {event.financialAccountName && (
                          <Descriptions.Item label="财务账户" span={2}>
                            <Tag color="blue" icon={<DollarOutlined />}>
                              {event.financialAccountName}
                            </Tag>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Card>
                  )}

                  <Card title="组织者信息" className="mb-4">
                    <Descriptions column={2} bordered>
                      <Descriptions.Item label="组织者" span={2}>
                        {event.organizerName}
                      </Descriptions.Item>
                      <Descriptions.Item label="联系人" span={1}>
                        {event.contactPerson || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="联系电话" span={1}>
                        {event.contactPhone || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="联系邮箱" span={2}>
                        {event.contactEmail || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </>
              ),
            },
            {
              key: 'registrations',
              label: `报名情况 (${registrations.length})`,
              children: (
                <Card title="报名记录">
                  {registrations.length > 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      报名列表功能开发中...
                    </div>
                  ) : (
                    <Empty description="暂无报名记录" />
                  )}
                </Card>
              ),
            },
            {
              key: 'analytics',
              label: '数据分析',
              children: (
                <Card title="活动数据分析">
                  <div className="text-center py-8 text-gray-500">
                    数据分析功能开发中...
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default EventDetailPage;