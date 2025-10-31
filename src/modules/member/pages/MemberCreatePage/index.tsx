/**
 * Member Create Page
 * 会员创建页面
 */

import React, { useState } from 'react';
import { Card, message, Form, Input, DatePicker, Select, Row, Col, Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';


// Components
import { PageHeader, PermissionGuard } from '@/components';

// Services
import { createMember, checkEmailExists, checkPhoneExists } from '../../services/memberService';
import { useAuthStore } from '@/stores/authStore';

// Types
import type { MemberFormData } from '../../types';

/**
 * Member Create Page Component
 * 会员创建页面组件
 */
export const MemberCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleBack = () => {
    navigate('/members');
  };

  const statusOptions = [
    { label: '待审核', value: 'pending' },
    { label: '活跃', value: 'active' },
    { label: '非活跃', value: 'inactive' },
    { label: '暂停', value: 'suspended' },
  ];
  const levelOptions = [
    { label: '铜级', value: 'bronze' },
    { label: '银级', value: 'silver' },
    { label: '金级', value: 'gold' },
    { label: '钻石级', value: 'diamond' },
  ];

  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error('用户未登录');
      return;
    }

    setLoading(true);
    try {
      // 验证邮箱唯一性
      if (values.email) {
        const emailExists = await checkEmailExists(values.email);
        if (emailExists) {
          message.error('该邮箱已被使用');
          return;
        }
      }

      // 验证电话唯一性
      if (values.phone) {
        const phoneExists = await checkPhoneExists(values.phone);
        if (phoneExists) {
          message.error('该电话号码已被使用');
          return;
        }
      }

      // 创建会员数据
      const memberData: MemberFormData = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        memberId: values.memberId,
        category: values.category, // 实际将由自动分类逻辑接管
        status: values.status || 'pending',
        level: values.level || 'bronze',
        chapter: values.chapter,
        avatar: values.avatar,
        birthDate: values.birthDate,
        gender: values.gender,
        company: values.company,
        departmentAndPosition: values.departmentAndPosition,
        joinDate: values.joinDate || new Date().toISOString(),
      };

      await createMember(memberData, user.id || '');
      message.success('会员创建成功');
      navigate('/members');
    } catch (error) {
      console.error('创建会员失败:', error);
      message.error('创建会员失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permissions="MEMBER_CREATE">
      <div>
        <PageHeader
          title="创建会员"
          onBack={handleBack}
        />
        
        <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={loading} style={{ marginTop: 16 }}>
          {/* Profile Card - 与详情页结构一致 */}
          <Card title="📋 基本信息" className="content-card" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }, { min: 2, message: '姓名至少2个字符' }]}>
                  <Input placeholder="请输入姓名" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="memberId" label="会员编号">
                  <Input placeholder="自动生成或手动输入" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}>
                  <Input placeholder="邮箱" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                  <Input placeholder="电话" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="status" label="状态" initialValue="pending">
                  <Select options={statusOptions} placeholder="选择状态" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="level" label="级别" initialValue="bronze">
                  <Select options={levelOptions} placeholder="选择级别" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="chapter" label="分会">
                  <Input placeholder="分会名称" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="birthDate" label="生日">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="gender" label="性别">
                  <Select options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]} placeholder="选择性别" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Career / Business - 与详情页版块呼应 */}
          <Card title="💼 职业与商业" className="content-card" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Form.Item name="company" label="公司名称">
                  <Input placeholder="公司名称" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="departmentAndPosition" label="部门与职位">
                  <Input placeholder="部门与职位" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="joinDate" label="入会日期">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleBack}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>创建</Button>
          </div>
        </Form>
      </div>
    </PermissionGuard>
  );
};

export default MemberCreatePage;