import React from 'react';
import { Form, DatePicker, Input, Switch, Row, Col, Button, Space, Card } from 'antd';
import dayjs from 'dayjs';
import type { Event } from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventScheduleForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const formConfig = globalComponentService.getFormConfig();

  const init = {
    startDate: dayjs(initialValues.startDate),
    endDate: dayjs(initialValues.endDate),
    registrationStartDate: initialValues.registrationStartDate ? dayjs(initialValues.registrationStartDate) : undefined,
    registrationDeadline: initialValues.registrationDeadline ? dayjs(initialValues.registrationDeadline) : undefined,
    isOnline: initialValues.isOnline,
    onlineLink: initialValues.onlineLink || undefined,
    location: initialValues.location || undefined,
    address: initialValues.address || undefined,
    venue: initialValues.venue || undefined,
  };

  const handleFinish = async (values: any) => {
    const payload: Partial<Event> = {
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      registrationStartDate: values.registrationStartDate?.toISOString(),
      registrationDeadline: values.registrationDeadline?.toISOString(),
      isOnline: values.isOnline || false,
      onlineLink: values.onlineLink,
      location: values.location,
      address: values.address,
      venue: values.venue,
    } as any;
    await onSubmit(payload);
  };

  return (
    <Form form={form} {...formConfig} initialValues={init} onFinish={handleFinish}>
      <Card title="日期时间" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item label="开始日期" name="startDate" rules={[{ required: true, message: '请选择开始日期' }]}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择开始日期" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="结束日期" name="endDate" rules={[{ required: true, message: '请选择结束日期' }]}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择结束日期" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="报名开始" name="registrationStartDate">
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择报名开始日期" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="报名截止" name="registrationDeadline">
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择报名截止日期" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="地点信息" className="mb-4">
        <Form.Item label="线上活动" name="isOnline" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(p, c) => p.isOnline !== c.isOnline}>
          {({ getFieldValue }) =>
            getFieldValue('isOnline') ? (
              <Form.Item label="线上链接" name="onlineLink" rules={[{ type: 'url', message: '请输入有效的URL' }]}>
                <Input placeholder="请输入会议链接" />
              </Form.Item>
            ) : (
              <>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="地点" name="location">
                      <Input placeholder="请输入活动地点" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="场馆" name="venue">
                      <Input placeholder="请输入场馆名称" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="详细地址" name="address">
                  <Input placeholder="请输入详细地址" />
                </Form.Item>
              </>
            )
          }
        </Form.Item>
      </Card>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存时间与地点
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EventScheduleForm;


