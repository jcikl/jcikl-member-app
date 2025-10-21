/**
 * Batch Set Category Modal
 * 批量设置类别弹窗
 * 
 * 为多条交易批量设置类别
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Select,
  message,
  Alert,
  Input,
  Radio,
  Divider,
} from 'antd';
import { getMembers } from '@/modules/member/services/memberService';
import { getEvents } from '@/modules/event/services/eventService';
import type { Member } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';

const { Option } = Select;

interface BatchSetCategoryModalProps {
  visible: boolean;
  selectedCount: number;
  onOk: (data: {
    category: string;
    txAccount?: string;
    year?: string;
    memberId?: string;
    payerPayee?: string;
    eventId?: string;
  }) => Promise<void>;
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
  // Suppress unused variable warning
  void onManageSubcategory;
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTxAccount, setSelectedTxAccount] = useState<string>('');
  
  // 动态字段状态
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [payerPayeeMode, setPayerPayeeMode] = useState<'member' | 'manual'>('member');
  const [manualPayerPayee, setManualPayerPayee] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // 数据列表
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // 加载会员和活动列表
  useEffect(() => {
    if (visible) {
      loadMembersAndEvents();
    }
  }, [visible]);
  
  const loadMembersAndEvents = async () => {
    setLoadingData(true);
    try {
      const [membersResult, eventsResult] = await Promise.all([
        getMembers({ page: 1, limit: 1000, status: 'active' }),
        getEvents({ page: 1, limit: 1000, status: 'Published' }),
      ]);
      setMembers(membersResult.data);
      setEvents(eventsResult.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleOk = async () => {
    try {
      if (!selectedCategory || !selectedCategory.trim()) {
        message.error('请选择类别');
        return;
      }

      // 验证必填字段
      if (selectedCategory === 'member-fees' && !selectedYear) {
        message.error('会员费需要选择年份');
        return;
      }

      setLoading(true);
      
      // 构建提交数据
      const data: {
        category: string;
        txAccount?: string;
        year?: string;
        memberId?: string;
        payerPayee?: string;
        eventId?: string;
      } = {
        category: selectedCategory,
        txAccount: selectedTxAccount || undefined,
      };
      
      // 根据类别添加对应字段
      if (selectedCategory === 'member-fees') {
        data.year = selectedYear;
        data.memberId = selectedMemberId || undefined;
      } else if (selectedCategory === 'event-finance') {
        data.year = selectedYear || undefined;
        data.eventId = selectedEventId || undefined;
        data.payerPayee = payerPayeeMode === 'manual' ? manualPayerPayee : undefined;
        data.memberId = payerPayeeMode === 'member' ? selectedMemberId : undefined;
      } else if (selectedCategory === 'general-accounts') {
        data.payerPayee = payerPayeeMode === 'manual' ? manualPayerPayee : undefined;
        data.memberId = payerPayeeMode === 'member' ? selectedMemberId : undefined;
      }
      
      await onOk(data);
      message.success(`已为 ${selectedCount} 条交易设置类别`);
      resetForm();
    } catch (error: any) {
      message.error(error.message || '批量设置类别失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedTxAccount('');
    setSelectedYear('');
    setSelectedMemberId('');
    setPayerPayeeMode('member');
    setManualPayerPayee('');
    setSelectedEventId('');
  };

  const handleCancel = () => {
    resetForm();
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

      {/* 会员费动态字段 */}
      {selectedCategory === 'member-fees' && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          
          {/* 年份选择 - 必填 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
              年份 <span style={{ color: 'red' }}>*</span>
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder="选择年份"
            >
              <Option value="2025">2025</Option>
              <Option value="2024">2024</Option>
              <Option value="2023">2023</Option>
            </Select>
          </div>
          
          {/* 关联会员 - 可选 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>关联会员（可选）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              placeholder="选择会员"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
              loading={loadingData}
            >
              {members.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.name} - {m.email}
                </Option>
              ))}
            </Select>
          </div>
          
          {/* 二次分类 - 可选 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>二次分类（可选）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedTxAccount}
              onChange={setSelectedTxAccount}
              placeholder="选择会员费类型"
              allowClear
            >
              <Option value="new-member-fee">新会员费</Option>
              <Option value="renewal-fee">续会费</Option>
              <Option value="alumni-fee">校友会</Option>
              <Option value="visiting-member-fee">拜访会员</Option>
            </Select>
          </div>
        </>
      )}

      {/* 活动财务动态字段 */}
      {selectedCategory === 'event-finance' && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          
          {/* 收款人信息 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>收款人信息</div>
            <Radio.Group value={payerPayeeMode} onChange={(e) => setPayerPayeeMode(e.target.value)}>
              <Radio value="member">选择会员</Radio>
              <Radio value="manual">手动填写（非会员）</Radio>
            </Radio.Group>
          </div>
          
          {payerPayeeMode === 'member' ? (
            <div style={{ marginBottom: 16 }}>
              <Select
                style={{ width: '100%' }}
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="选择会员"
                allowClear
              showSearch
              optionFilterProp="children"
              loading={loadingData}
              >
                {members.map(m => (
                  <Option key={m.id} value={m.id}>
                    {m.name} - {m.email}
                  </Option>
                ))}
              </Select>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <Input
                value={manualPayerPayee}
                onChange={(e) => setManualPayerPayee(e.target.value)}
                placeholder="输入收款人姓名"
              />
            </div>
          )}
          
          {/* 年份筛选 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>年份（可选）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder="选择年份"
              allowClear
            >
              <Option value="2025">2025</Option>
              <Option value="2024">2024</Option>
              <Option value="2023">2023</Option>
            </Select>
          </div>
          
          {/* 选择活动 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>选择活动（可选）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedEventId}
              onChange={setSelectedEventId}
              placeholder="选择活动"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
              loading={loadingData}
            >
              {events.map(e => (
                <Option key={e.id} value={e.id}>
                  {e.name}
                </Option>
              ))}
            </Select>
          </div>
        </>
      )}

      {/* 日常财务动态字段 */}
      {selectedCategory === 'general-accounts' && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          
          {/* 付款人信息 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>付款人信息</div>
            <Radio.Group value={payerPayeeMode} onChange={(e) => setPayerPayeeMode(e.target.value)}>
              <Radio value="member">选择会员</Radio>
              <Radio value="manual">手动填写（非会员）</Radio>
            </Radio.Group>
          </div>
          
          {payerPayeeMode === 'member' ? (
            <div style={{ marginBottom: 16 }}>
              <Select
                style={{ width: '100%' }}
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="选择会员"
                allowClear
              showSearch
              optionFilterProp="children"
              loading={loadingData}
              >
                {members.map(m => (
                  <Option key={m.id} value={m.id}>
                    {m.name} - {m.email}
                  </Option>
                ))}
              </Select>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <Input
                value={manualPayerPayee}
                onChange={(e) => setManualPayerPayee(e.target.value)}
                placeholder="输入付款人姓名"
              />
            </div>
          )}
          
          {/* 二次分类 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>二次分类（可选）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedTxAccount}
              onChange={setSelectedTxAccount}
              placeholder="选择二次分类"
              allowClear
            >
              <Option value="office-supplies">办公用品</Option>
              <Option value="utilities">水电网</Option>
              <Option value="transport">交通</Option>
              <Option value="donations">捐赠</Option>
              <Option value="sponsorships">赞助</Option>
              <Option value="misc">其他</Option>
            </Select>
          </div>
        </>
      )}
    </Modal>
  );
};

export { BatchSetCategoryModal };
export default BatchSetCategoryModal;

