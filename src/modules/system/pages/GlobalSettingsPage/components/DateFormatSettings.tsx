import React from 'react';
import { Form, Select, Button, Space, Card, Typography, Row, Col } from 'antd';
import { globalDateService } from '@/config';

const { Text } = Typography;

/**
 * Date Format Settings Panel
 * 日期格式面板
 */
const DateFormatSettings: React.FC = () => {
  const currentDate = new Date();

  return (
    <div className="settings-panel">
      <Card title="日期格式配置" type="inner">
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="显示格式(Display Format)" style={{ marginBottom: 12 }}>
                <Select
                  defaultValue="DD-MMM-YYYY"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'DD-MMM-YYYY (01-Jan-2024)', value: 'DD-MMM-YYYY' },
                    { label: 'YYYY-MM-DD (2024-01-01)', value: 'YYYY-MM-DD' },
                    { label: 'DD/MM/YYYY (01/01/2024)', value: 'DD/MM/YYYY' },
                    { label: 'MM/DD/YYYY (01/01/2024)', value: 'MM/DD/YYYY' },
                  ]}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  预览: {globalDateService.formatDate(currentDate, 'display')}
                </Text>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="API 格式(API Format)" style={{ marginBottom: 12 }}>
                <Select
                  defaultValue="YYYY-MM-DD"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
                    { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
                  ]}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  预览: {globalDateService.formatDate(currentDate, 'api')}
                </Text>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="日期时间格式(Datetime Format)" style={{ marginBottom: 12 }}>
                <Select
                  defaultValue="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
                    { label: 'DD-MMM-YYYY HH:mm', value: 'DD-MMM-YYYY HH:mm' },
                  ]}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  预览: {globalDateService.formatDate(currentDate, 'datetime')}
                </Text>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="时区(Timezone)" style={{ marginBottom: 12 }}>
                <Select
                  defaultValue="Asia/Kuala_Lumpur"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Asia/Kuala_Lumpur (UTC+8)', value: 'Asia/Kuala_Lumpur' },
                    { label: 'Asia/Shanghai (UTC+8)', value: 'Asia/Shanghai' },
                    { label: 'Asia/Singapore (UTC+8)', value: 'Asia/Singapore' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div style={{ marginTop: 12 }}>
        <Space>
          <Button type="primary">保存配置</Button>
          <Button>恢复默认</Button>
        </Space>
      </div>
    </div>
  );
};

export default DateFormatSettings;

