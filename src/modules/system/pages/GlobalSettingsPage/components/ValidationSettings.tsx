import React from 'react';
import { Form, Input, Button, Space, Card, Row, Col } from 'antd';
import { GLOBAL_VALIDATION_CONFIG } from '@/config';

/**
 * Validation Settings Panel
 * 验证规则面板
 */
const ValidationSettings: React.FC = () => {
  return (
    <div className="settings-panel">
      <Card title="当前验证规则" type="inner">
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="邮箱验证规则" style={{ marginBottom: 12 }}>
                <Input
                  value={GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.email.toString()}
                  disabled
                  addonAfter="Regex"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="密码验证规则" style={{ marginBottom: 12 }}>
                <Input
                  value={GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.password.toString()}
                  disabled
                  addonAfter="Regex"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="会员ID格式" style={{ marginBottom: 12 }}>
                <Input
                  value={GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.memberId.toString()}
                  disabled
                  addonAfter="Regex"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="交易编号格式" style={{ marginBottom: 12 }}>
                <Input
                  value={GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.transactionNumber.toString()}
                  disabled
                  addonAfter="Regex"
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

export default ValidationSettings;


