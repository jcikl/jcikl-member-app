/**
 * Event Form Component
 * 活动表单组件
 */

import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  Row,
  Col,
  Upload,
  App,
} from 'antd';
import { SaveOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import type { Event, EventFormData } from '../../types';
import {
  EVENT_STATUS_OPTIONS,
  EVENT_LEVEL_OPTIONS,
  EVENT_CATEGORY_OPTIONS,
} from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';
import { GLOBAL_VALIDATION_CONFIG } from '@/config/globalValidationSettings';
// Removed date/pricing controls for Basic tab only

const { TextArea } = Input;
const { Option } = Select;

interface EventFormProps {
  initialValues?: Partial<Event>;
  onSubmit: (values: EventFormData) => Promise<void>;
  onCancel: () => void;
  submitText?: string;
  loading?: boolean;
}

/**
 * Event Form Component
 */
const EventForm: React.FC<EventFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitText = '提交',
  loading = false,
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
      });
    }
  }, [initialValues, form]);

  const handleSubmit = async (values: any) => {
    try {
      const formData: EventFormData = {
        name: values.name,
        description: values.description,
        status: values.status,
        level: values.level,
        category: values.category,
        organizerName: values.organizerName,
        coOrganizers: values.coOrganizers,
        contactPerson: values.contactPerson,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,
        posterImage: values.posterImage,
      };

      await onSubmit(formData);
    } catch (error) {
      message.error('提交表单失败');
      console.error(error);
    }
  };

  const formConfig = globalComponentService.getFormConfig();

  return (
    <Form
      form={form}
      {...formConfig}
      onFinish={handleSubmit}
      className="event-form"
    >
      <Card title="基本信息" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="活动名称"
              name="name"
              rules={[
                { required: true, message: '请输入活动名称' },
                { 
                  min: 3,
                  message: '活动名称至少3个字符' 
                },
              ]}
            >
              <Input placeholder="请输入活动名称" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="活动类型"
              name="category"
            >
              <Select placeholder="选择活动类型">
                {EVENT_CATEGORY_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="活动描述"
          name="description"
        >
          <TextArea rows={4} placeholder="请输入活动描述" />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.posterImage !== currentValues.posterImage
          }
        >
          {({ getFieldValue, setFieldsValue }) => (
            <Form.Item
              label="活动海报"
              name="posterImage"
            >
              <Upload
                listType="picture-card"
                showUploadList={true}
                beforeUpload={() => false}
                onChange={(info) => {
                  if (info.file) {
                    // 这里应该上传到云存储并获取URL
                    setFieldsValue({ posterImage: info.file.name });
                  }
                }}
                fileList={getFieldValue('posterImage') ? [{
                  uid: '1',
                  name: getFieldValue('posterImage'),
                  status: 'done',
                  url: getFieldValue('posterImage'),
                }] : []}
              >
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传海报</div>
                </div>
              </Upload>
            </Form.Item>
          )}
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="活动状态"
              name="status"
              initialValue="Draft"
            >
              <Select>
                {EVENT_STATUS_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="活动级别"
              name="level"
              initialValue="Local"
            >
              <Select>
                {EVENT_LEVEL_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 已按需求从基本信息页移除了“日期时间/地点信息/价格信息/参与信息” */}

      <Card title="组织者信息" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="组织者名称"
              name="organizerName"
              rules={[{ required: true, message: '请输入组织者名称' }]}
            >
              <Input placeholder="请输入组织者名称" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="协办组织"
              name="coOrganizers"
            >
              <Select
                mode="tags"
                placeholder="输入协办组织名称，按回车添加"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="联系人"
              name="contactPerson"
            >
              <Input placeholder="请输入联系人姓名" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="联系电话"
              name="contactPhone"
              rules={[
                {
                  pattern: GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.phone.MY,
                  message: '请输入有效的电话号码',
                },
              ]}
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="联系邮箱"
              name="contactEmail"
              rules={[
                {
                  pattern: GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.email,
                  message: '请输入有效的邮箱地址',
                },
              ]}
            >
              <Input placeholder="请输入联系邮箱" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />}
            loading={loading}
          >
            {submitText}
          </Button>
          <Button 
            icon={<CloseOutlined />}
            onClick={onCancel}
          >
            取消
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EventForm;

