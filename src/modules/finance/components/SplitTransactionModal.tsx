/**
 * Split Transaction Modal
 * 拆分交易弹窗
 * 
 * 允许用户将一笔交易拆分为多笔子交易
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Divider,
  message,
  Select,
  Alert,
  Spin,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { BaseModal } from '@/components/common/BaseModal';
import type { Transaction } from '../types';

const { Option } = Select;
const { TextArea } = Input;

interface SplitItem {
  amount: number;
  category?: string;
  notes?: string;
}

interface SplitTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onOk: (splits: SplitItem[]) => Promise<void>;
  onCancel: () => void;
  onUnsplit?: (transactionId: string) => Promise<void>; // 🆕 撤销拆分回调
}

const SplitTransactionModal: React.FC<SplitTransactionModalProps> = ({
  visible,
  transaction,
  onOk,
  onCancel,
  onUnsplit,
}) => {
  console.log('🎯 [SplitTransactionModal] 组件初始化, visible:', visible, 'transaction:', transaction?.id);
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingExistingSplits, setLoadingExistingSplits] = useState(false);
  const [splits, setSplits] = useState<SplitItem[]>([
    {
      amount: 0,
      category: undefined,
      notes: undefined,
    },
  ]);

  // 🆕 加载现有拆分数据
  useEffect(() => {
    const loadExistingSplits = async () => {
      if (visible && transaction && transaction.isSplit) {
        setLoadingExistingSplits(true);
        try {
          // 查询现有子交易
          const q = query(
            collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS),
            where('parentTransactionId', '==', transaction.id)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.size > 0) {
            // 将子交易转换为拆分项(排除未分配金额的子交易)
            const existingSplits: SplitItem[] = [];
            snapshot.docs.forEach(doc => {
              const childData = doc.data() as Transaction;
              // 排除未分配金额的虚拟交易
              if (!childData.notes?.includes('未分配金额')) {
                existingSplits.push({
                  amount: childData.amount,
                  category: childData.category,
                  notes: childData.notes || childData.mainDescription,
                });
              }
            });
            
            if (existingSplits.length > 0) {
              setSplits(existingSplits);
              message.info(`已加载现有的 ${existingSplits.length} 笔拆分记录`);
            } else {
              // 如果没有有效拆分，使用默认
              setSplits([{ amount: 0, category: undefined, notes: undefined }]);
            }
          } else {
            setSplits([{ amount: 0, category: undefined, notes: undefined }]);
          }
        } catch (error) {
          console.error('加载现有拆分失败:', error);
          message.error('加载现有拆分数据失败');
          setSplits([{ amount: 0, category: undefined, notes: undefined }]);
        } finally {
          setLoadingExistingSplits(false);
        }
      } else if (visible && transaction) {
        // 新拆分，重置表单
        setSplits([{ amount: 0, category: undefined, notes: undefined }]);
        form.resetFields();
      }
    };
    
    loadExistingSplits();
  }, [visible, transaction, form]);

  const parentAmount = transaction?.amount || 0;
  const totalSplitAmount = splits.reduce((sum, split) => sum + (split.amount || 0), 0);
  const unallocatedAmount = parentAmount - totalSplitAmount;
  const isValid = totalSplitAmount <= parentAmount && totalSplitAmount > 0;

  const handleAddSplit = () => {
    setSplits([
      ...splits,
      {
        amount: 0,
        category: undefined,
        notes: undefined,
      },
    ]);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length <= 1) {
      message.warning('至少需要保留一个拆分项');
      return;
    }
    const newSplits = splits.filter((_, i) => i !== index);
    setSplits(newSplits);
  };

  const handleSplitChange = (index: number, field: keyof SplitItem, value: any) => {
    const newSplits = [...splits];
    newSplits[index] = {
      ...newSplits[index],
      [field]: value,
    };
    setSplits(newSplits);
  };

  const handleOk = async () => {
    try {
      // 验证所有必填字段
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        if (!split.amount || split.amount <= 0) {
          message.error(`拆分项 ${i + 1}: 请输入有效金额`);
          return;
        }
        if (!split.category || !split.category.trim()) {
          message.error(`拆分项 ${i + 1}: 请选择类别`);
          return;
        }
      }

      if (totalSplitAmount > parentAmount) {
        message.error('拆分金额总和不能超过原交易金额');
        return;
      }

      if (totalSplitAmount <= 0) {
        message.error('请至少输入一个有效的拆分金额');
        return;
      }

      setLoading(true);
      await onOk(splits);
      // 成功消息由BaseModal的onSuccess回调处理
    } catch (error: any) {
      // 错误消息由BaseModal的onError回调处理
      throw error; // 重新抛出错误，让BaseModal处理
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSplits([{ amount: 0, category: undefined, notes: undefined }]);
    form.resetFields();
    onCancel();
  };

  // 🆕 快速拆分预设
  const quickSplitTemplate: SplitItem[] = [
    { amount: 350, category: 'member-fees', notes: '会员费' },
    { amount: 75, category: 'general-accounts', notes: '日常财务 (TXGA-0004)' },
    { amount: 75, category: 'general-accounts', notes: '日常财务 (TXGA-0003)' },
  ];

  // 🆕 应用快速拆分
  const handleQuickSplit = () => {
    console.log('🔍 [SplitTransactionModal.handleQuickSplit] =====快速拆分按钮被点击=====');
    console.log('🔍 [SplitTransactionModal] quickSplitTemplate:', JSON.stringify(quickSplitTemplate, null, 2));
    console.log('🔍 [SplitTransactionModal] current parentAmount:', parentAmount);
    console.log('🔍 [SplitTransactionModal] current splits:', splits.length, 'items');
    
    const total = quickSplitTemplate.reduce((sum, item) => sum + item.amount, 0);
    console.log('🔍 [SplitTransactionModal] 总金额:', total);
    
    if (total > parentAmount) {
      console.warn('⚠️ 快速拆分金额总和超过原交易金额');
      message.warning(`快速拆分金额总和 (RM ${total.toFixed(2)}) 超过原交易金额 (RM ${parentAmount.toFixed(2)})`);
      return;
    }

    console.log('✅ [SplitTransactionModal] 应用快速拆分规则, 设置 splits:', JSON.stringify(quickSplitTemplate, null, 2));
    setSplits(quickSplitTemplate);
    message.success('已应用快速拆分规则');
    console.log('✅ [SplitTransactionModal] 快速拆分规则已应用');
  };

  // 🆕 调试：组件渲染状态
  useEffect(() => {
    console.log('🔄 [SplitTransactionModal] 组件渲染, loadingExistingSplits:', loadingExistingSplits);
    console.log('🔄 [SplitTransactionModal] splits 数量:', splits.length);
    console.log('🔄 [SplitTransactionModal] parentAmount:', parentAmount);
  }, [loadingExistingSplits, splits.length, parentAmount]);

  // 🆕 处理撤销拆分
  const handleUnsplit = async () => {
    if (!transaction || !onUnsplit) return;
    
    Modal.confirm({
      title: '确认撤销拆分',
      content: '撤销后将删除所有子交易，恢复为单笔交易。此操作无法撤销，确定继续吗？',
      okText: '确认撤销',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          await onUnsplit(transaction.id);
          message.success('已撤销拆分');
          handleCancel(); // 关闭弹窗
        } catch (error: any) {
          message.error(error.message || '撤销失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <BaseModal
      visible={visible}
      title={`${transaction?.isSplit ? '重新拆分交易' : '拆分交易'} - RM ${parentAmount.toFixed(2)}`}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      confirmLoading={loading}
      okText={transaction?.isSplit ? "确认重新拆分" : "确认拆分"}
      cancelText="取消"
      okButtonProps={{ disabled: !isValid || loadingExistingSplits }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左侧：撤销拆分按钮(仅在已拆分时显示) */}
          <div>
            {transaction?.isSplit && onUnsplit && (
              <Button 
                danger 
                onClick={handleUnsplit}
                disabled={loading || loadingExistingSplits}
                style={{ marginRight: 'auto' }}
              >
                撤销拆分
              </Button>
            )}
          </div>
          {/* 右侧：标准操作按钮 */}
          <Space>
            <Button onClick={handleCancel} disabled={loading}>
              取消
            </Button>
            <Button 
              type="primary" 
              onClick={handleOk}
              loading={loading}
              disabled={!isValid || loadingExistingSplits}
            >
              {transaction?.isSplit ? "确认重新拆分" : "确认拆分"}
            </Button>
          </Space>
        </div>
      }
      onSuccess={() => {
        message.success('交易拆分成功');
        setSplits([{ amount: 0, category: undefined, notes: undefined }]);
        form.resetFields();
      }}
      onError={(error) => {
        message.error(error.message || '拆分失败');
      }}
    >
      {!transaction && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Alert message="交易信息缺失" type="warning" />
        </div>
      )}
      
      {transaction && (
        <>
      {/* 🆕 加载状态 */}
      {loadingExistingSplits && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="加载现有拆分数据..." />
        </div>
      )}
      
      {!loadingExistingSplits && (
          <>
            {/* 🆕 已拆分提示 */}
            {transaction?.isSplit && (
              <Alert
                message="此交易已拆分过"
                description="已自动加载现有拆分数据。修改后将删除现有的所有子交易，并创建新的拆分记录。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
        
        {/* 原交易信息 & 拆分统计(左右布局) */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {/* 左侧：原交易信息 */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
            原交易信息
          </div>
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}><strong>日期：</strong>{transaction.transactionDate}</div>
            <div style={{ marginBottom: 6 }}><strong>描述：</strong>{transaction.mainDescription}</div>
            <div style={{ marginBottom: 6 }}><strong>类型：</strong>{transaction.transactionType === 'income' ? '收入' : '支出'}</div>
            <div><strong>金额：</strong><span style={{ color: '#1890ff', fontWeight: 600 }}>RM {parentAmount.toFixed(2)}</span></div>
          </div>
        </div>

        {/* 右侧：拆分统计 */}
        <div style={{ flex: 1 }}>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
            拆分统计
          </div>
          <div
            style={{
              padding: '12px',
              background: unallocatedAmount > 0 ? '#fff7e6' : '#f6ffed',
              border: `1px solid ${unallocatedAmount > 0 ? '#ffd591' : '#b7eb8f'}`,
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>原交易金额:</span>
              <span style={{ fontWeight: 600 }}>RM {parentAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>已分配金额:</span>
              <span style={{ fontWeight: 600, color: '#1890ff' }}>
                RM {totalSplitAmount.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>未分配金额:</span>
              <span
                style={{
                  fontWeight: 600,
                  color: unallocatedAmount > 0 ? '#fa8c16' : '#52c41a',
                }}
              >
                RM {unallocatedAmount.toFixed(2)}
                {unallocatedAmount > 0 && ' ⚠️'}
              </span>
            </div>

            {unallocatedAmount > 0 && (
              <div style={{ 
                marginTop: 8, 
                paddingTop: 8, 
                borderTop: '1px dashed #ffd591',
                fontSize: 12,
                color: '#fa8c16'
              }}>
                💡 将自动创建未分配金额子交易
              </div>
            )}

            {totalSplitAmount > parentAmount && (
              <Alert
                message="拆分金额总和超过原交易金额，请调整"
                type="error"
                showIcon
                style={{ marginTop: 8, fontSize: 12, padding: '4px 8px' }}
              />
            )}
          </div>
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }}>拆分明细</Divider>

      <Form form={form} layout="vertical">
        {splits.map((split, index) => (
          <div
            key={index}
            style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: 8,
              marginBottom: 12,
              border: '1px solid #e8e8e8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>拆分项 {index + 1}</span>
              {splits.length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveSplit(index)}
                >
                  删除
                </Button>
              )}
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>
                    金额 <span style={{ color: 'red' }}>*</span>
                  </div>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={split.amount}
                    onChange={(value) => handleSplitChange(index, 'amount', value || 0)}
                    prefix="RM"
                    precision={2}
                    min={0.01}
                    max={parentAmount}
                    placeholder="请输入金额"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>
                    类别 <span style={{ color: 'red' }}>*</span>
                  </div>
                  <Select
                    style={{ width: '100%' }}
                    value={split.category}
                    onChange={(value) => handleSplitChange(index, 'category', value)}
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
                  value={split.notes}
                  onChange={(e) => handleSplitChange(index, 'notes', e.target.value)}
                  placeholder="可选的额外说明"
                  rows={2}
                />
              </div>
            </Space>
          </div>
        ))}

        {/* 🆕 快速拆分按钮 */}
        <div style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            onClick={() => {
              console.log('🖱️ [SplitTransactionModal] 按钮被点击！！！');
              handleQuickSplit();
            }}
            block
            style={{
              background: '#1890ff',
              borderColor: '#1890ff',
            }}
          >
            ⚡ 快速拆分 (RM 350 会员费 + RM 150 日常财务)
          </Button>
        </div>

        <Button
          type="dashed"
          onClick={handleAddSplit}
          block
          icon={<PlusOutlined />}
        >
          添加拆分项
        </Button>
      </Form>
        </>
      )}
        </>
      )}
    </BaseModal>
  );
};

export { SplitTransactionModal };
export default SplitTransactionModal;

