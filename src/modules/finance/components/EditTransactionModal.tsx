/**
 * Edit Transaction Modal
 * 编辑交易弹窗
 * 
 * 支持动态二次分类和会员/非会员选择
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Radio,
  Divider,
  message,
} from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { getMembers } from '@/modules/member/services/memberService';
import { getEvents } from '@/modules/event/services/eventService';
import { getActiveTransactionPurposes } from '@/modules/system/services/transactionPurposeService';
import type { Member } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';
import type { Transaction, BankAccount } from '@/modules/finance/types';

const { Option } = Select;
const { TextArea } = Input;

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null; // null表示创建新交易
  bankAccounts: BankAccount[];
  form: FormInstance;
  onOk: () => Promise<void>;
  onCancel: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  bankAccounts,
  form,
  onOk,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // 付款人/收款人模式
  const [payerPayeeMode, setPayerPayeeMode] = useState<'member' | 'manual'>('manual');
  const [manualPayerPayee, setManualPayerPayee] = useState<string>('');
  
  // 数据列表
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [purposes, setPurposes] = useState<{ label: string; value: string }[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // 监听类别变化
  useEffect(() => {
    const category = form.getFieldValue('category');
    setSelectedCategory(category || '');
  }, [form]);

  // 加载数据
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  // 初始化表单
  useEffect(() => {
    if (visible && transaction) {
      // 编辑模式：填充表单
      form.setFieldsValue({
        bankAccountId: transaction.bankAccountId,
        transactionDate: transaction.transactionDate ? dayjs(transaction.transactionDate) : null,
        transactionType: transaction.transactionType,
        mainDescription: transaction.mainDescription,
        subDescription: transaction.subDescription,
        amount: transaction.amount,
        category: transaction.category,
        txAccount: transaction.txAccount,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
      });
      
      setSelectedCategory(transaction.category || '');
      
      // 判断付款人/收款人是否为会员
      if (transaction.payerPayee) {
        setManualPayerPayee(transaction.payerPayee);
        // 如果有payerId说明是会员
        if (transaction.payerId) {
          setPayerPayeeMode('member');
          form.setFieldsValue({ payerId: transaction.payerId });
        } else {
          setPayerPayeeMode('manual');
        }
      }
    } else if (visible && !transaction) {
      // 创建模式：重置表单
      form.resetFields();
      setSelectedCategory('');
      setPayerPayeeMode('manual');
      setManualPayerPayee('');
    }
  }, [visible, transaction, form]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [membersResult, eventsResult, purposesResult] = await Promise.all([
        getMembers({ page: 1, limit: 1000, status: 'active' }),
        getEvents({ page: 1, limit: 1000, status: 'Published' }),
        getActiveTransactionPurposes(),
      ]);
      
      setMembers(membersResult.data);
      setEvents(eventsResult.data);
      setPurposes(purposesResult); // Already in correct format
    } catch (error) {
      console.error('❌ [EditTransactionModal] 加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoadingData(false);
    }
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      await form.validateFields();
      
      // 根据模式设置付款人/收款人
      if (payerPayeeMode === 'member') {
        const payerId = form.getFieldValue('payerId');
        const member = members.find(m => m.id === payerId);
        if (member) {
          form.setFieldsValue({ payerPayee: member.name });
        }
      } else {
        form.setFieldsValue({ payerPayee: manualPayerPayee || undefined });
      }
      
      await onOk();
    } catch (error) {
      console.error('❌ [EditTransactionModal] 表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedCategory('');
    setPayerPayeeMode('manual');
    setManualPayerPayee('');
    onCancel();
  };

  // 监听类别变化，重置二次分类
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    form.setFieldsValue({ txAccount: undefined });
  };

  return (
    <Modal
      title={transaction ? '编辑交易' : '创建新交易'}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={700}
      confirmLoading={loading}
      okText={transaction ? '保存' : '创建'}
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        {/* 银行账户 */}
        <Form.Item
          label="银行账户"
          name="bankAccountId"
          rules={[{ required: true, message: '请选择银行账户' }]}
        >
          <Select placeholder="选择银行账户" loading={loadingData}>
            {bankAccounts.map(acc => (
              <Option key={acc.id} value={acc.id}>
                {acc.accountName} ({acc.bankName})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 交易日期 */}
        <Form.Item
          label="交易日期"
          name="transactionDate"
          rules={[{ required: true, message: '请选择交易日期' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        {/* 交易类型 */}
        <Form.Item
          label="交易类型"
          name="transactionType"
          rules={[{ required: true, message: '请选择交易类型' }]}
        >
          <Radio.Group>
            <Radio value="income">收入</Radio>
            <Radio value="expense">支出</Radio>
          </Radio.Group>
        </Form.Item>

        {/* 主要描述 */}
        <Form.Item
          label="主要描述"
          name="mainDescription"
          rules={[{ required: true, message: '请输入交易描述' }]}
        >
          <Input placeholder="例如: 会员费 - 张三" />
        </Form.Item>

        {/* 次要描述 */}
        <Form.Item label="次要描述" name="subDescription">
          <Input placeholder="可选的额外说明" />
        </Form.Item>

        {/* 金额 */}
        <Form.Item
          label="金额"
          name="amount"
          rules={[
            { required: true, message: '请输入金额' },
            { type: 'number', min: 0.01, message: '金额必须大于0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            prefix="RM"
            precision={2}
            min={0.01}
            placeholder="0.00"
          />
        </Form.Item>

        <Divider>付款人/收款人信息</Divider>

        {/* 付款人/收款人模式选择 */}
        <Form.Item label="选择类型">
          <Radio.Group
            value={payerPayeeMode}
            onChange={(e) => {
              setPayerPayeeMode(e.target.value);
              form.setFieldsValue({ payerId: undefined });
              setManualPayerPayee('');
            }}
          >
            <Radio value="member">会员</Radio>
            <Radio value="manual">非会员（手动输入）</Radio>
          </Radio.Group>
        </Form.Item>

        {/* 会员选择 */}
        {payerPayeeMode === 'member' && (
          <Form.Item
            label="选择会员"
            name="payerId"
            rules={[{ required: true, message: '请选择会员' }]}
          >
            <Select
              placeholder="选择会员"
              showSearch
              loading={loadingData}
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {members.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.name} - {m.email}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 手动输入 */}
        {payerPayeeMode === 'manual' && (
          <Form.Item label="付款人/收款人">
            <Input
              value={manualPayerPayee}
              onChange={(e) => setManualPayerPayee(e.target.value)}
              placeholder="例如: 供应商名称、机构名称等"
            />
          </Form.Item>
        )}

        <Divider>分类信息</Divider>

        {/* 主要类别 */}
        <Form.Item
          label="主要类别"
          name="category"
          rules={[{ required: true, message: '请选择主要类别' }]}
          tooltip="选择主要类别后，可设置对应的二次分类"
        >
          <Select
            placeholder="选择主要类别"
            onChange={handleCategoryChange}
          >
            <Option value="member-fees">会员费</Option>
            <Option value="event-finance">活动财务</Option>
            <Option value="general-accounts">日常账户</Option>
          </Select>
        </Form.Item>

        {/* 二次分类 - 会员费 */}
        {selectedCategory === 'member-fees' && (
          <Form.Item
            label="关联会员"
            name="txAccount"
            tooltip="选择该笔会员费对应的会员"
          >
            <Select
              placeholder="选择会员"
              showSearch
              allowClear
              loading={loadingData}
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {members.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.name} - {m.email}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 二次分类 - 活动财务 */}
        {selectedCategory === 'event-finance' && (
          <Form.Item
            label="关联活动"
            name="txAccount"
            tooltip="选择该笔交易对应的活动"
          >
            <Select
              placeholder="选择活动"
              showSearch
              allowClear
              loading={loadingData}
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {events.map(e => (
                <Option key={e.id} value={e.id}>
                  {e.name}
                  {e.startDate && ` (${new Date(e.startDate).getFullYear()})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 二次分类 - 日常账户 */}
        {selectedCategory === 'general-accounts' && (
          <Form.Item
            label="账户用途"
            name="txAccount"
            tooltip="选择该笔交易的具体用途"
          >
            <Select
              placeholder="选择账户用途"
              showSearch
              allowClear
              loading={loadingData}
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {purposes.map(p => (
                <Option key={p.value} value={p.value}>
                  {p.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 付款方式 */}
        <Form.Item label="付款方式" name="paymentMethod">
          <Select placeholder="选择付款方式" allowClear>
            <Option value="cash">现金</Option>
            <Option value="bank_transfer">银行转账</Option>
            <Option value="credit_card">信用卡</Option>
            <Option value="cheque">支票</Option>
            <Option value="online_payment">在线支付</Option>
            <Option value="other">其他</Option>
          </Select>
        </Form.Item>

        {/* 备注 */}
        <Form.Item label="备注" name="notes">
          <TextArea rows={3} placeholder="可选的额外备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTransactionModal;

