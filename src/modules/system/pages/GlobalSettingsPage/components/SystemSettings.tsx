import React from 'react';
import { Form, InputNumber, Select, Button, Space, Card, Descriptions, Row, Col } from 'antd';
import { GLOBAL_SYSTEM_CONFIG } from '@/config';

/**
 * System Settings Panel
 * 系统设置面板
 */
const SystemSettings: React.FC = () => {
  return (
    <div className="settings-panel">
      <Card title="系统信息" type="inner" style={{ marginBottom: 12 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="系统名称">
            {GLOBAL_SYSTEM_CONFIG.SYSTEM_NAME}
          </Descriptions.Item>
          <Descriptions.Item label="系统版本">
            {GLOBAL_SYSTEM_CONFIG.SYSTEM_VERSION}
          </Descriptions.Item>
          <Descriptions.Item label="中文名称">
            {GLOBAL_SYSTEM_CONFIG.SYSTEM_NAME_CN}
          </Descriptions.Item>
          <Descriptions.Item label="默认语言">
            {GLOBAL_SYSTEM_CONFIG.SYSTEM_LOCALE}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="系统配置" type="inner">
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="缓存时长（秒）" style={{ marginBottom: 12 }}>
                <InputNumber
                  defaultValue={GLOBAL_SYSTEM_CONFIG.CACHE_DURATION / 1000}
                  min={60}
                  max={3600}
                  step={60}
                  style={{ width: '100%' }}
                  addonAfter="秒"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item label="会话超时时间（分钟）" style={{ marginBottom: 12 }}>
                <InputNumber
                  defaultValue={GLOBAL_SYSTEM_CONFIG.SESSION.TIMEOUT / 60000}
                  min={5}
                  max={120}
                  step={5}
                  style={{ width: '100%' }}
                  addonAfter="分钟"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item label="最大文件上传大小（MB）" style={{ marginBottom: 12 }}>
                <InputNumber
                  defaultValue={GLOBAL_SYSTEM_CONFIG.MAX_FILE_SIZE / 1024 / 1024}
                  min={1}
                  max={50}
                  step={1}
                  style={{ width: '100%' }}
                  addonAfter="MB"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item label="最大图片上传大小（MB）" style={{ marginBottom: 12 }}>
                <InputNumber
                  defaultValue={GLOBAL_SYSTEM_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}
                  min={1}
                  max={20}
                  step={1}
                  style={{ width: '100%' }}
                  addonAfter="MB"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item label="默认分页大小" style={{ marginBottom: 12 }}>
                <Select
                  defaultValue={GLOBAL_SYSTEM_CONFIG.DEFAULT_PAGE_SIZE}
                  style={{ width: '100%' }}
                  options={GLOBAL_SYSTEM_CONFIG.PAGE_SIZE_OPTIONS.map(size => ({
                    label: `${size} 条/页`,
                    value: size,
                  }))}
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

export default SystemSettings;

