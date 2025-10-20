/**
 * Quick Add Event Transaction Page
 * 快速添加活动交易测试页面
 * 
 * 用于测试活动财务功能，快速创建带 relatedEventId 的交易
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  DatePicker,
  message,
  Space,
  Alert,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuthStore } from '@/stores/authStore';
import { getEvents } from '@/modules/event/services/eventService';
import { getAllBankAccounts } from '@/modules/finance/services/bankAccountService';
import { createTransaction } from '@/modules/finance/services/transactionService';
import type { Event } from '@/modules/event/types';
import type { BankAccount } from '@/modules/finance/types';

const { Option } = Select;

const QuickAddEventTransactionPage: React.FC = () => {
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsResult, accountsResult] = await Promise.all([
        getEvents({ page: 1, limit: 100 }),
        getAllBankAccounts(),
      ]);
      
      setEvents(eventsResult.data);
      setBankAccounts(accountsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
      message.error('加载数据失败');
    }
  };

  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    try {
      setLoading(true);

      const transactionData = {
        bankAccountId: values.bankAccountId,
        transactionDate: values.transactionDate.format('YYYY-MM-DD'),
        transactionType: values.transactionType,
        mainDescription: values.mainDescription,
        amount: values.amount,
        payerPayee: values.payerPayee,
        status: 'completed' as const,
        // 🆕 关键：设置 relatedEventId
        relatedEventId: values.eventId,
        relatedEventName: events.find(e => e.id === values.eventId)?.name,
      };

      console.log('📝 Creating transaction with relatedEventId:', transactionData);

      await createTransaction(transactionData, user.id);

      message.success('交易创建成功！已关联到活动');
      form.resetFields();
      form.setFieldsValue({
        transactionDate: dayjs(),
        transactionType: 'income',
        status: 'completed',
      });
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      message.error('创建失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        title="快速添加活动交易（测试）"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '测试工具' },
        ]}
      />

      <Card style={{ maxWidth: 800 }}>
        <Alert
          message="测试工具说明"
          description={
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>此页面用于快速创建带 relatedEventId 的交易</li>
              <li>创建后可在"活动账户管理 → 预测"标签页查看</li>
              <li>用于测试银行交易记录显示功能</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            transactionDate: dayjs(),
            transactionType: 'income',
            status: 'completed',
          }}
        >
          <Form.Item
            name="eventId"
            label="关联活动"
            rules={[{ required: true, message: '请选择活动' }]}
          >
            <Select
              placeholder="选择活动"
              showSearch
              optionFilterProp="children"
            >
              {events.map(event => (
                <Option key={event.id} value={event.id}>
                  {event.name} ({event.startDate})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="bankAccountId"
            label="银行账户"
            rules={[{ required: true, message: '请选择银行账户' }]}
          >
            <Select placeholder="选择银行账户">
              {bankAccounts.map(account => (
                <Option key={account.id} value={account.id}>
                  {account.accountName} - {account.accountNumber}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="transactionType"
            label="交易类型"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="income">收入</Option>
              <Option value="expense">支出</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="transactionDate"
            label="交易日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="mainDescription"
            label="交易描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input placeholder="例如：正式会员报名费" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="金额 (RM)"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="payerPayee" label="付款人/收款人">
            <Input placeholder="张三" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={loading}
              >
                创建交易
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default QuickAddEventTransactionPage;

