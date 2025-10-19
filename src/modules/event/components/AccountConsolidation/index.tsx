/**
 * Account Consolidation Component
 * 户口核对与差异分析组件
 * 
 * 对比预测数据与实际数据，生成差异分析报告
 */

import React from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { globalComponentService } from '@/config/globalComponentSettings';
import './AccountConsolidation.css';

export interface CategoryComparison {
  category: string;
  categoryLabel: string;
  forecast: number;
  actual: number;
  variance: number;
  percentage: number;
  status: 'completed' | 'partial' | 'pending' | 'exceeded';
}

export interface ConsolidationData {
  incomeComparison: CategoryComparison[];
  expenseComparison: CategoryComparison[];
  totalIncomeForecast: number;
  totalIncomeActual: number;
  totalExpenseForecast: number;
  totalExpenseActual: number;
  profitForecast: number;
  profitActual: number;
}

interface Props {
  data: ConsolidationData;
  loading?: boolean;
  onExport?: () => void;
  onGenerateReport?: () => void;
}

const AccountConsolidation: React.FC<Props> = ({
  data,
  loading,
  onExport,
  onGenerateReport,
}) => {
  const tableConfig = globalComponentService.getTableConfig();

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'partial':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'exceeded':
        return <TrophyOutlined style={{ color: '#722ed1' }} />;
      default:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'partial':
        return '部分完成';
      case 'pending':
        return '待支付';
      case 'exceeded':
        return '超出预期';
      default:
        return '异常';
    }
  };

  // 表格列定义
  const columns: ColumnsType<CategoryComparison> = [
    {
      title: '类别',
      dataIndex: 'categoryLabel',
      width: 150,
    },
    {
      title: '预测金额',
      dataIndex: 'forecast',
      width: 130,
      align: 'right',
      render: (value: number) => `RM ${value.toFixed(2)}`,
    },
    {
      title: '实际金额',
      dataIndex: 'actual',
      width: 130,
      align: 'right',
      render: (value: number) => `RM ${value.toFixed(2)}`,
    },
    {
      title: '差异',
      dataIndex: 'variance',
      width: 130,
      align: 'right',
      render: (value: number) => {
        const color = value >= 0 ? '#52c41a' : '#ff4d4f';
        return (
          <span style={{ color, fontWeight: 600 }}>
            {value >= 0 ? '+' : ''}RM {value.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '完成率',
      dataIndex: 'percentage',
      width: 150,
      render: (value: number) => (
        <div>
          <Progress
            percent={Math.min(value, 100)}
            size="small"
            status={value >= 100 ? 'success' : value >= 50 ? 'active' : 'exception'}
            format={() => `${value.toFixed(0)}%`}
          />
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => (
        <Tag icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title="🔄 户口核对与差异分析（Account Consolidation & Variance Analysis）"
      extra={
        <Space>
          {onGenerateReport && (
            <Button
              type="primary"
              onClick={onGenerateReport}
            >
              生成对比报表
            </Button>
          )}
          {onExport && (
            <Button
              icon={<DownloadOutlined />}
              onClick={onExport}
            >
              导出给财务部门
            </Button>
          )}
        </Space>
      }
      className="account-consolidation-card"
    >
      {/* 总体对比统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card size="small" className="comparison-stat-card">
            <Statistic
              title="📊 收入对比"
              value={data.totalIncomeActual}
              precision={2}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
              suffix="RM"
            />
            <div style={{ marginTop: 12, fontSize: '13px' }}>
              <div style={{ color: '#8c8c8c' }}>
                预测: RM {data.totalIncomeForecast.toFixed(2)}
              </div>
              <div style={{ 
                color: data.totalIncomeActual >= data.totalIncomeForecast ? '#52c41a' : '#ff4d4f',
                fontWeight: 600
              }}>
                差异: {data.totalIncomeActual >= data.totalIncomeForecast ? '+' : ''}
                RM {(data.totalIncomeActual - data.totalIncomeForecast).toFixed(2)}
                ({((data.totalIncomeActual / data.totalIncomeForecast) * 100).toFixed(1)}%)
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card size="small" className="comparison-stat-card">
            <Statistic
              title="📊 支出对比"
              value={data.totalExpenseActual}
              precision={2}
              prefix={<FallOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
              suffix="RM"
            />
            <div style={{ marginTop: 12, fontSize: '13px' }}>
              <div style={{ color: '#8c8c8c' }}>
                预算: RM {data.totalExpenseForecast.toFixed(2)}
              </div>
              <div style={{ 
                color: data.totalExpenseActual <= data.totalExpenseForecast ? '#52c41a' : '#ff4d4f',
                fontWeight: 600
              }}>
                差异: {data.totalExpenseActual <= data.totalExpenseForecast ? '-' : '+'}
                RM {Math.abs(data.totalExpenseActual - data.totalExpenseForecast).toFixed(2)}
                ({((data.totalExpenseActual / data.totalExpenseForecast) * 100).toFixed(1)}%)
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card size="small" className="comparison-stat-card">
            <Statistic
              title="📊 净利润对比"
              value={data.profitActual}
              precision={2}
              valueStyle={{ 
                color: data.profitActual >= 0 ? '#52c41a' : '#ff4d4f',
                fontSize: '20px'
              }}
              suffix="RM"
            />
            <div style={{ marginTop: 12, fontSize: '13px' }}>
              <div style={{ color: '#8c8c8c' }}>
                预测: RM {data.profitForecast.toFixed(2)}
              </div>
              <div style={{ 
                color: data.profitActual >= data.profitForecast ? '#52c41a' : '#ff4d4f',
                fontWeight: 600
              }}>
                差异: {data.profitActual >= data.profitForecast ? '+' : ''}
                RM {(data.profitActual - data.profitForecast).toFixed(2)}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 收入明细对比 */}
      <Card 
        type="inner" 
        title={
          <span>
            <RiseOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            收入明细对比
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          {...tableConfig}
          columns={columns}
          dataSource={data.incomeComparison}
          rowKey="category"
          loading={loading}
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>收入小计</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>RM {data.totalIncomeForecast.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>RM {data.totalIncomeActual.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong style={{ 
                    color: data.totalIncomeActual >= data.totalIncomeForecast ? '#52c41a' : '#ff4d4f'
                  }}>
                    {data.totalIncomeActual >= data.totalIncomeForecast ? '+' : ''}
                    RM {(data.totalIncomeActual - data.totalIncomeForecast).toFixed(2)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong>
                    {((data.totalIncomeActual / data.totalIncomeForecast) * 100).toFixed(1)}%
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* 支出明细对比 */}
      <Card 
        type="inner" 
        title={
          <span>
            <FallOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            支出明细对比
          </span>
        }
      >
        <Table
          {...tableConfig}
          columns={columns}
          dataSource={data.expenseComparison}
          rowKey="category"
          loading={loading}
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>支出小计</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>RM {data.totalExpenseForecast.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>RM {data.totalExpenseActual.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong style={{ 
                    color: data.totalExpenseActual <= data.totalExpenseForecast ? '#52c41a' : '#ff4d4f'
                  }}>
                    {data.totalExpenseActual <= data.totalExpenseForecast ? '-' : '+'}
                    RM {Math.abs(data.totalExpenseActual - data.totalExpenseForecast).toFixed(2)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong>
                    {((data.totalExpenseActual / data.totalExpenseForecast) * 100).toFixed(1)}%
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* 图例说明 */}
      <div style={{ 
        marginTop: 16, 
        padding: '12px 16px', 
        background: '#f6ffed', 
        border: '1px solid #b7eb8f',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <strong>📌 图例：</strong>
        {' '}
        <Tag icon={<CheckCircleOutlined />} color="success">已完成</Tag>
        <Tag icon={<CloseCircleOutlined />} color="error">低于预期</Tag>
        <Tag icon={<ClockCircleOutlined />} color="warning">待支付</Tag>
        <Tag icon={<TrophyOutlined />} color="purple">超出预期</Tag>
      </div>
    </Card>
  );
};

export default AccountConsolidation;

