/**
 * Update Financial Records Payer Info Page
 * 更新财务记录付款人信息页面
 */

import React, { useState } from 'react';
import { Button, Card, Typography, Space, Alert, Divider, Statistic, Row, Col } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { 
  updateEventFinancialRecordsPayerInfo,
  updateGeneralFinancialRecordsPayerInfo,
  updateAllFinancialRecordsPayerInfo 
} from '@/scripts/updateFinancialRecordsPayerInfo';

const { Title, Text, Paragraph } = Typography;

const UpdateFinancialRecordsPayerInfoPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    eventRecords: { updated: number; total: number };
    generalRecords: { updated: number; total: number };
    completed: boolean;
    error?: string;
  } | null>(null);

  const handleUpdateEventRecords = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🔄 Starting event financial records update...');
      await updateEventFinancialRecordsPayerInfo();
      console.log('✅ Event financial records update completed');
      
      setResults({
        eventRecords: { updated: 1, total: 1 }, // Placeholder - actual count would come from the function
        generalRecords: { updated: 0, total: 0 },
        completed: true,
      });
    } catch (error) {
      console.error('❌ Event financial records update failed:', error);
      setResults({
        eventRecords: { updated: 0, total: 0 },
        generalRecords: { updated: 0, total: 0 },
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGeneralRecords = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🔄 Starting general financial records update...');
      await updateGeneralFinancialRecordsPayerInfo();
      console.log('✅ General financial records update completed');
      
      setResults({
        eventRecords: { updated: 0, total: 0 },
        generalRecords: { updated: 1, total: 1 }, // Placeholder - actual count would come from the function
        completed: true,
      });
    } catch (error) {
      console.error('❌ General financial records update failed:', error);
      setResults({
        eventRecords: { updated: 0, total: 0 },
        generalRecords: { updated: 0, total: 0 },
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllRecords = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🔄 Starting all financial records update...');
      await updateAllFinancialRecordsPayerInfo();
      console.log('✅ All financial records update completed');
      
      setResults({
        eventRecords: { updated: 1, total: 1 }, // Placeholder - actual count would come from the function
        generalRecords: { updated: 1, total: 1 }, // Placeholder - actual count would come from the function
        completed: true,
      });
    } catch (error) {
      console.error('❌ All financial records update failed:', error);
      setResults({
        eventRecords: { updated: 0, total: 0 },
        generalRecords: { updated: 0, total: 0 },
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>
          <ExclamationCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          更新财务记录付款人信息
        </Title>
        
        <Paragraph>
          此工具用于更新现有的活动财务记录和日常账户财务记录，从关联的交易记录中获取最新的付款人/收款人信息。
        </Paragraph>

        <Alert
          message="重要提示"
          description="此操作将从关联的交易记录中获取最新的 payerPayee、memberId、memberName 信息，并更新到对应的财务记录中。请确保在执行前已备份数据。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title="更新选项" size="small">
            <Space wrap>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={handleUpdateEventRecords}
              >
                更新活动财务记录
              </Button>
              
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={handleUpdateGeneralRecords}
              >
                更新日常账户财务记录
              </Button>
              
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={handleUpdateAllRecords}
              >
                更新所有财务记录
              </Button>
            </Space>
          </Card>

          {results && (
            <Card title="更新结果" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="活动财务记录"
                    value={results.eventRecords.updated}
                    suffix={`/ ${results.eventRecords.total}`}
                    prefix={results.completed ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="日常账户财务记录"
                    value={results.generalRecords.updated}
                    suffix={`/ ${results.generalRecords.total}`}
                    prefix={results.completed ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="状态"
                    value={results.completed ? '完成' : '失败'}
                    valueStyle={{ color: results.completed ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
              </Row>

              {results.error && (
                <>
                  <Divider />
                  <Alert
                    message="错误信息"
                    description={results.error}
                    type="error"
                    showIcon
                  />
                </>
              )}

              {results.completed && (
                <>
                  <Divider />
                  <Alert
                    message="更新完成"
                    description="财务记录的付款人信息已成功更新。请检查财务记录管理页面和调试页面，确认信息显示正确。"
                    type="success"
                    showIcon
                  />
                </>
              )}
            </Card>
          )}

          <Card title="更新说明" size="small">
            <Paragraph>
              <Text strong>更新内容：</Text>
            </Paragraph>
            <ul>
              <li><Text code>payerPayee</Text> - 付款人/收款人姓名（从关联交易的最新记录获取）</li>
              <li><Text code>memberId</Text> - 会员ID（如果是会员相关的交易）</li>
              <li><Text code>memberName</Text> - 会员姓名（如果是会员相关的交易）</li>
            </ul>
            
            <Paragraph>
              <Text strong>更新逻辑：</Text>
            </Paragraph>
            <ul>
              <li>从每个财务记录的所有关联交易中获取最新的付款人信息</li>
              <li>按交易创建时间排序，使用最新交易的付款人信息</li>
              <li>只更新有变化的记录，避免不必要的数据库写入</li>
            </ul>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default UpdateFinancialRecordsPayerInfoPage;
