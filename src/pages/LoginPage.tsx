import React, { useState } from 'react';
import { Form, Input, Button, Divider, App } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import './LoginPage.css';

/**
 * Login Page
 * 登录页面
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { login, loginWithGoogle } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      await login(values.email, values.password);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      message.success('Google 登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      // Error message already set in store
      if (error.message && !error.code?.includes('popup-closed')) {
        message.error(error.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>会员登录</h2>

      {/* Google Login Button */}
      <Button
        icon={<GoogleOutlined />}
        size="large"
        loading={googleLoading}
        onClick={handleGoogleLogin}
        block
        className="google-login-btn"
      >
        使用 Google 账号登录
      </Button>

      <Divider plain>或使用邮箱登录</Divider>

      {/* Email/Password Login Form */}
      <Form name="login" onFinish={handleSubmit} autoComplete="off" size="large">
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="邮箱" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form.Item>

        <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
          还没有账户？ <Link to="/register">立即注册</Link>
        </Form.Item>
      </Form>
    </div>
  );
};

export default LoginPage;


