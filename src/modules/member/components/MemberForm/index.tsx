/**
 * Member Form Component
 * 会员表单组件(用于创建和编辑)
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  message,
  Card,
  Row,
  Col,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ImageUpload } from '@/components';
import { GLOBAL_VALIDATION_CONFIG } from '@/config/globalValidationSettings';
import type { Member, MemberFormData } from '../../types';
import {
  MEMBER_STATUS_OPTIONS,
  MEMBER_CATEGORY_OPTIONS,
  MEMBER_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  INDUSTRY_OPTIONS,
  BUSINESS_CATEGORY_OPTIONS,
} from '../../types';
import {
  createMember,
  updateMember,
  checkEmailExists,
  checkPhoneExists,
} from '../../services/memberService';
import { useAuthStore } from '@/stores/authStore';
import { handleAsyncOperation } from '@/utils/errorHelpers';

interface MemberFormProps {
  member?: Member | null;
  mode: 'create' | 'edit';
}

/**
 * Member Form Component
 */
const MemberForm: React.FC<MemberFormProps> = ({ member, mode }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Initialize form with member data (edit mode)
  useEffect(() => {
    if (member && mode === 'edit') {
      form.setFieldsValue({
        name: member.name,
        email: member.email,
        phone: member.phone,
        memberId: member.memberId,
        category: member.category,
        status: member.status,
        level: member.level,
        chapter: member.chapter,
        chapterId: member.chapterId,
        avatar: member.profile.avatar,
        birthDate: member.profile.birthDate ? dayjs(member.profile.birthDate, 'DD-MMM-YYYY') : null,
        gender: member.profile.gender,
        company: member.profile.company,
        departmentAndPosition: member.profile.departmentAndPosition,
        companyIntro: member.profile.companyIntro,
        ownIndustry: member.profile.ownIndustry,
        interestedIndustries: member.profile.interestedIndustries,
        businessCategories: member.profile.businessCategories,
        acceptInternationalBusiness: member.profile.acceptInternationalBusiness,
        joinDate: member.joinDate ? dayjs(member.joinDate) : null,
      });
    }
  }, [member, mode, form]);

  // Handle form submission
  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error('用户未登录');
      return;
    }

    setLoading(true);

    try {
      // Validate email uniqueness
      if (mode === 'create' || (member && values.email !== member.email)) {
        const emailExists = await checkEmailExists(values.email, member?.id);
        if (emailExists) {
          message.error('该邮箱已被使用');
          setLoading(false);
          return;
        }
      }

      // Validate phone uniqueness
      if (mode === 'create' || (member && values.phone !== member.phone)) {
        const phoneExists = await checkPhoneExists(values.phone, member?.id);
        if (phoneExists) {
          message.error('该电话已被使用');
          setLoading(false);
          return;
        }
      }

      // Prepare form data
      const formData: MemberFormData = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        memberId: values.memberId,
        category: values.category,
        status: values.status,
        level: values.level,
        chapter: values.chapter,
        chapterId: values.chapterId,
        avatar: values.avatar,
        birthDate: values.birthDate ? values.birthDate.format('DD-MMM-YYYY') : undefined,
        gender: values.gender,
        company: values.company,
        departmentAndPosition: values.departmentAndPosition,
        joinDate: values.joinDate ? values.joinDate.toISOString() : undefined,
      };

      let result;
      if (mode === 'create') {
        result = await handleAsyncOperation(
          () => createMember(formData, user.id),
          '会员创建成功',
          '会员创建失败'
        );
      } else if (member) {
        result = await handleAsyncOperation(
          () => updateMember(member.id, formData, user.id),
          '会员更新成功',
          '会员更新失败'
        );
      }

      if (result) {
        navigate('/members');
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/members');
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
      initialValues={{
        status: 'pending',
        level: 'bronze',
      }}
    >
      {/* Basic Information */}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="姓名"
              name="name"
              rules={[
                { required: true, message: '请输入姓名' },
                { min: 2, message: '姓名至少2个字符' },
                { max: 50, message: '姓名最多50个字符' },
              ]}
            >
              <Input placeholder="请输入姓名" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="会员ID"
              name="memberId"
              rules={[
                { required: mode === 'create', message: '请输入会员ID' },
              ]}
            >
              <Input placeholder="自动生成或手动输入" disabled={mode === 'edit'} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { 
                  pattern: GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.email,
                  message: '请输入有效的邮箱地址' 
                },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="电话"
              name="phone"
              rules={[
                { required: true, message: '请输入电话' },
                {
                  pattern: GLOBAL_VALIDATION_CONFIG.VALIDATION_RULES.phone.MY,
                  message: '请输入有效的电话号码'
                },
              ]}
            >
              <Input placeholder="请输入电话" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="性别"
              name="gender"
            >
              <Select placeholder="请选择性别" options={GENDER_OPTIONS} allowClear />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="出生日期"
              name="birthDate"
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD-MMM-YYYY"
                placeholder="请选择出生日期"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="加入日期"
              name="joinDate"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="请选择加入日期"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Membership Information */}
      <Card title="会籍信息" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态" options={MEMBER_STATUS_OPTIONS} />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="分类"
              name="category"
            >
              <Select placeholder="请选择分类" options={MEMBER_CATEGORY_OPTIONS} allowClear />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="级别"
              name="level"
              rules={[{ required: true, message: '请选择级别' }]}
            >
              <Select placeholder="请选择级别" options={MEMBER_LEVEL_OPTIONS} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="分会"
              name="chapter"
            >
              <Input placeholder="请输入分会名称" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="分会ID"
              name="chapterId"
            >
              <Input placeholder="请输入分会ID" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Career & Business */}
      <Card title="职业与商业" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="公司"
              name="company"
            >
              <Input placeholder="请输入公司名称" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="部门与职位"
              name="departmentAndPosition"
            >
              <Input placeholder="请输入部门与职位" />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label="公司介绍"
              name="companyIntro"
            >
              <Input.TextArea placeholder="请输入公司介绍" rows={3} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="所属行业"
              name="ownIndustry"
            >
              <Select
                mode="multiple"
                placeholder="请选择所属行业"
                options={INDUSTRY_OPTIONS}
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="感兴趣行业"
              name="interestedIndustries"
            >
              <Select
                mode="multiple"
                placeholder="请选择感兴趣行业"
                options={INDUSTRY_OPTIONS}
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="商业类别"
              name="businessCategories"
            >
              <Select
                mode="multiple"
                placeholder="请选择商业类别"
                options={BUSINESS_CATEGORY_OPTIONS}
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="接受国际业务"
              name="acceptInternationalBusiness"
            >
              <Select
                placeholder="请选择"
                options={[
                  { label: '是', value: 'Yes' },
                  { label: '否', value: 'No' },
                  { label: '愿意探索', value: 'Willing to explore' },
                ]}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Profile Picture */}
      <Card title="头像" style={{ marginBottom: 16 }}>
        <Form.Item
          label="上传头像"
          name="avatar"
        >
          <ImageUpload />
        </Form.Item>
      </Card>

      {/* Form Actions */}
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} size="large">
            {mode === 'create' ? '创建会员' : '更新会员'}
          </Button>
          <Button onClick={handleCancel} size="large">
            取消
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default MemberForm;

