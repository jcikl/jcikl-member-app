/**
 * Financial Records Debug Page
 * FINANCIAL_RECORDS 集合调试页面
 * 
 * 用途：在浏览器中查看 FINANCIAL_RECORDS 集合的所有记录
 */

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Spin, Typography, Alert, Space, Button, Modal, message, Popconfirm } from 'antd';
import { DeleteOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalDateService } from '@/config/globalDateSettings';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface FinancialRecord {
  id: string;
  type?: string;
  [key: string]: any;
}

interface TypeStats {
  type: string;
  count: number;
  records: FinancialRecord[];
}

export const FinancialRecordsDebugPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [stats, setStats] = useState<TypeStats[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS));
      
      let allRecords: FinancialRecord[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      // 🆕 从 Transactions 表中获取 txAccount 并合并
      try {
        const txnSnap = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
        const txAccountByMember: Record<string, string> = {};

        txnSnap.docs
          .filter(d => d.data().category === 'member-fees')
          .forEach(d => {
            const txnData = d.data() as any;
            const memberId = txnData?.metadata?.memberId;
            if (memberId && txnData.txAccount) {
              txAccountByMember[memberId] = txnData.txAccount;
            }
          });

        // 合并 txAccount 到会费记录
        allRecords = allRecords.map(record => {
          if (record.type === 'memberFee' && record.memberId) {
            const txAccount = txAccountByMember[record.memberId];
            if (txAccount) {
              return { ...record, txAccount };
            }
          }
          return record;
        });

        console.log('[DebugPage] Merged txAccount for', Object.keys(txAccountByMember).length, 'members');
      } catch (error) {
        console.warn('[DebugPage] Failed to merge txAccount:', error);
      }

      setRecords(allRecords);

      // 统计各类型
      const typeMap = new Map<string, FinancialRecord[]>();
      allRecords.forEach(record => {
        const type = record.type || 'unknown';
        if (!typeMap.has(type)) {
          typeMap.set(type, []);
        }
        typeMap.get(type)!.push(record);
      });

      const statsData: TypeStats[] = Array.from(typeMap.entries()).map(([type, records]) => ({
        type,
        count: records.length,
        records,
      }));

      setStats(statsData);
    } catch (error) {
      console.error('Failed to load financial records:', error);
      message.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllRecords = async () => {
    Modal.confirm({
      title: '⚠️ 确认重置 FINANCIAL_RECORDS',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Alert
            message="危险操作"
            description={
              <div>
                <p>此操作将<strong style={{ color: 'red' }}>删除所有 {records.length} 条记录</strong>，包括：</p>
                <ul>
                  {stats.map(s => (
                    <li key={s.type}>{s.type}: {s.count} 条</li>
                  ))}
                </ul>
                <p><strong>此操作不可撤销！</strong></p>
              </div>
            }
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      width: 600,
      onOk: async () => {
        const hide = message.loading('正在删除所有记录...', 0);
        try {
          // 批量删除所有记录
          const deletePromises = records.map(record => 
            deleteDoc(doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, record.id))
          );
          
          await Promise.all(deletePromises);
          
          hide();
          message.success(`成功删除 ${records.length} 条记录`);
          
          // 重新加载
          await loadRecords();
        } catch (error) {
          hide();
          console.error('Failed to reset financial records:', error);
          message.error('删除失败，请查看控制台');
        }
      },
    });
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteDoc(doc(db, GLOBAL_COLLECTIONS.FINANCIAL_RECORDS, recordId));
      message.success('删除成功');
      await loadRecords();
    } catch (error) {
      console.error('Failed to delete record:', error);
      message.error('删除失败');
    }
  };

  const statsColumns: ColumnsType<TypeStats> = [
    {
      title: '记录类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          memberFee: { label: '会员费用', color: 'blue' },
          eventFinancialRecord: { label: '活动财务', color: 'green' },
          generalFinancialRecord: { label: '日常账户', color: 'orange' },
        };
        const config = typeMap[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '记录数量',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: TypeStats) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => setSelectedType(record.type)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const detailColumns: ColumnsType<FinancialRecord> = [
    {
      title: '交易日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => date ? globalDateService.formatDate(new Date(date), 'display') : '-',
    },
    {
      title: '交易类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          memberFee: { label: '会员费用', color: 'blue' },
          eventFinancialRecord: { label: '活动财务', color: 'green' },
          generalFinancialRecord: { label: '日常账户', color: 'orange' },
        };
        const config = typeMap[type] || { label: type || 'unknown', color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '交易用途',
      dataIndex: 'txAccount',
      key: 'txAccount',
      width: 200,
      render: (txAccount?: string) => txAccount ? (
        <Tag color="geekblue">{txAccount}</Tag>
      ) : (
        <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '名字/公司',
      key: 'name',
      width: 200,
      render: (_: any, record: FinancialRecord) => {
        if (record.type === 'memberFee') {
          // 会员费记录：显示会员名字 + 邮箱
          const memberName = record.memberName || '-';
          const memberEmail = record.memberEmail;
          
          return (
            <div>
              <div style={{ fontWeight: 500 }}>{memberName}</div>
              {memberEmail && (
                <div style={{ fontSize: 12, color: '#666' }}>{memberEmail}</div>
              )}
            </div>
          );
        } else if (record.type === 'eventFinancialRecord' || record.type === 'generalFinancialRecord') {
          // 活动财务/日常账户记录：显示会员名字或付款人 + 邮箱(如果有)
           const payerPayee = (record as any).payerPayee;
           const memberName = (record as any).memberName;
           const memberEmail = (record as any).memberEmail;
          
          // 优先显示会员名字，其次显示付款人/收款人
          const displayName = memberName || payerPayee || '-';
          
          return (
            <div>
              <div style={{ fontWeight: 500 }}>{displayName}</div>
              {memberEmail && (
                <div style={{ fontSize: 12, color: '#666' }}>{memberEmail}</div>
              )}
            </div>
          );
        }
        return '-';
      },
    },
    {
      title: '金额',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (_: any, record: FinancialRecord) => {
        // 根据记录类型计算收入和支出
        let income = 0;
        let expense = 0;
        
        if (record.type === 'memberFee') {
          // 会员费：显示剩余未付金额(应收 - 实收)
          const expected = (record as any).expectedAmount || 0;
          const paid = (record as any).paidAmount || 0;
          const remaining = expected - paid;
          
          // 会员费特殊处理：显示剩余金额
          if (remaining === 0) {
            // 已全额支付，显示已付金额
            return (
              <span style={{ color: '#52c41a', fontWeight: 500 }}>
                RM {paid.toFixed(2)}
              </span>
            );
          } else if (remaining > 0) {
            // 部分支付或未支付，显示剩余金额
            return (
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
                RM {remaining.toFixed(2)}
              </span>
            );
          } else {
            // 超额支付(异常情况)
            return (
              <span style={{ color: '#faad14', fontWeight: 500 }}>
                RM {Math.abs(remaining).toFixed(2)}
              </span>
            );
          }
        } else if (record.type === 'eventFinancialRecord' || record.type === 'generalFinancialRecord') {
          // 活动财务/日常账户：显示总收入和总支出
          income = (record as any).totalRevenue || 0;
          expense = (record as any).totalExpense || 0;
        }
        
        // 参考银行对账单：收入显示正数(绿色)，支出显示负数(红色)
        const netAmount = income - expense;
        const displayAmount = Math.abs(netAmount);
        const isIncome = netAmount >= 0;
        
        if (displayAmount === 0) return '-';
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ 
              color: isIncome ? '#52c41a' : '#ff4d4f', 
              fontWeight: 500,
              fontSize: '14px'
            }}>
              RM {displayAmount.toFixed(2)}
            </span>
            {income > 0 && expense > 0 && (
              <span style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                {income.toFixed(2)} - {expense.toFixed(2)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          paid: 'success',
          unpaid: 'warning',
          partial: 'processing',
          overdue: 'error',
        };
        return status ? <Tag color={colorMap[status] || 'default'}>{status}</Tag> : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record: FinancialRecord) => (
        <Popconfirm
          title="确认删除此记录？"
          description="此操作不可撤销"
          onConfirm={() => handleDeleteRecord(record.id)}
          okText="删除"
          cancelText="取消"
          okType="danger"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const displayRecords = selectedType 
    ? stats.find(s => s.type === selectedType)?.records || []
    : records;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ marginBottom: 16 }}>加载中...</div>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>📊 FINANCIAL_RECORDS 集合调试</Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />}
            onClick={loadRecords}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />}
            onClick={handleResetAllRecords}
            disabled={records.length === 0}
          >
            重置所有记录
          </Button>
        </Space>
      </div>

      <Alert
        message="调试页面"
        description="此页面用于查看和调试 FINANCIAL_RECORDS 集合中的所有记录类型和数据。可以单独删除记录或重置整个集合。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="📈 统计概览" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>总记录数: </Text>
            <Text style={{ fontSize: 24, color: '#1890ff' }}>{records.length}</Text>
          </div>
          
          <Table
            columns={statsColumns}
            dataSource={stats}
            rowKey="type"
            pagination={false}
            size="small"
          />
        </Space>
      </Card>

      <Card 
        title={
          <Space>
            <span>📋 记录详情</span>
            {selectedType && (
              <>
                <Tag color="blue">{selectedType}</Tag>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => setSelectedType(null)}
                >
                  显示全部
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Table
          columns={detailColumns}
          dataSource={displayRecords}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default FinancialRecordsDebugPage;

