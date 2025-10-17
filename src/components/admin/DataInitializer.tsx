import React, { useState } from 'react';
import { Button, Card, message, Space, Typography, Divider, List } from 'antd';
import { DatabaseOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { seedDatabase } from '@/scripts/seedDatabase';

const { Title, Text, Paragraph } = Typography;

/**
 * Data Initializer Component
 * 数据初始化组件
 * 
 * 用于初始化Firestore数据库的基础数据
 */
export const DataInitializer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const handleInitialize = async () => {
    try {
      setLoading(true);
      await seedDatabase();
      setInitialized(true);
      message.success('数据库初始化成功！');
    } catch (error: any) {
      console.error('Database initialization failed:', error);
      message.error(`数据库初始化失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const initializationSteps = [
    {
      title: '会员分类',
      description: '创建Official Member、Associate Member、Honorary Member、Visiting Member等分类',
    },
    {
      title: '会员职务',
      description: '创建主席、副主席、秘书、财务、普通会员等职务',
    },
    {
      title: '管理员账户',
      description: '创建系统管理员账户 (admin@jcikl.org)',
    },
    {
      title: '示例会员',
      description: '创建3个示例会员数据用于测试',
    },
    {
      title: '全局设置',
      description: '初始化主题设置、组件配置、日期格式等系统配置',
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>
            <DatabaseOutlined /> 数据库初始化
          </Title>
          <Paragraph>
            此功能将初始化Firestore数据库的基础数据，包括会员分类、职务、管理员账户和示例数据。
          </Paragraph>
        </div>

        {!initialized && (
          <>
            <div>
              <Text strong>初始化内容：</Text>
              <List
                size="small"
                dataSource={initializationSteps}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </div>

            <Divider />

            <Button
              type="primary"
              size="large"
              icon={loading ? <LoadingOutlined /> : <DatabaseOutlined />}
              loading={loading}
              onClick={handleInitialize}
              disabled={loading}
            >
              {loading ? '正在初始化...' : '开始初始化数据库'}
            </Button>
          </>
        )}

        {initialized && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#52c41a' }}>
              数据库初始化完成！
            </Title>
            <Text type="secondary">
              所有基础数据已成功创建，您现在可以开始使用系统了。
            </Text>
          </div>
        )}

        <Divider />

        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>注意事项：</strong><br />
            • 初始化操作只会创建不存在的数据，不会覆盖现有数据<br />
            • 如果数据已存在，将跳过相应的初始化步骤<br />
            • 建议在生产环境部署前完成初始化
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default DataInitializer;
