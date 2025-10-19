/**
 * Financial Category Initializer Component
 * 财务类别初始化组件
 * 
 * 批量创建收入和支出类别
 */

import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  message, 
  Statistic, 
  Row, 
  Col, 
  Alert,
  Divider,
  Tag,
  Collapse,
} from 'antd';
import { 
  DatabaseOutlined, 
  CheckCircleOutlined, 
  LoadingOutlined,
  DollarOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { 
  initializeFinancialCategories, 
  initializeCoreCategories,
  getAllCategoryTemplates,
} from '@/scripts/initializeFinancialCategories';

const { Title, Paragraph } = Typography;

export const FinancialCategoryInitializer: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const templates = getAllCategoryTemplates();

  const handleInitializeCore = async () => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    try {
      setLoading(true);
      const res = await initializeCoreCategories(user.id);
      setResult(res);
      setInitialized(true);
      
      if (res.created > 0) {
        message.success(`成功创建 ${res.created} 个类别！`);
      } else if (res.skipped > 0) {
        message.info('所有核心类别已存在');
      }
    } catch (error: any) {
      console.error('Core categories initialization failed:', error);
      message.error(`初始化失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeAll = async () => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    try {
      setLoading(true);
      const res = await initializeFinancialCategories(user.id);
      setResult(res);
      setInitialized(true);
      
      if (res.created > 0) {
        message.success(`成功创建 ${res.created} 个类别！`);
      } else if (res.skipped > 0) {
        message.info('所有类别已存在');
      }
    } catch (error: any) {
      console.error('Full categories initialization failed:', error);
      message.error(`初始化失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 标题 */}
        <div>
          <Title level={3}>
            <DollarOutlined /> 财务类别初始化
          </Title>
          <Paragraph>
            批量创建收入和支出类别，支持自动编号和关键词匹配。
          </Paragraph>
        </div>

        {/* 统计信息 */}
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="收入类别"
                value={templates.income.length}
                prefix="💰"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="支出类别"
                value={templates.expense.length}
                prefix="💸"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="总计"
                value={templates.total}
                prefix="📊"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 操作按钮 */}
        {!initialized && (
          <>
            <Alert
              message="初始化说明"
              description={
                <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                  <li><strong>核心类别</strong>：创建15个最常用的类别（推荐首次使用）</li>
                  <li><strong>全部类别</strong>：创建所有37个类别（完整版）</li>
                  <li>已存在的类别会自动跳过，不会重复创建</li>
                  <li>创建后可在"财务类别管理"页面查看和编辑</li>
                </ul>
              }
              type="info"
              showIcon
            />

            <Space size="middle">
              <Button
                type="primary"
                size="large"
                icon={loading ? <LoadingOutlined /> : <RocketOutlined />}
                onClick={handleInitializeCore}
                loading={loading}
              >
                创建核心类别（15个）
              </Button>
              
              <Button
                size="large"
                icon={loading ? <LoadingOutlined /> : <DatabaseOutlined />}
                onClick={handleInitializeAll}
                loading={loading}
              >
                创建全部类别（37个）
              </Button>
            </Space>
          </>
        )}

        {/* 结果显示 */}
        {initialized && result && (
          <Alert
            message="初始化完成"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="总计"
                      value={result.total}
                      prefix="📊"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已创建"
                      value={result.created}
                      prefix="✅"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="已跳过"
                      value={result.skipped}
                      prefix="⏭️"
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="失败"
                      value={result.failed}
                      prefix="❌"
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                </Row>
                
                <div style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => window.location.href = '/settings/financial-categories'}
                  >
                    前往财务类别管理
                  </Button>
                  <Button
                    style={{ marginLeft: 8 }}
                    onClick={() => {
                      setInitialized(false);
                      setResult(null);
                    }}
                  >
                    重置
                  </Button>
                </div>
              </Space>
            }
            type="success"
            showIcon
          />
        )}

        <Divider />

        {/* 类别预览 */}
        <Collapse 
          ghost
          items={[
            {
              key: 'preview',
              label: '📋 预览所有类别',
              children: (
                <div>
                  <Title level={5}>💰 收入类别 ({templates.income.length}个)</Title>
                  <Space wrap>
                    {templates.income.map(cat => (
                      <Tag 
                        key={cat.value} 
                        color="green"
                        style={{ marginBottom: 8, fontFamily: 'monospace' }}
                      >
                        {cat.icon} {cat.value} - {cat.label}
                      </Tag>
                    ))}
                  </Space>

                  <Divider />

                  <Title level={5}>💸 支出类别 ({templates.expense.length}个)</Title>
                  <Space wrap>
                    {templates.expense.map(cat => (
                      <Tag 
                        key={cat.value} 
                        color="red"
                        style={{ marginBottom: 8, fontFamily: 'monospace' }}
                      >
                        {cat.icon} {cat.value} - {cat.label}
                      </Tag>
                    ))}
                  </Space>
                </div>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
};

export default FinancialCategoryInitializer;

