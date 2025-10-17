import React from 'react';
import { Form, InputNumber, Switch, Button, Space, Card, Row, Col, Select } from 'antd';
import type { Event } from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';
import { REGISTRATION_TARGET_AUDIENCE_OPTIONS } from '../../types';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventRegistrationForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const formConfig = globalComponentService.getFormConfig();

  const init = {
    maxParticipants: initialValues.maxParticipants ?? undefined,
    waitlistEnabled: initialValues.waitlistEnabled,
    isPrivate: initialValues.isPrivate || false,
    registrationTargetAudience: initialValues.registrationTargetAudience || [],
  };

  const handleFinish = async (values: any) => {
    const payload: Partial<Event> = {
      maxParticipants: values.maxParticipants ?? null,
      waitlistEnabled: values.waitlistEnabled || false,
      isPrivate: values.isPrivate || false,
      registrationTargetAudience: values.registrationTargetAudience || [],
    } as any;
    await onSubmit(payload);
  };

  return (
    <Form form={form} {...formConfig} initialValues={init} onFinish={handleFinish}>
      <Card title="报名与限制" className="mb-4" style={{ maxWidth: 600 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="最大参与人数" name="maxParticipants">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="不限制人数可留空" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="启用候补名单" name="waitlistEnabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="私人活动" name="isPrivate" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="注册开放对象" name="registrationTargetAudience">
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择注册开放对象"
                options={REGISTRATION_TARGET_AUDIENCE_OPTIONS}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存报名设置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EventRegistrationForm;


