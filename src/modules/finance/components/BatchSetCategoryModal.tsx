/**
 * Batch Set Category Modal
 * 批量设置类别弹窗
 * 
 * 为多条交易批量设置类别
 */

import React, { useState } from 'react';
import {
  Modal,
  Select,
  message,
  Alert,
  Button,
} from 'antd';

const { Option } = Select;

interface BatchSetCategoryModalProps {
  visible: boolean;
  selectedCount: number;
  onOk: (category: string, txAccount?: string) => Promise<void>;
  onCancel: () => void;
  onManageSubcategory?: (category: string) => void;
}

const BatchSetCategoryModal: React.FC<BatchSetCategoryModalProps> = ({
  visible,
  selectedCount,
  onOk,
  onCancel,
  onManageSubcategory,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTxAccount, setSelectedTxAccount] = useState<string>('');

  const handleOk = async () => {
    try {
      if (!selectedCategory || !selectedCategory.trim()) {
        message.error('请选择类别');
        return;
      }

      setLoading(true);
      await onOk(selectedCategory, selectedTxAccount || undefined);
      message.success(`已为 ${selectedCount} 条交易设置类别`);
      setSelectedCategory('');
      setSelectedTxAccount('');
    } catch (error: any) {
      message.error(error.message || '批量设置类别失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedCategory('');
    setSelectedTxAccount('');
    onCancel();
  };

  return (
    <Modal
      title={`批量设置类别 - 已选择 ${selectedCount} 条交易`}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={500}
      confirmLoading={loading}
      okText="确认设置"
      cancelText="取消"
      okButtonProps={{ disabled: !selectedCategory }}
    >
      <Alert
        message="注意"
        description="此操作将覆盖所有选中交易的类别。虚拟交易（子交易）将被自动跳过。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
        选择类别 <span style={{ color: 'red' }}>*</span>
      </div>
      <Select
        style={{ width: '100%' }}
        size="large"
        value={selectedCategory}
        onChange={setSelectedCategory}
        placeholder="请选择要设置的类别"
      >
        <Option value="member-fees">会员费</Option>
        <Option value="event-finance">活动财务</Option>
        <Option value="general-accounts">日常账户</Option>
      </Select>

      <div style={{ 
        marginTop: 16, 
        padding: '8px 12px', 
        background: '#f5f5f5', 
        borderRadius: 4,
        fontSize: 13,
        color: '#666'
      }}>
        将为 <strong style={{ color: '#1890ff' }}>{selectedCount}</strong> 条交易设置类别为：
        <strong style={{ color: '#1890ff' }}>
          {selectedCategory === 'member-fees' && ' 会员费'}
          {selectedCategory === 'event-finance' && ' 活动财务'}
          {selectedCategory === 'general-accounts' && ' 日常账户'}
          {!selectedCategory && ' 未选择'}
        </strong>
      </div>

      {/* 二次分类，根据主类别显示对应选项 */}
      {selectedCategory && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>选择二次分类（可选）</div>
            {onManageSubcategory && (
              <Button type="link" size="small" onClick={() => onManageSubcategory(selectedCategory)}>
                管理该分类的二次分类设置
              </Button>
            )}
          </div>
          {selectedCategory === 'member-fees' && (
            <Select
              style={{ width: '100%' }}
              size="large"
              value={selectedTxAccount}
              onChange={setSelectedTxAccount}
              placeholder="请选择会员费交易账户"
              allowClear
            >
              <Option value="2025-new-member-fee">2025 新会员费</Option>
              <Option value="2025-renewal-fee">2025 续会费</Option>
              <Option value="2025-alumni-fee">2025 校友会</Option>
              <Option value="2025-visiting-member-fee">2025 拜访会员</Option>
            </Select>
          )}
          {selectedCategory === 'event-finance' && (
            <Select
              style={{ width: '100%' }}
              size="large"
              value={selectedTxAccount}
              onChange={setSelectedTxAccount}
              placeholder="请选择活动财务交易账户"
              allowClear
            >
              <Option value="ticket-income">门票收入</Option>
              <Option value="sponsorship">赞助</Option>
              <Option value="venue-expense">场地支出</Option>
              <Option value="food-beverage">餐饮支出</Option>
            </Select>
          )}
          {selectedCategory === 'general-accounts' && (
            <Select
              style={{ width: '100%' }}
              size="large"
              value={selectedTxAccount}
              onChange={setSelectedTxAccount}
              placeholder="请选择日常账户交易账户"
              allowClear
            >
              <Option value="office-supplies">办公用品</Option>
              <Option value="utilities">水电网</Option>
              <Option value="transport">交通</Option>
              <Option value="misc">其他</Option>
            </Select>
          )}
        </div>
      )}
    </Modal>
  );
};

export { BatchSetCategoryModal };
export default BatchSetCategoryModal;

