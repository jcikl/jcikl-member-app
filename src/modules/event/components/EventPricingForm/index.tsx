import React from 'react';
import { Form, InputNumber, DatePicker, Switch, Button, Space, Card, Row, Col, Select } from 'antd';
import dayjs from 'dayjs';
import type { Event } from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventPricingForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const [form] = Form.useForm();

  const formConfig = globalComponentService.getFormConfig();

  const init = {
    isFree: initialValues.isFree,
    regularPrice: initialValues.pricing?.regularPrice,
    memberPrice: initialValues.pricing?.memberPrice,
    alumniPrice: initialValues.pricing?.alumniPrice,
    earlyBirdPrice: initialValues.pricing?.earlyBirdPrice,
    committeePrice: initialValues.pricing?.committeePrice,
    earlyBirdDeadline: initialValues.pricing?.earlyBirdDeadline
      ? dayjs(initialValues.pricing.earlyBirdDeadline)
      : undefined,
    financialAccount: initialValues.financialAccount,
  };

  const handleFinish = async (values: any) => {
    const payload: Partial<Event> = {
      isFree: values.isFree || false,
      pricing: {
        ...initialValues.pricing,
        regularPrice: values.regularPrice ?? 0,
        memberPrice: values.memberPrice ?? 0,
        alumniPrice: values.alumniPrice ?? 0,
        earlyBirdPrice: values.earlyBirdPrice ?? 0,
        committeePrice: values.committeePrice ?? 0,
        earlyBirdDeadline: values.earlyBirdDeadline?.toISOString(),
        currency: initialValues.pricing?.currency || 'RM',
      },
      financialAccount: values.financialAccount,
    } as any;

    await onSubmit(payload);
  };

  return (
    <Form form={form} {...formConfig} initialValues={init} onFinish={handleFinish}>
      <Card title="价格信息" className="mb-4">
        <Form.Item label="免费活动" name="isFree" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="访客价格 (RM)" name="regularPrice">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="会员价格 (RM)" name="memberPrice">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="校友价格 (RM)" name="alumniPrice">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="早鸟价格 (RM)" name="earlyBirdPrice">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="委员会价格 (RM)" name="committeePrice">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="早鸟截止日期" name="earlyBirdDeadline">
              <DatePicker showTime style={{ width: '100%' }} placeholder="选择早鸟截止日期" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="财务户口匹配" className="mb-4">
        <Form.Item label="项目财务户口" name="financialAccount">
          <Select placeholder="选择项目财务户口">
            <Select.Option value="general">一般活动户口</Select.Option>
            <Select.Option value="training">培训活动户口</Select.Option>
            <Select.Option value="conference">会议活动户口</Select.Option>
            <Select.Option value="social">社交活动户口</Select.Option>
            <Select.Option value="community">社区服务户口</Select.Option>
            <Select.Option value="other">其他户口</Select.Option>
          </Select>
        </Form.Item>
      </Card>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存价格设置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EventPricingForm;


