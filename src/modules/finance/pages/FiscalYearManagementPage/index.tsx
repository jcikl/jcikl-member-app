/**
 * Fiscal Year Management Page
 * 财年管理页面 - 包含配置和统计功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Alert,
  Space,
  Typography,
  Row,
  Col,
  Progress,
  Tag,
  Divider,
  message,
  List,
  Tabs
} from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  BulbOutlined,
  BarChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import {
  FiscalYearConfig, 
  FiscalYearPeriod, 
  FiscalYearStatus
} from '@/modules/finance/types/fiscalYear';
import { smartFiscalYearService } from '@/modules/finance/services/smartFiscalYearService';
import SmartFiscalYearSelector from '@/modules/finance/components/SmartFiscalYearSelector';

const { Title, Text, Paragraph } = Typography;

const FiscalYearManagementPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('config');
  const [fiscalYearStatus, setFiscalYearStatus] = useState<FiscalYearStatus | null>(null);
  const [historyData, setHistoryData] = useState<FiscalYearPeriod[]>([]);
  
  // 统计相关状态
  const [statisticsType, setStatisticsType] = useState<'fiscal' | 'calendar'>('fiscal');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalYearPeriod | null>(null);

  // 加载财年配置
  useEffect(() => {
    loadFiscalYearConfig();
  }, []);

  const loadFiscalYearConfig = async () => {
    try {
      // 从全局设置或本地存储加载配置
      const savedConfig = localStorage.getItem('fiscalYearConfig');
      let config: FiscalYearConfig;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
      } else {
        // 使用默认配置
        config = {
          id: 'jci-kl-fy',
          name: 'JCI KL 财年',
          startMonth: 10,
          startDay: 1,
          isActive: true,
          isDefault: true,
          description: 'JCI KL 财年从每年10月1日开始',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      smartFiscalYearService.setConfig(config);
      form.setFieldsValue({
        startMonth: config.startMonth,
        startDay: config.startDay,
        name: config.name,
        description: config.description
      });
      
      // 检测财年状态
      const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
      setFiscalYearStatus(status);
      
      // 加载历史数据
      const history = smartFiscalYearService.getFiscalYearHistory(5);
      setHistoryData(history);
    } catch (error) {
      console.error('Failed to load fiscal year config:', error);
      message.error('加载财年配置失败');
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // 验证配置
      const config: FiscalYearConfig = {
        id: 'jci-kl-fy',
        name: values.name || 'JCI KL 财年',
        startMonth: values.startMonth,
        startDay: values.startDay,
        isActive: true,
        isDefault: true,
        description: values.description || `财年从每年${values.startMonth}月${values.startDay}日开始`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const validation = smartFiscalYearService.validateConfig(config);
      if (!validation.isValid) {
        message.error(`配置验证失败: ${validation.errors.join(', ')}`);
        return;
      }

      // 保存到本地存储（实际项目中应该保存到后端）
      localStorage.setItem('fiscalYearConfig', JSON.stringify(config));
      
      // 更新服务配置
      smartFiscalYearService.setConfig(config);
      
      // 重新检测财年状态
      const status = smartFiscalYearService.detectCurrentFiscalYearStatus();
      setFiscalYearStatus(status);
      
      // 重新加载历史数据
      const history = smartFiscalYearService.getFiscalYearHistory(5);
      setHistoryData(history);
      
      message.success('财年配置保存成功');
    } catch (error) {
      console.error('Failed to save fiscal year config:', error);
      message.error('保存财年配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue({
      startMonth: 10,
      startDay: 1,
      name: 'JCI KL 财年',
      description: 'JCI KL 财年从每年10月1日开始'
    });
  };

  const getStatusIcon = (period: FiscalYearPeriod) => {
    if (period.isCompleted) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    } else if (period.isCurrent) {
      return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
    } else {
      return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (period: FiscalYearPeriod) => {
    if (period.isCompleted) return 'success';
    if (period.isCurrent) return 'processing';
    return 'default';
  };

  // 统计相关函数
  const handleFiscalYearChange = async (period: FiscalYearPeriod) => {
    setSelectedPeriod(period);
    console.log('Selected fiscal year period:', period);
  };

  const handleStatisticsTypeChange = (type: 'fiscal' | 'calendar') => {
    setStatisticsType(type);
    console.log('Statistics type changed to:', type);
  };

  const handleExportReport = () => {
    console.log('Exporting report for period:', selectedPeriod);
    message.info('导出功能开发中');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined style={{ marginRight: 8 }} />
        财年管理
      </Title>

      <Paragraph type="secondary">
        配置财年设置并查看财年统计报告
      </Paragraph>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Tab 1: 财年配置 */}
        <Tabs.TabPane tab={<span><SettingOutlined />财年配置</span>} key="config">
          <Row gutter={24}>
            {/* 财年配置 */}
            <Col span={16}>
              <Card title="财年设置" style={{ marginBottom: 24 }}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                  initialValues={{
                    startMonth: 10,
                    startDay: 1,
                    name: 'JCI KL 财年',
                    description: 'JCI KL 财年从每年10月1日开始'
                  }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="name"
                        label="财年名称"
                        rules={[{ required: true, message: '请输入财年名称' }]}
                      >
                        <Input
                          style={{ width: '100%' }}
                          placeholder="如：JCI KL 财年"
                          disabled
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="description"
                        label="描述"
                      >
                        <Input
                          style={{ width: '100%' }}
                          placeholder="财年描述信息"
                          disabled
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="startMonth"
                        label="起始月份"
                        rules={[{ required: true, message: '请选择起始月份' }]}
                      >
                        <InputNumber
                          min={1}
                          max={12}
                          style={{ width: '100%' }}
                          placeholder="月份"
                          addonAfter="月"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="startDay"
                        label="起始日期"
                        rules={[{ required: true, message: '请选择起始日期' }]}
                      >
                        <InputNumber
                          min={1}
                          max={31}
                          style={{ width: '100%' }}
                          placeholder="日期"
                          addonAfter="日"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Alert
                    message="配置说明"
                    description="设置财年的起始月份和日期后，系统将自动计算每年的财年范围。例如：设置10月1日，则2024年财年为2024-10-01至2025-09-30。"
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        保存配置
                      </Button>
                      <Button onClick={handleReset}>
                        重置
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* 当前财年状态 */}
            <Col span={8}>
              <Card title="当前财年状态" style={{ marginBottom: 24 }}>
                {fiscalYearStatus?.currentPeriod ? (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                          {fiscalYearStatus.currentPeriod.displayName}
                        </Title>
                        <Text type="secondary">
                          {fiscalYearStatus.currentPeriod.startDate} 至 {fiscalYearStatus.currentPeriod.endDate}
                        </Text>
                      </div>

                      <Divider />

                      <div>
                        <Text strong>财年进度</Text>
                        <Progress 
                          percent={fiscalYearStatus.currentPeriod.progressPercentage}
                          status="active"
                          strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#87d068',
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {fiscalYearStatus.currentPeriod.daysElapsed} 天 / {fiscalYearStatus.currentPeriod.totalDays} 天
                        </Text>
                      </div>

                      <div>
                        <Text strong>剩余天数</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                          {fiscalYearStatus.currentPeriod.daysRemaining} 天
                        </div>
                      </div>

                      <Alert
                        message="财年状态"
                        description={`当前正在${fiscalYearStatus.currentPeriod.displayName}，进度 ${fiscalYearStatus.currentPeriod.progressPercentage}%`}
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                      />
                    </Space>
                  </div>
                ) : (
                  <Alert
                    message="未检测到当前财年"
                    description="请检查财年配置是否正确"
                    type="warning"
                    showIcon
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* 智能建议 */}
          {fiscalYearStatus?.suggestions && fiscalYearStatus.suggestions.length > 0 && (
            <Card title="智能建议" style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {fiscalYearStatus.suggestions.map((suggestion: any, index: number) => (
                  <Alert
                    key={index}
                    message={suggestion.reason}
                    description={`建议查看 ${suggestion.period.displayName} 的数据`}
                    type={suggestion.priority === 'high' ? 'success' : suggestion.priority === 'medium' ? 'info' : 'warning'}
                    showIcon
                    icon={<BulbOutlined />}
                  />
                ))}
              </Space>
            </Card>
          )}

          {/* 财年预览 */}
          <Card title="财年预览">
            <List
              dataSource={historyData}
              renderItem={(period) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={getStatusIcon(period)}
                    title={
                      <Space>
                        <Text strong={period.isCurrent}>{period.displayName}</Text>
                        <Tag color={getStatusColor(period)}>
                          {period.isCompleted ? '已完成' : period.isCurrent ? '进行中' : '未开始'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text type="secondary">
                          {period.startDate} 至 {period.endDate}
                        </Text>
                        {period.isCurrent && (
                          <Progress 
                            percent={period.progressPercentage} 
                            size="small" 
                            status="active"
                            format={(percent) => `${percent}% (剩余 ${period.daysRemaining} 天)`}
                          />
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>

        {/* Tab 2: 财年统计 */}
        <Tabs.TabPane tab={<span><BarChartOutlined />财年统计</span>} key="statistics">
          <Row gutter={24}>
            {/* 左侧：财年选择器 */}
            <Col span={8}>
              <SmartFiscalYearSelector
                onFiscalYearChange={handleFiscalYearChange}
                onStatisticsTypeChange={handleStatisticsTypeChange}
                defaultStatisticsType={statisticsType}
                showSuggestions={true}
                showProgress={true}
              />
            </Col>

            {/* 右侧：统计卡片 */}
            <Col span={16}>
              {selectedPeriod ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* 主要统计卡片 */}
                  <Card title={`${selectedPeriod.displayName} 统计报告`}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {/* 当前选择显示 */}
                      <Alert
                        message="当前统计设置"
                        description={
                          <Space direction="vertical">
                            <Text>
                              统计类型: <Text strong>{statisticsType === 'fiscal' ? '财年' : '自然年'}</Text>
                            </Text>
                            <Text>
                              日期范围: <Text strong>{selectedPeriod.startDate} 至 {selectedPeriod.endDate}</Text>
                            </Text>
                            <Text>
                              财年进度: <Text strong>{selectedPeriod.progressPercentage}%</Text>
                              {selectedPeriod.isCurrent && (
                                <Text type="secondary"> (剩余 {selectedPeriod.daysRemaining} 天)</Text>
                              )}
                            </Text>
                          </Space>
                        }
                        type="info"
                        showIcon
                        icon={<CalendarOutlined />}
                      />

                      {/* 模拟统计卡片 */}
                      <Row gutter={16}>
                        <Col span={8}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                                RM 125,430
                              </div>
                              <Text type="secondary">总收入</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                                RM 98,750
                              </div>
                              <Text type="secondary">总支出</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card size="small">
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                                RM 26,680
                              </div>
                              <Text type="secondary">净收入</Text>
                            </div>
                          </Card>
                        </Col>
                      </Row>

                      {/* 操作按钮 */}
                      <Space>
                        <Button type="primary" icon={<BarChartOutlined />}>
                          生成报告
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
                          导出报告
                        </Button>
                        <Button icon={<PrinterOutlined />} onClick={handlePrintReport}>
                          打印报告
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Space>
              ) : (
                <Card>
                  <Alert
                    message="请选择财年或年份"
                    description="使用左侧的选择器选择要查看的财年或年份，系统将自动生成相应的统计报告。"
                    type="info"
                    showIcon
                    icon={<CalendarOutlined />}
                  />
                </Card>
              )}
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default FiscalYearManagementPage;
