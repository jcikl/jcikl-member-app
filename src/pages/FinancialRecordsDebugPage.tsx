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
      
      const allRecords: FinancialRecord[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

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
      render: (type: string) => (
        <Tag color={type === 'memberFee' ? 'blue' : 'default'}>
          {type}
        </Tag>
      ),
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      fixed: 'left',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => <Tag>{type || 'unknown'}</Tag>,
    },
    {
      title: '会员ID',
      dataIndex: 'memberId',
      key: 'memberId',
      width: 150,
      ellipsis: true,
    },
    {
      title: '会员姓名',
      dataIndex: 'memberName',
      key: 'memberName',
      width: 150,
    },
    {
      title: '交易ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 200,
      ellipsis: true,
    },
    {
      title: '预期金额',
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      width: 120,
      align: 'right',
      render: (amount: number) => amount ? `RM ${amount.toFixed(2)}` : '-',
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (amount: number) => amount ? `RM ${amount.toFixed(2)}` : '-',
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
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => date ? globalDateService.formatDate(new Date(date), 'display') : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: string) => date ? globalDateService.formatDate(new Date(date), 'display') : '-',
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
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
          scroll={{ x: 1800 }}
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

