import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, Space, Result, Progress, message } from 'antd';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
import type { QuickCreateModalProps, QuickFormField } from './types';

// 样式
import './styles.css';

const { TextArea } = Input;

/**
 * QuickCreateModal Component
 * 快速创建弹窗组件
 */
export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  visible,
  onClose,
  title,
  fields,
  onSubmit,
  onSuccess,
  initialValues,
  twoStep = false,
  loading = false,
  className = '',
}) => {
  const [form] = Form.useForm();
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const formConfig = globalComponentService.getFormConfig();

  /**
   * 自动保存草稿
   */
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const values = form.getFieldsValue();
      localStorage.setItem('quick-create-draft', JSON.stringify(values));
    }, 30000); // 每30秒保存

    return () => clearInterval(interval);
  }, [visible, form]);

  /**
   * 处理提交
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const id = await onSubmit(values);
      setCreatedId(id);
      setShowSuccess(true);
      
      // 清除草稿
      localStorage.removeItem('quick-create-draft');
      message.success('创建成功！');

      if (onSuccess) {
        onSuccess(id);
      }
    } catch (error) {
      console.error('创建失败:', error);
      message.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 渲染表单字段
   */
  const renderField = (field: QuickFormField) => {
    switch (field.type) {
      case 'textarea':
        return <TextArea rows={4} placeholder={field.placeholder} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />;
      case 'select':
        return <Select options={field.options} placeholder={field.placeholder} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} placeholder={field.placeholder} />;
      default:
        return <Input placeholder={field.placeholder} />;
    }
  };

  /**
   * 重置并关闭
   */
  const handleClose = () => {
    form.resetFields();
    setStep(1);
    setShowSuccess(false);
    setCreatedId('');
    onClose();
  };

  if (showSuccess) {
    return (
      <Modal
        open={visible}
        onCancel={handleClose}
        footer={null}
        className={`quick-create-modal ${className}`}
      >
        <Result
          status="success"
          title="创建成功！"
          subTitle={`ID: ${createdId}`}
          extra={[
            <Button key="view" onClick={() => {/* 跳转详情 */}}>
              查看详情
            </Button>,
            <Button key="another" type="primary" onClick={() => setShowSuccess(false)}>
              再创建一个
            </Button>,
          ]}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={visible}
      title={title}
      onCancel={handleClose}
      footer={null}
      width={640}
      className={`quick-create-modal ${className}`}
    >
      {twoStep && (
        <div className="quick-create-modal__progress">
          <div className="quick-create-modal__step-info">
            <span>步骤 {step} / 2</span>
            <span className="quick-create-modal__draft">草稿已保存</span>
          </div>
          <Progress percent={step * 50} showInfo={false} />
        </div>
      )}

      <Form form={form} {...formConfig} initialValues={initialValues}>
        {fields.map(field => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={[
              { required: field.required, message: `请输入${field.label}` },
              ...(field.rules || []),
            ]}
          >
            {renderField(field)}
          </Form.Item>
        ))}

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>取消</Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting || loading}>
              {twoStep && step < 2 ? '下一步' : '创建'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <div className="quick-create-modal__tip">
        <span>提示: 按 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 快速提交</span>
      </div>
    </Modal>
  );
};

export default QuickCreateModal;

