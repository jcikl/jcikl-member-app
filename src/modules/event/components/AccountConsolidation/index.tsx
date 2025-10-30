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
  Alert,
  message,
} from 'antd';
import {
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  WarningOutlined,
  InfoCircleOutlined,
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
  // 🆕 Bank Transaction Statistics (optional for backward compatibility)
  bankIncomeTotal?: number;
  bankExpenseTotal?: number;
  bankIncomeCount?: number;
  bankExpenseCount?: number;
  // 🆕 Event Transaction Statistics (optional)
  eventIncomeTotal?: number;
  eventExpenseTotal?: number;
  // 🆕 Unreconciled Event Transactions stats (optional)
  eventIncomeUnreconciledTotal?: number;
  eventExpenseUnreconciledTotal?: number;
  eventIncomeUnreconciledCount?: number;
  eventExpenseUnreconciledCount?: number;
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

  // 🆕 风险分析：识别需要关注的异常情况
  const analyzeRisks = () => {
    const risks: Array<{type: 'error' | 'warning' | 'info', message: string}> = [];
    
    // 1. 收入完成度分析
    const incomeCompletionRate = data.totalIncomeForecast > 0 
      ? (data.totalIncomeActual / data.totalIncomeForecast) * 100 
      : 0;
    
    if (incomeCompletionRate < 70) {
      risks.push({
        type: 'error',
        message: `⚠️ 收入完成度仅为 ${incomeCompletionRate.toFixed(1)}%，严重低于预期。建议立即检讨收入计划。`
      });
    } else if (incomeCompletionRate < 90) {
      risks.push({
        type: 'warning',
        message: `⚠️ 收入完成度 ${incomeCompletionRate.toFixed(1)}%，低于预期。需要关注收入来源。`
      });
    }
    
    // 2. 支出控制分析
    const expenseVarianceRate = data.totalExpenseForecast > 0
      ? ((data.totalExpenseActual - data.totalExpenseForecast) / data.totalExpenseForecast) * 100
      : 0;
    
    if (expenseVarianceRate > 20) {
      risks.push({
        type: 'error',
        message: `⚠️ 支出超出预算 ${expenseVarianceRate.toFixed(1)}%，请检查支出控制措施。`
      });
    } else if (expenseVarianceRate > 10) {
      risks.push({
        type: 'warning',
        message: `⚠️ 支出超出预算 ${expenseVarianceRate.toFixed(1)}%，需要注意成本控制。`
      });
    }
    
    // 3. 净利润分析
    if (data.profitActual < 0) {
      risks.push({
        type: 'error',
        message: `⚠️ 净利润为负 RM ${Math.abs(data.profitActual).toFixed(2)}，活动出现亏损。`
      });
    } else if (data.profitActual < data.profitForecast * 0.5) {
      risks.push({
        type: 'warning',
        message: `⚠️ 净利润仅为预期的 ${((data.profitActual / data.profitForecast) * 100).toFixed(1)}%，盈利目标难以达成。`
      });
    }
    
    // 4. 单项类别异常
    const extremeIncome = data.incomeComparison.filter(item => 
      item.forecast > 0 && (item.actual / item.forecast) > 0 && (item.actual / item.forecast) < 0.5
    );
    
    if (extremeIncome.length > 0) {
      risks.push({
        type: 'warning',
        message: `📊 发现 ${extremeIncome.length} 个收入类别严重低于预期，建议逐项检查。`
      });
    }
    
    const extremeExpense = data.expenseComparison.filter(item => 
      item.forecast > 0 && item.actual > item.forecast * 1.3
    );
    
    if (extremeExpense.length > 0) {
      risks.push({
        type: 'warning',
        message: `📊 发现 ${extremeExpense.length} 个支出类别超出预算 30%以上，需要审查。`
      });
    }
    
    return risks;
  };

  const risks = analyzeRisks();

  // 🆕 改进建议分析：生成可执行的改进建议
  const generateRecommendations = () => {
    const recommendations: Array<{type: 'success' | 'info', message: string}> = [];
    
    const incomeCompletionRate = data.totalIncomeForecast > 0 
      ? (data.totalIncomeActual / data.totalIncomeForecast) * 100 
      : 0;
    
    const expenseVarianceRate = data.totalExpenseForecast > 0
      ? ((data.totalExpenseActual - data.totalExpenseForecast) / data.totalExpenseForecast) * 100
      : 0;
    
    // 收入改进建议
    if (incomeCompletionRate > 90 && incomeCompletionRate < 100) {
      recommendations.push({
        type: 'info',
        message: `💡 收入接近目标(${incomeCompletionRate.toFixed(1)}%)，考虑挖掘额外收入来源以超额完成。`
      });
    }
    
    if (incomeCompletionRate >= 100) {
      recommendations.push({
        type: 'success',
        message: `🎉 恭喜！收入已达成目标，超出预算 ${((incomeCompletionRate - 100).toFixed(1))}%。建议合理规划超额收入的使用。`
      });
    }
    
    // 支出改进建议
    if (expenseVarianceRate < 0 && Math.abs(expenseVarianceRate) > 10) {
      recommendations.push({
        type: 'success',
        message: `🎉 支出控制良好，节省了 ${Math.abs(expenseVarianceRate).toFixed(1)}%。可以将节省的资金用于提升活动质量或其他重要项目。`
      });
    }
    
    // 利润优化建议
    const profitVarianceRate = data.profitForecast > 0
      ? ((data.profitActual - data.profitForecast) / data.profitForecast) * 100
      : 0;
    
    if (profitVarianceRate > 20) {
      recommendations.push({
        type: 'success',
        message: `🎉 净利润超出预期 ${profitVarianceRate.toFixed(1)}%！活动盈利能力强劲，可以考虑用于后续活动投资。`
      });
    }
    
    // 单项类别改进建议
    const topUnderperformIncome = data.incomeComparison
      .filter(item => item.forecast > 0 && item.actual / item.forecast < 0.8)
      .sort((a, b) => (a.actual / a.forecast) - (b.actual / b.forecast))
      .slice(0, 3);
    
    if (topUnderperformIncome.length > 0) {
      const items = topUnderperformIncome.map(item => item.categoryLabel).join('、');
      recommendations.push({
        type: 'info',
        message: `💡 建议优先关注这些收入类别：${items}，完成度较低，可能影响整体收入目标。`
      });
    }
    
    const topOverperformExpense = data.expenseComparison
      .filter(item => item.forecast > 0 && item.actual / item.forecast > 1.2)
      .sort((a, b) => (b.actual / b.forecast) - (a.actual / a.forecast))
      .slice(0, 3);
    
    if (topOverperformExpense.length > 0) {
      const items = topOverperformExpense.map(item => item.categoryLabel).join('、');
      recommendations.push({
        type: 'info',
        message: `💡 以下支出类别超出预算较多：${items}，建议审查是否有优化空间。`
      });
    }
    
    return recommendations;
  };

  const recommendations = generateRecommendations();

  // 🆕 导出户口核对报表
  const handleExportReport = () => {
    const filename = `户口核对报表_${new Date().toISOString().split('T')[0]}.csv`;
    
    // 构建报表内容
    const lines = [
      '户口核对与差异分析报表',
      `导出日期: ${new Date().toLocaleDateString('zh-CN')}`,
      '',
      '一、总体统计',
      `预测收入,${data.totalIncomeForecast.toFixed(2)}`,
      `实际收入,${data.totalIncomeActual.toFixed(2)}`,
      `收入差异,${(data.totalIncomeActual - data.totalIncomeForecast).toFixed(2)}`,
      `收入完成率,${((data.totalIncomeActual / data.totalIncomeForecast) * 100).toFixed(1)}%`,
      '',
      `预测支出,${data.totalExpenseForecast.toFixed(2)}`,
      `实际支出,${data.totalExpenseActual.toFixed(2)}`,
      `支出差异,${(data.totalExpenseActual - data.totalExpenseForecast).toFixed(2)}`,
      `支出完成率,${((data.totalExpenseActual / data.totalExpenseForecast) * 100).toFixed(1)}%`,
      '',
      `预测净利润,${data.profitForecast.toFixed(2)}`,
      `实际净利润,${data.profitActual.toFixed(2)}`,
      `净利润差异,${(data.profitActual - data.profitForecast).toFixed(2)}`,
      '',
      '二、收入明细对比',
      '类别,预测金额,实际金额,差异,完成率,状态',
      ...data.incomeComparison.map(item => {
        const status = item.status === 'completed' ? '已完成' : 
                       item.status === 'partial' ? '部分完成' : 
                       item.status === 'pending' ? '待支付' : '超出预期';
        return `${item.categoryLabel},${item.forecast.toFixed(2)},${item.actual.toFixed(2)},${item.variance.toFixed(2)},${item.percentage.toFixed(1)}%,${status}`;
      }),
      '',
      '三、支出明细对比',
      '类别,预测金额,实际金额,差异,完成率,状态',
      ...data.expenseComparison.map(item => {
        const status = item.status === 'completed' ? '已完成' : 
                       item.status === 'partial' ? '部分完成' : 
                       item.status === 'pending' ? '待支付' : '超出预期';
        return `${item.categoryLabel},${item.forecast.toFixed(2)},${item.actual.toFixed(2)},${item.variance.toFixed(2)},${item.percentage.toFixed(1)}%,${status}`;
      }),
    ];
    
    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    message.success('户口核对报表已导出');
  };

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
      title="🔄 户口核对与差异分析(Account Consolidation & Variance Analysis)"
      extra={
        <Space>
          {onGenerateReport && (
            <Button
              type="primary"
              onClick={handleExportReport}
            >
              生成对比报表
            </Button>
          )}
          {onExport && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
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

      {/* 🆕 风险警告 */}
      {risks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {risks.map((risk, index) => (
            <Alert
              key={index}
              type={risk.type}
              message={risk.message}
              icon={risk.type === 'error' ? <WarningOutlined /> : <InfoCircleOutlined />}
              style={{ marginBottom: 8 }}
              showIcon
            />
          ))}
        </div>
      )}

      {/* 🆕 改进建议 */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {recommendations.map((rec, index) => (
            <Alert
              key={`rec-${index}`}
              type={rec.type}
              message={rec.message}
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 8 }}
              showIcon
            />
          ))}
        </div>
      )}

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

