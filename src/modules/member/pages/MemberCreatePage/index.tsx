/**
 * Member Create Page
 * 会员创建页面
 */

import React, { useState } from 'react';
import { Card, message, Form, Input, DatePicker, Select, Row, Col, Button, Tag, Tabs } from 'antd';
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
          <Tabs
            items={[
              {
                key: 'basic',
                label: '📋 基本信息',
                children: (
                  <Card bordered={false} style={{ padding: 0 }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }, { min: 2, message: '姓名至少2个字符' }]}>
                          <Input placeholder="请输入姓名" />
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
                      <Col xs={24} md={12}>
                        <Form.Item name="alternativePhone" label="备用电话">
                          <Input placeholder="可选" />
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
                      <Col xs={24} md={12}>
                        <Form.Item name="nationality" label="国籍">
                          <Input placeholder="例如 Malaysia" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="nricOrPassport" label="NRIC/护照">
                          <Input placeholder="仅数字或护照号" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="fullNameNric" label="身份证全名">
                          <Input placeholder="可选" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="linkedin" label="LinkedIn">
                          <Input placeholder="https://linkedin.com/in/..." />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="profilePhotoUrl" label="头像链接">
                          <Input placeholder="https://..." />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="whatsappGroup" label="WhatsApp群组">
                          <Input placeholder="可选" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ),
              },
              {
                key: 'business',
                label: '🏢 Business(商业信息)',
                children: (
                  <Card bordered={false} style={{ padding: 0 }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","company"]} label="公司名称">
                          <Input placeholder="公司名称" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","departmentAndPosition"]} label="部门与职位">
                          <Input placeholder="部门与职位" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","ownIndustry"]} label="所属行业">
                          <Select mode="multiple" placeholder="选择所属行业" options={[]} allowClear />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","interestedIndustries"]} label="感兴趣行业">
                          <Select mode="multiple" placeholder="选择感兴趣行业" options={[]} allowClear />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","businessCategories"]} label="商业类别">
                          <Select mode="multiple" placeholder="选择商业类别" options={[]} allowClear />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","acceptInternationalBusiness"]} label="接受国际业务">
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
                      <Col xs={24} md={12}>
                        <Form.Item name={["business","companyWebsite"]} label="公司网站">
                          <Input placeholder="https://" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={24}>
                        <Form.Item name={["business","companyIntro"]} label="公司介绍">
                          <Input.TextArea rows={3} placeholder="简要介绍公司" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ),
              },
              {
                key: 'jci',
                label: '🏛️ JCI Career(会籍与任期)',
                children: (
                  <Card bordered={false} style={{ padding: 0 }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Form.Item name="memberId" label="会员编号">
                          <Input placeholder="自动生成或手动输入" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","category"]} label="JCI 类别">
                          <Select allowClear placeholder="自动分类为主，可留空" options={[]}/>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","membershipCategory"]} label="会员类别">
                          <Input placeholder="如 Official / Probation" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","chapter"]} label="分会(覆盖基础)">
                          <Input placeholder="分会名称" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","chapterId"]} label="分会ID(覆盖基础)">
                          <Input placeholder="分会ID" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","jciPosition"]} label="JCI 职位">
                          <Input placeholder="例如 Director" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","joinDate"]} label="入会日期">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","senatorId"]} label="参议员编号">
                          <Input placeholder="如有可填写" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","termStartDate"]} label="任期开始">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","termEndDate"]} label="任期结束">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={["jciCareer","joinDate"]} label="加入日期(JCI)">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="shirtSize" label="T恤尺寸">
                          <Input placeholder="例如 M / L" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="jacketSize" label="夹克尺寸">
                          <Input placeholder="例如 48 / L" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="nameToBeEmbroidered" label="刺绣名称">
                          <Input placeholder="可选" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="tshirtReceivingStatus" label="T恤领取状态">
                          <Input placeholder="未领/已领" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name="cutting" label="裁剪/版型">
                          <Input placeholder="可选" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ),
              },
            ]}
          />

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