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
  Row,
  Col,
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
import { getTransactionPurposes } from '@/modules/system/services/transactionPurposeService';
import { getEvents } from '@/modules/event/services/eventService';
import { getMembers } from '@/modules/member/services/memberService';
import { generateYearOptions } from '@/utils/dateHelpers';

const { Option } = Select;
const { TextArea } = Input;

interface SplitItem {
  amount: number;
  category?: string;
  notes?: string;
  txAccount?: string; // 二次分类(仅当日常账户时可选)
  year?: string; // 年份前缀(用于快速组合txAccount)
  responsibleId?: string; // 负责人(用于快速组合txAccount)
  memberFeeType?: string; // 会员费类型(new-member-fee/renewal-fee)
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
  
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingExistingSplits, setLoadingExistingSplits] = useState(false);
  const [txPurposeOptions, setTxPurposeOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [eventOptions, setEventOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [directorOptions, setDirectorOptions] = useState<Array<{ label: string; value: string }>>([]);
  const yearOptions = generateYearOptions().map(y => ({ label: y, value: y }));
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
                const splitItem: SplitItem = {
                  amount: childData.amount,
                  category: childData.category,
                  notes: childData.notes || childData.mainDescription,
                  txAccount: childData.txAccount,
                };
                // 如果是会员费且已有 txAccount，尝试解析出年份与类型用于还原UI
                if (childData.category === 'member-fees' && childData.txAccount) {
                  const m = String(childData.txAccount).match(/^(\d{4})-(.+)$/);
                  if (m) {
                    splitItem.year = m[1];
                    splitItem.memberFeeType = m[2];
                  }
                }
                existingSplits.push(splitItem);
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

  // 🆕 加载可用txAccount(交易用途)选项
  useEffect(() => {
    const loadPurposes = async () => {
      try {
        const list = await getTransactionPurposes('active');
        setTxPurposeOptions(list.map(p => ({ label: `${p.label} (${p.value})`, value: p.value })));
      } catch {
        setTxPurposeOptions([]);
      }
    };
    const loadEvents = async () => {
      try {
        const result = await getEvents({ page: 1, limit: 1000 });
        setEventsList(result.data);
        setEventOptions(result.data.map((e: any) => ({ label: e.name, value: e.name })));
      } catch {
        setEventOptions([]);
      }
    };
    const loadDirectors = async () => {
      try {
        // 从活动列表中获取负责理事( boardMember ) 名称集合
        const result = await getEvents({ page: 1, limit: 1000 });
        const names = new Set<string>();
        result.data.forEach((e: any) => {
          const bm = (e && (e.boardMember || e.responsibleOfficer?.name || e.responsibleName)) as string | undefined;
          if (bm && String(bm).trim()) names.add(String(bm).trim());
        });
        setDirectorOptions(Array.from(names).sort().map(n => ({ label: n, value: n })));
      } catch {
        setDirectorOptions([]);
      }
    };
    if (visible) {
      loadPurposes();
      loadEvents();
      loadDirectors();
    }
  }, [visible]);

  // 根据活动列表生成年份集合
  const eventYears = React.useMemo(() => {
    const years = new Set<string>();
    eventsList.forEach((e: any) => {
      const ds = e.startDate || e.eventDate || e.date || e.createdAt;
      if (!ds) return;
      const y = new Date(ds).getFullYear();
      if (!Number.isNaN(y)) years.add(String(y));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [eventsList]);

  // 辅助：按年份与负责理事(boardMember)过滤活动选项
  const buildEventOptionsFiltered = (year?: string, boardMember?: string) => {
    const list = eventsList.filter((e: any) => {
      if (year) {
        const ds = e.startDate || e.eventDate || e.date || e.createdAt;
        if (!ds) return false;
        const y = new Date(ds).getFullYear();
        if (String(y) !== String(year)) return false;
      }
      if (boardMember) {
        const bm = (e && (e.boardMember || e.responsibleOfficer?.name || e.responsibleName)) as string | undefined;
        if (!bm || String(bm).trim() !== String(boardMember).trim()) return false;
      }
      return true;
    });
    return list.map((e: any) => ({ label: e.name, value: e.name }));
  };

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
    const currentYear = String(new Date().getFullYear());
    // 当选择类别为活动财务时，默认年份为当前年份(用于筛选)
    if (field === 'category' && value === 'event-finance') {
      if (!newSplits[index].year) newSplits[index].year = currentYear;
    }
    // 当选择类别为会员费时，默认年份与类型
    if (field === 'category' && value === 'member-fees') {
      if (!newSplits[index].year) newSplits[index].year = currentYear;
      if (!newSplits[index].memberFeeType) newSplits[index].memberFeeType = 'new-member-fee';
    }
    // 对 event-finance 与 general-accounts 组合 txAccount
    const s = newSplits[index];
    if (s.category === 'event-finance') {
      // 年份/负责理事仅用于筛选：如改变后当前活动不在筛选内则清空
      if ((field === 'year' || field === 'responsibleId') && s.txAccount) {
        const yr = field === 'year' ? String(value) : s.year;
        const bm = field === 'responsibleId' ? String(value) : s.responsibleId;
        const match = buildEventOptionsFiltered(yr, bm).some(opt => opt.value === s.txAccount);
        if (!match) newSplits[index].txAccount = undefined;
      }
      const base = s.txAccount || '';
      let combined = base;
      // 不再将负责人/年份写入txAccount，纯筛选
      newSplits[index].txAccount = combined || base;
    }
    if (s.category === 'member-fees') {
      const y = s.year || currentYear;
      const t = s.memberFeeType || 'new-member-fee';
      newSplits[index].txAccount = `${y}-${t}`;
    }
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
        // 当类别为日常账户时，建议选择txAccount
        if (split.category === 'general-accounts' && !split.txAccount) {
          message.warning(`拆分项 ${i + 1}: 建议选择日常账户用途(txAccount)`);
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

  // 🆕 快速拆分预设(动态按用途名称填充 notes)
  const buildQuickSplitTemplate = (): SplitItem[] => {
    const purposeCode = 'TXGA-0004';
    const purposeLabel = (txPurposeOptions.find(p => p.value === purposeCode)?.label) || purposeCode;
    const y = String(new Date().getFullYear());
    const memberFeeType = 'new-member-fee'; // 默认：新会员
    return [
      { amount: 350, category: 'member-fees', notes: '会员费', year: y, memberFeeType, txAccount: `${y}-${memberFeeType}` },
      { amount: 75, category: 'general-accounts', txAccount: purposeCode, notes: purposeLabel },
      { amount: 75, category: 'general-accounts', txAccount: purposeCode, notes: purposeLabel },
    ];
  };

  // 🆕 应用快速拆分
  const handleQuickSplit = () => {
    const splitsTemplate = buildQuickSplitTemplate();
    const total = splitsTemplate.reduce((sum, item) => sum + item.amount, 0);
    
    if (total > parentAmount) {
      console.warn('⚠️ 快速拆分金额总和超过原交易金额');
      message.warning(`快速拆分金额总和 (RM ${total.toFixed(2)}) 超过原交易金额 (RM ${parentAmount.toFixed(2)})`);
      return;
    }

    setSplits(splitsTemplate);
    message.success('已应用快速拆分规则');
  };

  // 🆕 调试：组件渲染状态
  useEffect(() => {
    // render diagnostics removed in production
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
          <div style={{ marginBottom: 8 }}>加载现有拆分数据...</div>
          <Spin />
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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* 左侧：原交易信息 */}
        <Col xs={24} md={12}>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
            原交易信息
          </div>
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}><strong>日期：</strong>{transaction.transactionDate}</div>
            <div style={{ marginBottom: 6 }}><strong>描述：</strong>{transaction.mainDescription}</div>
            <div style={{ marginBottom: 6 }}><strong>类型：</strong>{transaction.transactionType === 'income' ? '收入' : '支出'}</div>
            <div><strong>金额：</strong><span style={{ color: '#1890ff', fontWeight: 600 }}>RM {parentAmount.toFixed(2)}</span></div>
          </div>
        </Col>

        {/* 右侧：拆分统计 */}
        <Col xs={24} md={12}>
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
        </Col>
      </Row>

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
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col flex="80px">
                      <span style={{ fontSize: 13, color: '#666' }}>
                        金额 <span style={{ color: 'red' }}>*</span>
                      </span>
                    </Col>
                    <Col flex="auto">
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
                    </Col>
                  </Row>
                </Col>
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col flex="80px">
                      <span style={{ fontSize: 13, color: '#666' }}>
                        类别 <span style={{ color: 'red' }}>*</span>
                      </span>
                    </Col>
                    <Col flex="auto">
                      <Button.Group style={{ width: '100%', display: 'flex' }}>
                        <Button
                          style={{ flex: 1 }}
                          type={split.category === 'member-fees' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'category', 'member-fees')}
                        >
                          会员费
                        </Button>
                        <Button
                          style={{ flex: 1 }}
                          type={split.category === 'event-finance' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'category', 'event-finance')}
                        >
                          活动财务
                        </Button>
                        <Button
                          style={{ flex: 1 }}
                          type={split.category === 'general-accounts' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'category', 'general-accounts')}
                        >
                          日常账户
                        </Button>
                      </Button.Group>
                    </Col>
                  </Row>
                </Col>
              </Row>

            {/* 年份与负责人(用于快速组合txAccount，活动财务专用) */}
            {split.category === 'event-finance' && (
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>年份</span></Col>
                    <Col flex="auto">
                      <Select
                        style={{ width: '100%' }}
                        value={split.year || String(new Date().getFullYear())}
                        options={(eventYears.length > 0 ? eventYears : yearOptions.map(o => o.value)).map(y => ({ label: String(y), value: String(y) }))}
                        onChange={(v) => handleSplitChange(index, 'year', v)}
                        placeholder="选择年份"
                        allowClear
                      />
                    </Col>
                  </Row>
                </Col>
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>负责理事</span></Col>
                    <Col flex="auto">
                      <Select
                        style={{ width: '100%' }}
                        value={split.responsibleId}
                        options={directorOptions}
                        onChange={(v) => handleSplitChange(index, 'responsibleId', v)}
                        placeholder="按负责理事筛选活动"
                        showSearch
                        optionFilterProp="label"
                        allowClear
                      />
                    </Col>
                  </Row>
                </Col>
              </Row>
            )}

            {/* 二次分类(txAccount)：当选择日常账户或活动财务时可见 */}
            {split.category === 'general-accounts' && (
              <div>
                <Row gutter={[8, 8]} align="middle">
                  <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>用途/账户</span></Col>
                  <Col flex="auto">
                    <Select
                      style={{ width: '100%' }}
                      value={split.txAccount}
                      onChange={(value) => handleSplitChange(index, 'txAccount', value)}
                      options={txPurposeOptions}
                      placeholder="选择日常账户用途 (例如 TXGA-0004)"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                    />
                  </Col>
                </Row>
              </div>
            )}

            {/* 会员费：年份 + 会费类型 */}
            {split.category === 'member-fees' && (
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>年份</span></Col>
                    <Col flex="auto">
                      <Input
                        style={{ width: '100%' }}
                        value={split.year || String(new Date().getFullYear())}
                        onChange={(e) => handleSplitChange(index, 'year', e.target.value)}
                        placeholder="输入年份，如 2025"
                        maxLength={4}
                      />
                    </Col>
                  </Row>
                </Col>
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>会费类型</span></Col>
                    <Col flex="auto">
                      <Button.Group style={{ width: '100%', display: 'flex' }}>
                        <Button
                          style={{ flex: 1 }}
                          type={(split.memberFeeType || 'new-member-fee') === 'new-member-fee' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'memberFeeType', 'new-member-fee')}
                        >
                          新会员
                        </Button>
                        <Button
                          style={{ flex: 1 }}
                          type={split.memberFeeType === 'renewal-fee' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'memberFeeType', 'renewal-fee')}
                        >
                          续费
                        </Button>
                        <Button
                          style={{ flex: 1 }}
                          type={split.memberFeeType === 'visiting-member-fee' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'memberFeeType', 'visiting-member-fee')}
                        >
                          拜访
                        </Button>
                        <Button
                          style={{ flex: 1 }}
                          type={split.memberFeeType === 'alumni-fee' ? 'primary' : 'default'}
                          onClick={() => handleSplitChange(index, 'memberFeeType', 'alumni-fee')}
                        >
                          校友
                        </Button>
                      </Button.Group>
                    </Col>
                  </Row>
                </Col>
              </Row>
            )}

            {split.category === 'event-finance' && (
              <div>
                <Row gutter={[8, 8]} align="middle">
                  <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>关联活动</span></Col>
                  <Col flex="auto">
                    <Select
                      style={{ width: '100%' }}
                      value={split.txAccount}
                      onChange={(value) => handleSplitChange(index, 'txAccount', value)}
                      options={buildEventOptionsFiltered(split.year || String(new Date().getFullYear()), split.responsibleId)}
                      placeholder="选择活动名称"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                    />
                  </Col>
                </Row>
              </div>
            )}

              <div>
                <Row gutter={[8, 8]} align="middle">
                  <Col flex="80px"><span style={{ fontSize: 13, color: '#666' }}>备注</span></Col>
                  <Col flex="auto">
                    <TextArea
                      value={split.notes}
                      onChange={(e) => handleSplitChange(index, 'notes', e.target.value)}
                      placeholder="可选的额外说明"
                      rows={2}
                    />
                  </Col>
                </Row>
              </div>
            </Space>
          </div>
        ))}

        {/* 🆕 快速拆分按钮 */}
        <div style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            onClick={() => {
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

