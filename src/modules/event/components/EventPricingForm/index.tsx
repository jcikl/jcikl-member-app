import React, { useState, useEffect } from 'react';
import { Form, InputNumber, DatePicker, Switch, Button, Space, Card, Row, Col, Select, Spin, message } from 'antd';
import dayjs from 'dayjs';
import type { Event } from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';
import { getAllFinanceEvents } from '@/modules/finance/services/financeEventService';
import type { FinanceEvent } from '@/modules/finance/types';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventPricingForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const [financeEvents, setFinanceEvents] = useState<FinanceEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const formConfig = globalComponentService.getFormConfig();

  useEffect(() => {
    console.log('📋 [EventPricingForm] Component mounted, loading finance events...');
    loadFinanceEvents();
  }, []);

  const loadFinanceEvents = async () => {
    try {
      setLoadingEvents(true);
      console.log('🔄 [EventPricingForm] Fetching all finance events...');
      const events = await getAllFinanceEvents();
      console.log('✅ [EventPricingForm] Fetched finance events:', {
        total: events.length,
        events: events.map(e => ({ id: e.id, name: e.eventName, status: e.status }))
      });
      
      // 只显示活跃和计划中的活动
      const activeEvents = events.filter(e => 
        e.status === 'active' || e.status === 'planned'
      );
      console.log('🎯 [EventPricingForm] Filtered active/planned events:', {
        total: activeEvents.length,
        events: activeEvents.map(e => ({ id: e.id, name: e.eventName, status: e.status }))
      });
      
      setFinanceEvents(activeEvents);
    } catch (error) {
      console.error('❌ [EventPricingForm] Failed to load finance events:', error);
      message.error('加载财务账户列表失败');
    } finally {
      setLoadingEvents(false);
    }
  };

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

  console.log('📝 [EventPricingForm] Initialized form values:', {
    eventId: initialValues.id,
    eventName: initialValues.name,
    isFree: init.isFree,
    financialAccount: init.financialAccount,
    financialAccountName: initialValues.financialAccountName,
    pricing: {
      regularPrice: init.regularPrice,
      memberPrice: init.memberPrice,
      alumniPrice: init.alumniPrice,
      earlyBirdPrice: init.earlyBirdPrice,
      committeePrice: init.committeePrice,
      earlyBirdDeadline: init.earlyBirdDeadline?.format('YYYY-MM-DD HH:mm:ss'),
    }
  });

  const handleFinish = async (values: any) => {
    console.log('💾 [EventPricingForm] Form submitted with values:', values);
    
    // 查找选中的财务账户以获取其名称
    const selectedEvent = financeEvents.find(e => e.id === values.financialAccount);
    console.log('🔍 [EventPricingForm] Looking up selected finance event:', {
      selectedId: values.financialAccount,
      foundEvent: selectedEvent ? {
        id: selectedEvent.id,
        name: selectedEvent.eventName,
        status: selectedEvent.status,
        eventDate: selectedEvent.eventDate
      } : null,
      availableEvents: financeEvents.length
    });
    
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
      financialAccount: values.financialAccount, // 存储 FinanceEvent ID
      financialAccountName: selectedEvent?.eventName, // 存储名称用于显示
    } as any;

    console.log('📤 [EventPricingForm] Submitting payload:', {
      eventId: initialValues.id,
      eventName: initialValues.name,
      isFree: payload.isFree,
      financialAccount: payload.financialAccount,
      financialAccountName: payload.financialAccountName,
      pricing: payload.pricing
    });

    await onSubmit(payload);
    console.log('✅ [EventPricingForm] Pricing settings saved successfully');
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
        <Form.Item 
          label="项目财务户口" 
          name="financialAccount"
          extra="选择此活动关联的财务账户，用于收支追踪和财务报表生成"
        >
          <Select 
            placeholder="选择项目财务户口"
            loading={loadingEvents}
            notFoundContent={loadingEvents ? <Spin size="small" /> : '暂无可用的财务账户'}
            showSearch
            optionFilterProp="children"
            onChange={(value) => {
              const selected = financeEvents.find(e => e.id === value);
              console.log('🔗 [EventPricingForm] Financial account selected:', {
                id: value,
                event: selected ? {
                  id: selected.id,
                  name: selected.eventName,
                  status: selected.status,
                  eventDate: selected.eventDate
                } : null
              });
            }}
            filterOption={(input, option) => {
              const label = option?.children as unknown;
              if (typeof label === 'string') {
                return label.toLowerCase().includes(input.toLowerCase());
              }
              return false;
            }}
          >
            {financeEvents.map(event => (
              <Select.Option key={event.id} value={event.id}>
                {event.eventName} {event.eventDate ? `(${event.eventDate})` : ''} - {
                  event.status === 'active' ? '进行中' : 
                  event.status === 'planned' ? '计划中' : 
                  event.status === 'completed' ? '已完成' : '已取消'
                }
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        {financeEvents.length === 0 && !loadingEvents && (
          <div style={{ 
            padding: '8px 12px', 
            background: '#fffbe6', 
            border: '1px solid #ffe58f', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#8c8c8c'
          }}>
            💡 提示：请先在「财务管理 → 活动财务」页面创建财务账户
          </div>
        )}
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


