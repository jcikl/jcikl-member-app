import React, { useState } from 'react';
import { Form, Input, Button, Divider, Checkbox, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, GoogleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { globalValidationService } from '@/config';
import './RegisterPage.css';

/**
 * Register Page
 * 注册页面
 */
const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { register, loginWithGoogle } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (values: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    agree: boolean;
  }) => {
    try {
      setLoading(true);

      // Validate password match
      if (values.password !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }

      // Register user
      await register(values.email, values.password, values.name);
      
      message.success('注册成功！账户待管理员审核。');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        message.error('该邮箱已被注册，请直接登录');
      } else if (error.code === 'auth/weak-password') {
        message.error('密码强度不够，至少需要6位字符');
      } else {
        message.error(error.message || '注册失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      message.success('Google 注册成功');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.message && !error.code?.includes('popup-closed')) {
        message.error(error.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>注册新账户</h2>

      {/* Google Registration Button */}
      <Button
        icon={<GoogleOutlined />}
        size="large"
        loading={googleLoading}
        onClick={handleGoogleRegister}
        block
        className="google-login-btn"
      >
        使用 Google 账号注册
      </Button>

      <Divider plain>或使用邮箱注册</Divider>

      {/* Email/Password Registration Form */}
      <Form
        name="register"
        onFinish={handleSubmit}
        autoComplete="off"
        size="large"
        layout="vertical"
      >
        <Form.Item
          name="name"
          label="姓名"
          rules={[
            { required: true, message: '请输入姓名' },
            { min: 2, message: '姓名至少2个字符' },
            { max: 50, message: '姓名最多50个字符' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="请输入您的姓名" />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
            {
              validator: (_, value) => {
                if (!value || globalValidationService.validateEmail(value)) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('邮箱格式不正确'));
              },
            },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="your@email.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少8位字符' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (globalValidationService.validatePassword(value)) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('密码必须包含大小写字母和数字')
                );
              },
            },
          ]}
          help="密码需包含大小写字母和数字，至少8位"
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" />
        </Form.Item>

        <Form.Item
          name="agree"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error('请阅读并同意服务条款')),
            },
          ]}
        >
          <Checkbox>
            我已阅读并同意 <a href="/terms">《服务条款》</a> 和{' '}
            <a href="/privacy">《隐私政策》</a>
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            注册
          </Button>
        </Form.Item>

        <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
          已有账户？ <Link to="/login">立即登录</Link>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterPage;

