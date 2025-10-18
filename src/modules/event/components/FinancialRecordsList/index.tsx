/**
 * Financial Records List Component
 * 财务记录列表组件
 * 
 * 用于活动账户页面的右侧卡片
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalComponentService } from '@/config/globalComponentSettings';
import { globalDateService } from '@/config/globalDateSettings';
import './FinancialRecordsList.css';

interface FinancialRecord {
  id: string;
  sn: number;
  description: string;
  remark: string;
  amount: number;
  paymentDate: string;
  transactionType: 'income' | 'expense';
  isForecast: boolean;
  forecastConfidence?: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
}

interface FinancialRecordsListProps {
  records: FinancialRecord[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onEdit?: (record: FinancialRecord) => void;
  onView?: (record: FinancialRecord) => void;
}

const FinancialRecordsList: React.FC<FinancialRecordsListProps> = ({
  records,
  loading = false,
  onRefresh,
  onExport,
  onEdit,
  onView,
}) => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const income = records
      .filter(record => record.transactionType === 'income')
      .reduce((sum, record) => sum + record.amount, 0);
    
    const expense = records
      .filter(record => record.transactionType === 'expense')
      .reduce((sum, record) => sum + record.amount, 0);

    setTotalIncome(income);
    setTotalExpense(expense);

    if (records.length > 0) {
      const latestRecord = records.reduce((latest, current) => 
        new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest
      );
      setLastUpdated(latestRecord.updatedAt);
    }
  }, [records]);

  const getTransactionTypeTag = (type: 'income' | 'expense') => {
    return type === 'income' ? (
      <Tag color="green">收入</Tag>
    ) : (
      <Tag color="red">支出</Tag>
    );
  };

  const getForecastTag = (isForecast: boolean, confidence?: 'high' | 'medium' | 'low') => {
    if (!isForecast) {
      return <Tag color="blue">实际</Tag>;
    }
    
    const confidenceColors = {
      high: 'green',
      medium: 'orange',
      low: 'red',
    };
    
    return (
      <Tag color={confidenceColors[confidence || 'medium']}>
        预测 ({confidence || 'medium'})
      </Tag>
    );
  };

  const columns: ColumnsType<FinancialRecord> = [
    {
      title: 'Sn',
      dataIndex: 'sn',
      key: 'sn',
      width: 60,
      align: 'center',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number, record) => (
        <span style={{ 
          fontWeight: 500,
          color: record.transactionType === 'income' ? '#52c41a' : '#ff4d4f',
        }}>
          RM {amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      render: (date: string) =>
        date ? globalDateService.formatDate(new Date(date), 'display') : '-',
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {getTransactionTypeTag(record.transactionType)}
          {getForecastTag(record.isForecast, record.forecastConfidence)}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) =>
        globalDateService.formatDate(new Date(date), 'display'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {onView && (
            <Tooltip title="查看详情">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onView(record)}
              />
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tableConfig = globalComponentService.getTableConfig();

  return (
    <Card
      title={
        <Space>
          <span>📊 财务记录列表</span>
        </Space>
      }
      className="financial-records-list-card"
      extra={
        <Space>
          {onRefresh && (
            <Tooltip title="刷新">
              <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={loading}
                size="small"
              />
            </Tooltip>
          )}
          {onExport && (
            <Tooltip title="导出">
              <Button
                icon={<ExportOutlined />}
                onClick={onExport}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      }
    >
      {/* Summary Statistics */}
      <div className="financial-summary">
        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Statistic
              title="总收入"
              value={totalIncome}
              precision={2}
              prefix="RM"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title="总支出"
              value={totalExpense}
              precision={2}
              prefix="RM"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="净收入"
              value={totalIncome - totalExpense}
              precision={2}
              prefix="RM"
              valueStyle={{ 
                color: (totalIncome - totalExpense) >= 0 ? '#52c41a' : '#ff4d4f' 
              }}
            />
          </Col>
        </Row>
        
        {lastUpdated && (
          <div className="last-updated">
            <span style={{ fontSize: '12px', color: '#666' }}>
              📅 最后更新: {globalDateService.formatDate(new Date(lastUpdated), 'display')}
            </span>
          </div>
        )}
      </div>

      {/* Records Table */}
      <div className="records-table">
        <Table
          {...tableConfig}
          columns={columns}
          dataSource={records.map((record, index) => ({
            ...record,
            sn: index + 1,
          }))}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            showQuickJumper: true,
          }}
          scroll={{ x: 900 }}
          size="small"
        />
      </div>

      {/* Empty State */}
      {records.length === 0 && !loading && (
        <div className="empty-state">
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
              暂无财务记录
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>
              请在左侧表单中输入财务记录
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FinancialRecordsList;
