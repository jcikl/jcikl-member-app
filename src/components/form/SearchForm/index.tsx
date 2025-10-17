import React from 'react';
import { Form, Input, Button, Space, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

export interface SearchField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date';
  placeholder?: string;
  options?: { label: string; value: any }[];
}

interface SearchFormProps {
  fields: SearchField[];
  onSearch: (values: any) => void;
  onReset?: () => void;
  loading?: boolean;
}

/**
 * Search Form Component
 * 搜索表单组件
 */
export const SearchForm: React.FC<SearchFormProps> = ({
  fields,
  onSearch,
  onReset,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleReset = () => {
    form.resetFields();
    onReset?.();
  };

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={onSearch}
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        {fields.map(field => (
          <Col key={field.name} xs={24} sm={12} md={8} lg={6}>
            <Form.Item name={field.name} label={field.label} style={{ marginBottom: 0 }}>
              <Input placeholder={field.placeholder} />
            </Form.Item>
          </Col>
        ))}
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={loading}
            >
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );
};

export default SearchForm;


