/**
 * Event Create Page
 * 活动创建页面
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { PageHeader } from '@/components';
import EventForm from '../../components/EventForm';
import { createEvent } from '../../services/eventService';
import type { EventFormData } from '../../types';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import { useAuthStore } from '@/stores/authStore';

/**
 * Event Create Page Component
 */
const EventCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: EventFormData) => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    setLoading(true);
    try {
      const eventId = await handleAsyncOperation(
        () => createEvent(values, user.id),
        '创建活动成功',
        '创建活动失败'
      );

      navigate(`/events/${eventId}`);
    } catch (error) {
      console.error('创建活动失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/events');
  };

  return (
    <div className="event-create-page">
      <PageHeader
        title="创建活动"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '活动管理', path: '/events' },
          { title: '创建活动' },
        ]}
        onBack={() => navigate('/events')}
      />

      <div className="mt-6">
        <EventForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitText="创建活动"
          loading={loading}
        />
      </div>
    </div>
  );
};

export default EventCreatePage;

