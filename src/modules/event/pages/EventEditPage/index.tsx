/**
 * Event Edit Page
 * 活动编辑页面
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Spin, Empty, Tabs, Modal, Row, Col } from 'antd';
import { PageHeader } from '@/components';
import EventForm from '../../components/EventForm';
import EventPricingForm from '../../components/EventPricingForm';
import EventScheduleForm from '../../components/EventScheduleForm';
import EventRegistrationForm from '../../components/EventRegistrationForm';
import EventAgendaForm from '../../components/EventAgendaForm';
import EventCommitteeForm from '../../components/EventCommitteeForm';
import EventSpeakersForm from '../../components/EventSpeakersForm';
import EventPreview from '../../components/EventPreview';
import { getEventById, updateEvent } from '../../services/eventService';
import type { Event, EventFormData } from '../../types';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import { useAuthStore } from '@/stores/authStore';

/**
 * Event Edit Page Component
 */
const EventEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string>('basic');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;

    setFetchLoading(true);
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
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (values: EventFormData) => {
    if (!user || !id) {
      message.error('请先登录');
      return;
    }

    // 简单权限校验：仅组织者可编辑（如需更细粒度，接入全局权限服务）
    if (event && event.organizerId && user.id !== event.organizerId) {
      message.warning('您没有权限编辑此活动（仅组织者可编辑）');
      return;
    }

    setLoading(true);
    try {
      await handleAsyncOperation(
        () => updateEvent(id, values, user.id),
        '更新活动成功',
        '更新活动失败'
      );

      navigate(`/events/${id}`);
    } catch (error) {
      console.error('更新活动失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/events/${id}`);
  };

  if (fetchLoading) {
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
    <div className="event-edit-page">
      <PageHeader
        title="编辑活动"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '活动管理', path: '/events' },
          { title: event.name, path: `/events/${id}` },
          { title: '编辑' },
        ]}
        onBack={() => navigate(`/events/${id}`)}
      />

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Tabs
            activeKey={activeKey}
            onChange={(key) => {
              if (isDirty) {
                Modal.confirm({
                  title: '有未保存的更改，确定切换标签吗？',
                  okText: '切换',
                  cancelText: '取消',
                  onOk: () => {
                    setIsDirty(false);
                    setActiveKey(key);
                  },
                });
              } else {
                setActiveKey(key);
              }
            }}
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <EventForm
                    initialValues={event}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    submitText="保存更改"
                    loading={loading}
                  />
                ),
              },
              {
                key: 'schedule',
                label: '时间地点',
                children: (
                  <EventScheduleForm
                    initialValues={event}
                    loading={loading}
                    onSubmit={async (partial) => {
                      if (!id || !user) return;
                      if (event && event.organizerId && user.id !== event.organizerId) {
                        message.warning('您没有权限编辑此活动（仅组织者可编辑）');
                        return;
                      }
                      await handleAsyncOperation(
                        () => updateEvent(id, partial as any, user.id),
                        '时间与地点已保存',
                        '保存失败'
                      );
                      await fetchEvent();
                      setIsDirty(false);
                    }}
                  />
                ),
              },
              {
                key: 'pricing',
                label: '费用设置',
                children: (
                  <EventPricingForm
                    initialValues={event}
                    loading={loading}
                    onSubmit={async (partial) => {
                      if (!id || !user) return;
                      if (event && event.organizerId && user.id !== event.organizerId) {
                        message.warning('您没有权限编辑此活动（仅组织者可编辑）');
                        return;
                      }
                      await handleAsyncOperation(
                        () => updateEvent(id, partial as any, user.id),
                        '价格设置已保存',
                        '保存价格设置失败'
                      );
                      await fetchEvent();
                      setIsDirty(false);
                    }}
                  />
                ),
              },
              {
                key: 'registration',
                label: '注册设置',
                children: (
                  <EventRegistrationForm
                    initialValues={event}
                    loading={loading}
                    onSubmit={async (partial) => {
                      if (!id || !user) return;
                      if (event && event.organizerId && user.id !== event.organizerId) {
                        message.warning('您没有权限编辑此活动（仅组织者可编辑）');
                        return;
                      }
                      await handleAsyncOperation(
                        () => updateEvent(id, partial as any, user.id),
                        '报名设置已保存',
                        '保存失败'
                      );
                      await fetchEvent();
                      setIsDirty(false);
                    }}
                  />
                ),
              },
              {
                key: 'agenda',
                label: '程序安排',
                children: (
                  <EventAgendaForm
                    initialValues={event}
                    loading={loading}
                    onSubmit={async (partial) => {
                      if (!id || !user) return;
                      if (event && event.organizerId && user.id !== event.organizerId) {
                        message.warning('您没有权限编辑此活动（仅组织者可编辑）');
                        return;
                      }
                      await handleAsyncOperation(
                        () => updateEvent(id, partial as any, user.id),
                        '程序安排已保存',
                        '保存失败'
                      );
                      await fetchEvent();
                      setIsDirty(false);
                    }}
                  />
                ),
              },
              {
                key: 'committee',
                label: '委员会成员',
                children: (
                  <EventCommitteeForm
                    initialValues={event}
                    loading={loading}
                    onSubmit={async (partial) => {
                      if (!id || !user) return;
                      if (event && event.organizerId && user.id !== event.organizerId) {
                        message.warning('您没有权限编辑此活动（仅组织者可编辑）');
                        return;
                      }
                      await handleAsyncOperation(
                        () => updateEvent(id, partial as any, user.id),
                        '委员会成员已保存',
                        '保存失败'
                      );
                      await fetchEvent();
                      setIsDirty(false);
                    }}
                  />
                ),
              },
              {
                key: 'speakers',
                label: '讲师信息',
                children: (
                  <EventSpeakersForm
                    initialValues={event}
                    loading={loading}
                    onSubmit={async (partial) => {
                      if (!id || !user) return;
                      if (event && event.organizerId && user.id !== event.organizerId) {
                        message.warning('您没有权限编辑此活动（仅组织者可编辑）');
                        return;
                      }
                      await handleAsyncOperation(
                        () => updateEvent(id, partial as any, user.id),
                        '讲师信息已保存',
                        '保存失败'
                      );
                      await fetchEvent();
                      setIsDirty(false);
                    }}
                  />
                ),
              },
            ]}
          />
        </Col>
        <Col xs={24} lg={8}>
          <div style={{ position: 'sticky', top: 24 }}>
            <EventPreview event={event} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default EventEditPage;

