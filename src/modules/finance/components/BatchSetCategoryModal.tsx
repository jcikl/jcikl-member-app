/**
 * Batch Set Category Modal
 * 批量设置类别弹窗
 * 
 * 为多条交易批量设置类别，支持独立设置每条交易的相关信息
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  message,
  Alert,
  Input,
  Radio,
  Divider,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BaseModal } from '@/components/common/BaseModal';
import { getMembers } from '@/modules/member/services/memberService';
import { getEvents } from '@/modules/event/services/eventService';
import { generateYearOptions } from '@/utils/dateHelpers';
import { getActiveTransactionPurposes } from '@/modules/system/services/transactionPurposeService';
import type { Member } from '@/modules/member/types';
import type { Event } from '@/modules/event/types';
import type { Transaction } from '@/modules/finance/types';

const { Option } = Select;

// 🆕 每条交易的独立设置数据
interface TransactionIndividualData {
  transactionId: string;
  // 日常财务
  payerPayee?: string;
  payerMode?: 'member' | 'manual';
  payerId?: string;
  // 活动财务
  payeeMode?: 'member' | 'manual';
  payeeId?: string;
  payeeName?: string;
  eventId?: string;
  // 会员费
  memberId?: string;
}

interface BatchSetCategoryModalProps {
  visible: boolean;
  selectedTransactions: Transaction[]; // 🆕 选中的交易列表
  onOk: (data: {
    category: string;
    txAccount?: string;
    year?: string;
    individualData?: TransactionIndividualData[]; // 🆕 每条交易的独立数据
  }) => Promise<void>;
  onCancel: () => void;
  onManageSubcategory?: (category: string) => void;
}

const BatchSetCategoryModal: React.FC<BatchSetCategoryModalProps> = ({
  visible,
  selectedTransactions,
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
  const [selectedEventId, setSelectedEventId] = useState<string>(''); // 🆕 统一的活动选择
  
  // 🆕 每条交易的独立数据
  const [individualData, setIndividualData] = useState<Record<string, TransactionIndividualData>>({});
  
  // 数据列表
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [purposes, setPurposes] = useState<{ label: string; value: string }[]>([]); // 🆕 交易用途
  const [loadingData, setLoadingData] = useState(false);
  
  const selectedCount = selectedTransactions.length;
  
  // 🆕 调试信息
  console.log('🔍 [BatchSetCategoryModal] Debug info:', {
    visible,
    selectedTransactions,
    selectedCount,
    selectedTransactionsLength: selectedTransactions.length,
  });
  
  // 加载会员和活动列表
  useEffect(() => {
    if (visible) {
      loadMembersAndEvents();
      loadPurposes(); // 🆕 加载交易用途
    }
  }, [visible]);
  
  const loadMembersAndEvents = async () => {
    setLoadingData(true);
    try {
      const [membersResult, eventsResult] = await Promise.all([
        getMembers({ page: 1, limit: 1000, status: 'active' }),
        getEvents({ page: 1, limit: 1000 }), // 🆕 移除status限制，加载所有状态的活动
      ]);
      setMembers(membersResult.data);
      setEvents(eventsResult.data);
      
      // 🆕 调试信息
      console.log('📋 [BatchSetCategoryModal] 加载数据:', {
        会员数量: membersResult.data.length,
        活动数量: eventsResult.data.length,
        活动列表: eventsResult.data.map(e => ({
          id: e.id,
          name: e.name,
          date: e.startDate,
          year: e.startDate ? new Date(e.startDate).getFullYear() : '无日期'
        }))
      });
    } catch (error) {
      console.error('❌ [BatchSetCategoryModal] 加载数据失败:', error);
    } finally {
      setLoadingData(false);
    }
  };
  
  // 🆕 加载交易用途
  const loadPurposes = async () => {
    try {
      const purposeList = await getActiveTransactionPurposes();
      setPurposes(purposeList);
    } catch (error) {
      console.error('加载交易用途失败:', error);
    }
  };

  // 🆕 更新单条交易的数据
  const updateIndividualData = (transactionId: string, field: string, value: any) => {
    setIndividualData(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        transactionId,
        [field]: value,
      },
    }));
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
      
      if (selectedCategory === 'event-finance' && !selectedEventId) {
        message.error('活动财务需要选择关联活动');
        return;
      }

      setLoading(true);
      
      // 构建提交数据
      // 🔍 确保所有选中的交易都有对应的数据
      const allIndividualData = selectedTransactions.map(transaction => {
        const existingData = individualData[transaction.id] || {};
        return {
          ...existingData,
          transactionId: transaction.id, // 确保transactionId是最后设置，覆盖existingData中可能存在的值
        };
      });

      const data: {
        category: string;
        txAccount?: string;
        year?: string;
        eventId?: string; // 🆕 统一的活动ID
        individualData?: TransactionIndividualData[];
      } = {
        category: selectedCategory,
        txAccount: selectedTxAccount || undefined,
        individualData: allIndividualData,
      };
      
      // 根据类别添加对应字段
      if (selectedCategory === 'member-fees') {
        data.year = selectedYear;
      } else if (selectedCategory === 'event-finance') {
        data.eventId = selectedEventId; // 🆕 统一设置活动ID
      }
      
      // 🔍 Debug: 检查提交的数据
      console.log('🔍 [BatchSetCategoryModal] 提交数据:', {
        category: data.category,
        txAccount: data.txAccount,
        year: data.year,
        eventId: data.eventId,
        individualDataCount: data.individualData?.length || 0,
        individualData: data.individualData,
        selectedTransactions: selectedTransactions.map(t => ({ id: t.id, mainDescription: t.mainDescription })),
      });
      
      await onOk(data);
      // 成功消息由BaseModal的onSuccess回调处理
    } catch (error: any) {
      // 错误消息由BaseModal的onError回调处理
      throw error; // 重新抛出错误，让BaseModal处理
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedTxAccount('');
    setSelectedYear('');
    setSelectedEventId(''); // 🆕 重置统一活动选择
    setIndividualData({});
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };


  // 🆕 定义表格列（日常财务）
  const generalAccountsColumns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 100,
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '描述',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Transaction) => {
        // 处理可能的字段名变体
        const recordAny = record as any;
        const main = record.mainDescription || recordAny.description || recordAny.mainDesc || recordAny.desc || '';
        const sub = record.subDescription || recordAny.subDesc || '';
        
        return (
          <div>
            <div>{main}</div>
            {sub && <div style={{ fontSize: '12px', color: '#999' }}>{sub}</div>}
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number, record: Transaction) => (
        <span style={{ color: record.transactionType === 'income' ? '#52c41a' : '#ff4d4f' }}>
          RM {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '付款人信息',
      key: 'payerPayee',
      width: 300,
      render: (_: any, record: Transaction) => {
        const data = individualData[record.id];
        const payerMode = data?.payerMode || 'member';
        
        return (
          <div>
            <Radio.Group 
              value={payerMode} 
              onChange={(e) => updateIndividualData(record.id, 'payerMode', e.target.value)}
              size="small"
              style={{ marginBottom: 8 }}
            >
              <Radio value="member">会员</Radio>
              <Radio value="manual">手动填写</Radio>
            </Radio.Group>
            
            {payerMode === 'member' ? (
              <Select
                style={{ width: '100%' }}
                size="small"
                value={data?.payerId}
                onChange={(value) => updateIndividualData(record.id, 'payerId', value)}
                placeholder="选择付款人"
                allowClear
                showSearch
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
            ) : (
              <Input
                size="small"
                value={data?.payerPayee}
                onChange={(e) => updateIndividualData(record.id, 'payerPayee', e.target.value)}
                placeholder="输入付款人姓名"
              />
            )}
          </div>
        );
      },
    },
  ];

  // 🆕 定义表格列（活动财务）
  const eventFinanceColumns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 100,
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '描述',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Transaction) => {
        // 处理可能的字段名变体
        const recordAny = record as any;
        const main = record.mainDescription || recordAny.description || recordAny.mainDesc || recordAny.desc || '';
        const sub = record.subDescription || recordAny.subDesc || '';
        
        return (
          <div>
            <div>{main}</div>
            {sub && <div style={{ fontSize: '12px', color: '#999' }}>{sub}</div>}
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number, record: Transaction) => (
        <span style={{ color: record.transactionType === 'income' ? '#52c41a' : '#ff4d4f' }}>
          RM {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '收款人信息',
      key: 'payeeInfo',
      width: 200,
      render: (_: any, record: Transaction) => {
        const data = individualData[record.id];
        const payeeMode = data?.payeeMode || 'member';
        
        return (
          <div>
            <Radio.Group 
              value={payeeMode} 
              onChange={(e) => updateIndividualData(record.id, 'payeeMode', e.target.value)}
              size="small"
              style={{ marginBottom: 8 }}
            >
              <Radio value="member">会员</Radio>
              <Radio value="manual">手动填写</Radio>
            </Radio.Group>
            
            {payeeMode === 'member' ? (
              <Select
                style={{ width: '100%' }}
                size="small"
                value={data?.payeeId}
                onChange={(value) => updateIndividualData(record.id, 'payeeId', value)}
                placeholder="选择收款人"
                allowClear
                showSearch
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
            ) : (
              <Input
                size="small"
                value={data?.payeeName}
                onChange={(e) => updateIndividualData(record.id, 'payeeName', e.target.value)}
                placeholder="输入收款人姓名"
              />
            )}
          </div>
        );
      },
    },
  ];

  // 🆕 定义表格列（会员费）
  const memberFeesColumns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 100,
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '描述',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Transaction) => {
        // 处理可能的字段名变体
        const recordAny = record as any;
        const main = record.mainDescription || recordAny.description || recordAny.mainDesc || recordAny.desc || '';
        const sub = record.subDescription || recordAny.subDesc || '';
        
        return (
          <div>
            <div>{main}</div>
            {sub && <div style={{ fontSize: '12px', color: '#999' }}>{sub}</div>}
          </div>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number, record: Transaction) => (
        <span style={{ color: record.transactionType === 'income' ? '#52c41a' : '#ff4d4f' }}>
          RM {amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      title: '关联会员',
      key: 'memberId',
      width: 300,
      render: (_: any, record: Transaction) => {
        const data = individualData[record.id];
        
        return (
          <Select
            style={{ width: '100%' }}
            size="small"
            value={data?.memberId}
            onChange={(value) => updateIndividualData(record.id, 'memberId', value)}
            placeholder="选择会员"
            allowClear
            showSearch
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
        );
      },
    },
  ];

  return (
    <BaseModal
      visible={visible}
      title={`批量设置类别 - 已选择 ${selectedCount} 条交易`}
      onOk={handleOk}
      onCancel={handleCancel}
      width={selectedCategory ? 900 : 500}
      confirmLoading={loading}
      okText="确认设置"
      cancelText="取消"
      okButtonProps={{ disabled: !selectedCategory }}
      onSuccess={() => {
        message.success(`已为 ${selectedCount} 条交易设置类别`);
        resetForm();
      }}
      onError={(error) => {
        message.error(error.message || '批量设置类别失败');
      }}
    >
      <Alert
        message="注意"
        description="此操作将覆盖所有选中交易的类别。虚拟交易（子交易）将被自动跳过。您可以为每条交易独立设置相关信息。"
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
              showSearch
            >
              {generateYearOptions().map(year => (
                <Option key={year} value={year}>{year}</Option>
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
              <Option value="新会员费">新会员费</Option>
              <Option value="续会费">续会费</Option>
              <Option value="校友会">校友会</Option>
              <Option value="拜访会员">拜访会员</Option>
            </Select>
          </div>

          <Divider>为每条交易设置关联会员</Divider>
          
          <Table
            columns={memberFeesColumns}
            dataSource={selectedTransactions}
            rowKey="id"
            pagination={false}
            scroll={{ y: 400 }}
            size="small"
          />
        </>
      )}

      {/* 活动财务动态字段 */}
      {selectedCategory === 'event-finance' && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          
          {/* 年份筛选 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
              年份（可选，用于筛选活动）
              {events.length > 0 && (
                <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                  共有 {events.length} 个活动
                </span>
              )}
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder="选择年份（不选择则显示所有活动）"
              allowClear
              showSearch
            >
              {generateYearOptions().map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
            {selectedYear && (
              <p style={{ fontSize: '12px', color: '#1890ff', marginTop: 8 }}>
                📅 下方活动列表将只显示 {selectedYear} 年的活动
              </p>
            )}
            {!selectedYear && events.length > 0 && (
              <p style={{ fontSize: '12px', color: '#52c41a', marginTop: 8 }}>
                ✅ 显示所有年份的活动（共 {events.length} 个）
              </p>
            )}
            {events.length === 0 && !loadingData && (
              <p style={{ fontSize: '12px', color: '#ff4d4f', marginTop: 8 }}>
                ⚠️ 未找到任何活动，请先在活动管理页面创建活动
              </p>
            )}
          </div>

          {/* 🆕 统一的活动选择 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>关联活动（统一设置）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedEventId}
              onChange={setSelectedEventId}
              placeholder="选择关联活动"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {events.map(event => (
                <Option key={event.id} value={event.id}>
                  {event.name}
                  {event.startDate && ` (${new Date(event.startDate).getFullYear()})`}
                </Option>
              ))}
            </Select>
            {events.length === 0 && (
              <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                💡 请先在"活动管理"页面创建活动
              </p>
            )}
          </div>

          <Divider>为每条交易设置收款人信息</Divider>
          
          <Table
            columns={eventFinanceColumns}
            dataSource={selectedTransactions}
            rowKey="id"
            pagination={false}
            scroll={{ y: 400 }}
            size="small"
          />
        </>
      )}

      {/* 日常财务动态字段 */}
      {selectedCategory === 'general-accounts' && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          
          {/* 二次分类 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>二次分类（可选）</div>
            <Select
              style={{ width: '100%' }}
              value={selectedTxAccount}
              onChange={setSelectedTxAccount}
              placeholder="选择二次分类"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const label = option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {purposes.map(purpose => (
                <Option key={purpose.value} value={purpose.value}>
                  {purpose.label}
                </Option>
              ))}
            </Select>
            {purposes.length === 0 && (
              <p style={{ fontSize: '12px', color: '#999', marginTop: 8 }}>
                💡 请先在"财务类别管理"中添加交易用途
              </p>
            )}
          </div>

          <Divider>为每条交易设置付款人信息</Divider>
          
          <Table
            columns={generalAccountsColumns}
            dataSource={selectedTransactions}
            rowKey="id"
            pagination={false}
            scroll={{ y: 400 }}
            size="small"
          />
        </>
      )}
    </BaseModal>
  );
};

export { BatchSetCategoryModal };
export default BatchSetCategoryModal;
