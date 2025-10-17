/**
 * Batch Split Modal
 * 批量拆分弹窗
 * 
 * 为多条交易应用相同的拆分规则（按百分比）
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Button,
  Divider,
  message,
  Select,
  Input,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface CategoryAmount {
  category: string;
  amount: number;
  notes?: string;
}

interface BatchSplitModalProps {
  visible: boolean;
  selectedCount: number;
  onOk: (splitRule: {
    categoryAmounts: CategoryAmount[];
  }) => Promise<void>;
  onCancel: () => void;
}

const BatchSplitModal: React.FC<BatchSplitModalProps> = ({
  visible,
  selectedCount,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<CategoryAmount[]>([
    {
      category: '',
      amount: 0,
      notes: undefined,
    },
  ]);

  const totalAmount = rules.reduce((sum, rule) => sum + (rule.amount || 0), 0);
  const isValid = totalAmount > 0 && rules.every(r => r.category && r.amount > 0);

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        category: '',
        amount: 0,
        notes: undefined,
      },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    if (rules.length <= 1) {
      message.warning('至少需要保留一个拆分规则');
      return;
    }
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };

  const handleRuleChange = (index: number, field: keyof CategoryAmount, value: any) => {
    const newRules = [...rules];
    newRules[index] = {
      ...newRules[index],
      [field]: value,
    };
    setRules(newRules);
  };

  const handleOk = async () => {
    try {
      // 验证
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (!rule.category || !rule.category.trim()) {
          message.error(`拆分规则 ${i + 1}: 请选择类别`);
          return;
        }
        if (!rule.amount || rule.amount <= 0) {
          message.error(`拆分规则 ${i + 1}: 请输入有效金额`);
          return;
        }
      }

      if (totalAmount <= 0) {
        message.error('请至少输入一个有效的拆分规则');
        return;
      }

      setLoading(true);
      await onOk({ categoryAmounts: rules });
      message.success(`批量拆分成功，共处理 ${selectedCount} 条交易`);
      setRules([{ category: '', amount: 0, notes: undefined }]);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '批量拆分失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRules([{ category: '', amount: 0, notes: undefined }]);
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={`批量拆分 - 已选择 ${selectedCount} 条交易`}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={700}
      confirmLoading={loading}
      okText="确认批量拆分"
      cancelText="取消"
      okButtonProps={{ disabled: !isValid }}
    >
      {/* 统计信息 */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f0f5ff',
          border: '1px solid #adc6ff',
          borderRadius: 6,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>拆分总金额:</span>
          <span style={{ fontWeight: 600, color: '#1890ff' }}>
            RM {totalAmount.toFixed(2)}
          </span>
        </div>
        <div style={{ 
          marginTop: 8, 
          paddingTop: 8, 
          borderTop: '1px dashed #adc6ff',
          fontSize: 12,
          color: '#1890ff'
        }}>
          💡 将从每条交易中扣除此金额，剩余部分自动创建"未分配金额"子交易
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }}>拆分规则（按固定金额）</Divider>

      <Form form={form} layout="vertical">
        {rules.map((rule, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              background: '#fafafa',
              borderRadius: 6,
              marginBottom: 12,
              border: '1px solid #e8e8e8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>规则 {index + 1}</span>
              {rules.length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveRule(index)}
                >
                  删除
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>
                  金额 <span style={{ color: 'red' }}>*</span>
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  value={rule.amount}
                  onChange={(value) => handleRuleChange(index, 'amount', value || 0)}
                  prefix="RM"
                  precision={2}
                  min={0.01}
                  placeholder="0.00"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>
                  类别 <span style={{ color: 'red' }}>*</span>
                </div>
                <Select
                  style={{ width: '100%' }}
                  value={rule.category}
                  onChange={(value) => handleRuleChange(index, 'category', value)}
                  placeholder="选择类别"
                >
                  <Option value="member-fees">会员费</Option>
                  <Option value="event-finance">活动财务</Option>
                  <Option value="general-accounts">日常账户</Option>
                </Select>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>备注</div>
              <TextArea
                value={rule.notes}
                onChange={(e) => handleRuleChange(index, 'notes', e.target.value)}
                placeholder="可选的说明"
                rows={1}
              />
            </div>
          </div>
        ))}

        <Button
          type="dashed"
          onClick={handleAddRule}
          block
          icon={<PlusOutlined />}
        >
          添加拆分规则
        </Button>
      </Form>

      <Alert
        message="说明"
        description={`每条交易将按照上述固定金额规则拆分。例如：设置 RM 300 会员费，每条交易都会拆分出 RM 300 的会员费子交易，剩余金额自动创建"未分配金额"子交易。`}
        type="info"
        showIcon
        style={{ marginTop: 16, fontSize: 12 }}
      />
    </Modal>
  );
};

export { BatchSplitModal };
export default BatchSplitModal;

