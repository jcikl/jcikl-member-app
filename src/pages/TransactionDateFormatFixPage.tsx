/**
 * Transaction Date Format Fix Page
 * 交易日期格式修复页
 * 
 * 临时页面：修复 fin_transactions 的 transactionDate 格式
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  message,
  Alert,
  Typography,
  Modal,
  Progress,
  Tag,
  Input,
  DatePicker,
  Form,
} from 'antd';
import {
  ReloadOutlined,
  EditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { GLOBAL_COLLECTIONS } from '@/config/globalCollections';
import { globalSystemService } from '@/config/globalSystemSettings';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;

interface TransactionDateItem {
  id: string;
  currentDate: string;
  previewDate: string;
  status: 'valid' | 'invalid' | 'empty';
  description?: string;
  amount: number;
  transactionType: string;
}

const TransactionDateFormatFixPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TransactionDateItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [fixing, setFixing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 转换日期格式(从 any format 到本地 YYYY-MM-DD 格式)
  const formatTransactionDate = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr.trim() === '') {
      return '';
    }

    try {
      // 创建日期对象(自动使用本地时区)
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'INVALID';
      }
      
      // 🆕 使用本地时区的日期组件(确保不转换为 UTC)
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // 格式化为 YYYY-MM-DD(本地日期)
      const formattedYear = year.toString();
      const formattedMonth = String(month).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      
      return `${formattedYear}-${formattedMonth}-${formattedDay}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'ERROR';
    }
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading fin_transactions...');
      
      const snapshot = await getDocs(collection(db, GLOBAL_COLLECTIONS.TRANSACTIONS));
      
      const items: TransactionDateItem[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const currentDate = data.transactionDate || '';
        const previewDate = formatTransactionDate(currentDate);
        
        let status: 'valid' | 'invalid' | 'empty' = 'valid';
        let description = '';
        
        if (!currentDate || currentDate.trim() === '') {
          status = 'empty';
          description = '日期为空';
        } else if (previewDate === 'INVALID' || previewDate === 'ERROR') {
          status = 'invalid';
          description = '日期格式无效';
        } else if (currentDate !== previewDate && previewDate.length === 10) {
          // 如果转换后格式不同，说明需要修复
          description = `需要修复: ${currentDate} → ${previewDate}`;
          status = 'invalid';
        }
        
        items.push({
          id: doc.id,
          currentDate,
          previewDate,
          status,
          description,
          amount: data.amount || 0,
          transactionType: data.transactionType || '',
        });
      });
      
      console.log(`✅ Loaded ${items.length} transactions`);
      console.log(`📊 Stats:`, {
        valid: items.filter(i => i.status === 'valid').length,
        invalid: items.filter(i => i.status === 'invalid').length,
        empty: items.filter(i => i.status === 'empty').length,
      });
      
      setData(items);
      message.success(`已加载 ${items.length} 条记录`);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 修复选中的记录
  const fixSelected = async () => {
    if (selectedRows.length === 0) {
      message.warning('请先选择要修复的记录');
      return;
    }

    Modal.confirm({
      title: '确认修复',
      content: `确定要修复 ${selectedRows.length} 条记录的日期格式吗？`,
      onOk: async () => {
        setFixing(true);
        setProgress(0);
        
        try {
          let successCount = 0;
          let failCount = 0;
          
          const batch = writeBatch(db);
          const batchSize = 500;
          let batchCount = 0;
          
          for (const id of selectedRows) {
            const item = data.find(d => d.id === id);
            if (!item || item.status === 'valid') {
              continue;
            }
            
            try {
              const docRef = doc(db, GLOBAL_COLLECTIONS.TRANSACTIONS, id);
              batch.update(docRef, {
                transactionDate: item.previewDate || null,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.id,
              });
              
              batchCount++;
              successCount++;
              
              // Firestore batch 限制是 500
              if (batchCount >= batchSize) {
                await batch.commit();
                console.log(`✅ Committed batch of ${batchCount} transactions`);
                batchCount = 0;
              }
              
              setProgress(Math.floor((successCount / selectedRows.length) * 100));
            } catch (error) {
              console.error(`❌ Failed to update ${id}:`, error);
              failCount++;
            }
          }
          
          // 提交剩余批次
          if (batchCount > 0) {
            await batch.commit();
            console.log(`✅ Committed final batch of ${batchCount} transactions`);
          }
          
          message.success(`修复完成：成功 ${successCount} 条，失败 ${failCount} 条`);
          
          // 重新加载数据
          await loadData();
          setSelectedRows([]);
        } catch (error) {
          console.error('❌ Error fixing dates:', error);
          message.error('修复失败');
        } finally {
          setFixing(false);
          setProgress(0);
        }
      },
    });
  };

  // 修复所有无效记录
  const fixAll = async () => {
    const invalidItems = data.filter(item => item.status !== 'valid');
    
    if (invalidItems.length === 0) {
      message.info('没有需要修复的记录');
      return;
    }

    Modal.confirm({
      title: '确认修复全部',
      content: `确定要修复全部 ${invalidItems.length} 条无效记录的日期格式吗？`,
      onOk: async () => {
        setSelectedRows(invalidItems.map(item => item.id));
        await fixSelected();
      },
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      ellipsis: true,
    },
    {
      title: '当前格式',
      dataIndex: 'currentDate',
      key: 'currentDate',
      width: 200,
      render: (text: string) => (
        <Text code style={{ color: '#8c8c8c' }}>
          {text || '(空)'}
        </Text>
      ),
    },
    {
      title: '预览格式',
      dataIndex: 'previewDate',
      key: 'previewDate',
      width: 200,
      render: (text: string, record: TransactionDateItem) => (
        <Text 
          style={{ 
            color: record.status === 'valid' ? '#52c41a' : record.status === 'invalid' ? '#ff4d4f' : '#faad14',
            fontWeight: 500,
          }}
        >
          {text || '(空)'}
        </Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: any, record: TransactionDateItem) => {
        if (record.status === 'valid') {
          return <Tag color="success">✓ 有效</Tag>;
        } else if (record.status === 'invalid') {
          return <Tag color="error">✗ 无效</Tag>;
        } else {
          return <Tag color="warning">○ 空值</Tag>;
        }
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (text: string) => (
        <Text type="secondary" italic style={{ fontSize: '12px' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right' as const,
      render: (amount: number, record: TransactionDateItem) => (
        <Text style={{ color: record.transactionType === 'income' ? '#52c41a' : '#ff4d4f' }}>
          {record.transactionType === 'income' ? '+' : '-'}RM {amount.toFixed(2)}
        </Text>
      ),
    },
  ];

  const validCount = data.filter(d => d.status === 'valid').length;
  const invalidCount = data.filter(d => d.status === 'invalid').length;
  const emptyCount = data.filter(d => d.status === 'empty').length;

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Title level={3}>
            <WarningOutlined /> 财务交易日期格式修复
          </Title>
          
          <Alert
            message="临时数据修复工具"
            description="此页面用于修复 fin_transactions 的 transactionDate 字段格式，统一为本地时区 YYYY-MM-DD 格式"
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={loadData} loading={loading}>
                刷新数据
              </Button>
            }
          />

          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>数据统计</Title>
              <Space size="large">
                <Tag color="success">
                  ✓ 有效: {validCount}
                </Tag>
                <Tag color="error">
                  ✗ 无效: {invalidCount}
                </Tag>
                <Tag color="warning">
                  ○ 空值: {emptyCount}
                </Tag>
                <Tag>
                  总计: {data.length}
                </Tag>
              </Space>
            </Space>
          </Card>

          <Space>
            <Button
              type="primary"
              onClick={fixSelected}
              disabled={selectedRows.length === 0 || fixing}
              loading={fixing}
            >
              <EditOutlined /> 修复选中 ({selectedRows.length})
            </Button>
            <Button
              onClick={fixAll}
              disabled={invalidCount === 0 || fixing}
            >
              <CheckCircleOutlined /> 修复全部无效记录 ({invalidCount})
            </Button>
            <Button
              onClick={loadData}
              loading={loading}
            >
              <ReloadOutlined /> 刷新数据
            </Button>
          </Space>

          {fixing && (
            <Progress
              percent={progress}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          )}

          <Table
            columns={columns}
            dataSource={data}
            loading={loading}
            rowKey="id"
            size="small"
            scroll={{ x: 1200, y: 600 }}
            pagination={{ pageSize: 50 }}
            rowSelection={{
              selectedRowKeys: selectedRows,
              onChange: (keys) => setSelectedRows(keys as string[]),
              getCheckboxProps: (record: TransactionDateItem) => ({
                disabled: record.status === 'valid',
              }),
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default TransactionDateFormatFixPage;

