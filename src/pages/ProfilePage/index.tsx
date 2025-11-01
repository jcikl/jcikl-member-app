/**
 * Profile Page
 * 个人资料页面
 * 
 * 显示当前登录用户的会员资料（基于MemberDetailPage）
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Tag, 
  Avatar, 
  Space, 
  Button, 
  Spin,
  message,
  Modal,
  Row,
  Col,
  Typography,
  Tabs,
  Empty,
  Table,
  Divider,
  Input,
  Select,
  Form,
  DatePicker,
  Badge,
} from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components';
import { getMemberById, updateMember } from '@/modules/member/services/memberService';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import { useAuthStore } from '@/stores/authStore';
import type { Member, MemberFormData } from '@/modules/member/types';
import { 
  MEMBER_STATUS_OPTIONS, 
  MEMBER_CATEGORY_OPTIONS, 
  MEMBER_LEVEL_OPTIONS 
} from '@/modules/member/types';
import { getMemberFeesByMemberId } from '@/modules/finance/services/memberFeeService';
import { getTransactions } from '@/modules/finance/services/transactionService';
import type { MemberFee } from '@/modules/finance/types';
import type { Transaction } from '@/modules/finance/types';
import '@/modules/member/pages/MemberDetailPage/styles.css';

const { Title, Text } = Typography;

/**
 * Profile Page Component
 */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ========== Data Fetching ==========
  
  useEffect(() => {
    if (!user?.id) {
      message.error('请先登录');
      navigate('/login');
      return;
    }
    
    fetchMemberDetail();
  }, [user?.id]);
  
  const fetchMemberDetail = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await getMemberById(user.id);
      if (!data) {
        message.error('未找到会员资料');
        return;
      }
      setMember(data);
    } catch (error) {
      console.error('Failed to load member:', error);
      message.error('加载资料失败');
    } finally {
      setLoading(false);
    }
  };

  // ========== Edit Mode ==========
  
  const handleStartEdit = () => {
    if (!member) return;
    
    // 初始化表单数据
    const formData: any = {
      // Basic info
      name: member.name,
      phone: member.phone,
      email: member.email,
      gender: member.gender,
      fullNameNric: (member as any).profile?.fullNameNric || '',
      whatsappGroup: (member as any).profile?.whatsappGroup || '',
      nricOrPassport: (member as any).profile?.nricOrPassport || '',
      alternativePhone: (member as any).profile?.alternativePhone || '',
      
      // Clothing & Items
      shirtSize: (member as any).profile?.shirtSize || '',
      jacketSize: (member as any).profile?.jacketSize || '',
      nameToBeEmbroidered: (member as any).profile?.nameToBeEmbroidered || '',
      tshirtReceivingStatus: (member as any).profile?.tshirtReceivingStatus || '',
      cutting: (member as any).profile?.cutting || '',
      
      // Career & Business
      company: (member as any).business?.company || '',
      departmentAndPosition: (member as any).business?.departmentAndPosition || '',
      industryDetail: (member as any).business?.industryDetail || '',
      companyWebsite: (member as any).business?.companyWebsite || '',
      companyIntro: (member as any).business?.companyIntro || '',
      acceptInternationalBusiness: (member as any).business?.acceptInternationalBusiness || '',
      ownIndustry: Array.isArray((member as any).business?.ownIndustry) 
        ? (member as any).business.ownIndustry.join(', ') 
        : '',
      interestedIndustries: Array.isArray((member as any).business?.interestedIndustries) 
        ? (member as any).business.interestedIndustries.join(', ') 
        : '',
      businessCategories: Array.isArray((member as any).business?.businessCategories) 
        ? (member as any).business.businessCategories.join(', ') 
        : '',
      linkedin: (member as any).profile?.linkedin || (member as any).business?.linkedin || '',
      
      // JCI Career
      worldRegion: (member as any).jciCareer?.worldRegion || '',
      countryRegion: (member as any).jciCareer?.countryRegion || '',
      country: (member as any).jciCareer?.country || '',
      chapter: (member as any).jciCareer?.chapter || '',
      introducerName: (member as any).jciCareer?.introducerName || '',
      jciPosition: (member as any).jciCareer?.jciPosition || '',
      membershipCategory: (member as any).jciCareer?.membershipCategory || '',
      senatorId: (member as any).jciCareer?.senatorId || '',
      jciBenefitsExpectation: (member as any).jciCareer?.jciBenefitsExpectation || '',
      jciEventInterests: (member as any).jciCareer?.jciEventInterests || '',
      activeMemberHow: (member as any).jciCareer?.activeMemberHow || '',
      fiveYearsVision: (member as any).jciCareer?.fiveYearsVision || '',
      
      // JCI Dates
      joinDate: (member as any).jciCareer?.joinDate ? dayjs((member as any).jciCareer.joinDate) : null,
      paymentDate: (member as any).jciCareer?.paymentDate ? dayjs((member as any).jciCareer.paymentDate) : null,
      paymentSlipUrl: (member as any).jciCareer?.paymentSlipUrl || '',
      paymentVerifiedDate: (member as any).jciCareer?.paymentVerifiedDate ? dayjs((member as any).jciCareer.paymentVerifiedDate) : null,
      endorsementDate: (member as any).jciCareer?.endorsementDate ? dayjs((member as any).jciCareer.endorsementDate) : null,
    };
    
    form.setFieldsValue(formData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    form.resetFields();
    setIsEditing(false);
  };

  const handleSaveAll = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      if (!member?.id) return;

      // 构建更新数据
      const updateData: any = {
        // 顶层字段
        name: values.name,
        phone: values.phone,
        email: values.email,
        gender: values.gender,
        
        // Profile字段（使用点表示法）
        'profile.fullNameNric': values.fullNameNric,
        'profile.whatsappGroup': values.whatsappGroup,
        'profile.nricOrPassport': values.nricOrPassport,
        'profile.alternativePhone': values.alternativePhone,
        'profile.shirtSize': values.shirtSize,
        'profile.jacketSize': values.jacketSize,
        'profile.nameToBeEmbroidered': values.nameToBeEmbroidered,
        'profile.tshirtReceivingStatus': values.tshirtReceivingStatus,
        'profile.cutting': values.cutting,
        'profile.linkedin': values.linkedin,
        
        // Business字段
        'business.company': values.company,
        'business.departmentAndPosition': values.departmentAndPosition,
        'business.industryDetail': values.industryDetail,
        'business.companyWebsite': values.companyWebsite,
        'business.companyIntro': values.companyIntro,
        'business.acceptInternationalBusiness': values.acceptInternationalBusiness,
        'business.ownIndustry': values.ownIndustry ? values.ownIndustry.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        'business.interestedIndustries': values.interestedIndustries ? values.interestedIndustries.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        'business.businessCategories': values.businessCategories ? values.businessCategories.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        
        // JCI Career字段
        'jciCareer.worldRegion': values.worldRegion,
        'jciCareer.countryRegion': values.countryRegion,
        'jciCareer.country': values.country,
        'jciCareer.chapter': values.chapter,
        'jciCareer.introducerName': values.introducerName,
        'jciCareer.jciPosition': values.jciPosition,
        'jciCareer.membershipCategory': values.membershipCategory,
        'jciCareer.senatorId': values.senatorId,
        'jciCareer.jciBenefitsExpectation': values.jciBenefitsExpectation,
        'jciCareer.jciEventInterests': values.jciEventInterests,
        'jciCareer.activeMemberHow': values.activeMemberHow,
        'jciCareer.fiveYearsVision': values.fiveYearsVision,
        
        // 日期字段转换为YYYY-MM-DD格式
        'jciCareer.joinDate': values.joinDate ? values.joinDate.format('YYYY-MM-DD') : null,
        'jciCareer.paymentDate': values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : null,
        'jciCareer.paymentSlipUrl': values.paymentSlipUrl,
        'jciCareer.paymentVerifiedDate': values.paymentVerifiedDate ? values.paymentVerifiedDate.format('YYYY-MM-DD') : null,
        'jciCareer.endorsementDate': values.endorsementDate ? values.endorsementDate.format('YYYY-MM-DD') : null,
      };

      await updateMember(member.id, updateData);
      message.success('资料更新成功');
      setIsEditing(false);
      fetchMemberDetail();
    } catch (error) {
      console.error('Failed to update member:', error);
      message.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== Render Helpers ==========
  
  const renderField = (
    label: string,
    fieldName: string,
    value: any,
    type: 'text' | 'select' | 'textarea' | 'date' = 'text',
    options?: { label: string; value: string }[],
    align: 'horizontal' | 'vertical' = 'horizontal'
  ) => {
    if (isEditing) {
      if (type === 'select') {
        return (
          <Row align="middle">
            <Col span={align === 'horizontal' ? 6 : 24} style={{ color: '#8c8c8c', fontSize: 12 }}>
              {label}
            </Col>
            <Col span={align === 'horizontal' ? 18 : 24}>
              <Form.Item name={fieldName} style={{ marginBottom: 0 }}>
                <Select style={{ width: '100%' }}>
                  {options?.map(opt => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );
      } else if (type === 'textarea') {
        return (
          <Row align="top">
            <Col span={align === 'horizontal' ? 6 : 24} style={{ color: '#8c8c8c', fontSize: 12 }}>
              {label}
            </Col>
            <Col span={align === 'horizontal' ? 18 : 24}>
              <Form.Item name={fieldName} style={{ marginBottom: 0 }}>
                <TextArea rows={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        );
      } else if (type === 'date') {
        return (
          <Row align="middle">
            <Col span={align === 'horizontal' ? 6 : 24} style={{ color: '#8c8c8c', fontSize: 12 }}>
              {label}
            </Col>
            <Col span={align === 'horizontal' ? 18 : 24}>
              <Form.Item name={fieldName} style={{ marginBottom: 0 }}>
                <DatePicker style={{ width: '100%' }} format="DD-MMM-YYYY" />
              </Form.Item>
            </Col>
          </Row>
        );
      } else {
        return (
          <Row align="middle">
            <Col span={align === 'horizontal' ? 6 : 24} style={{ color: '#8c8c8c', fontSize: 12 }}>
              {label}
            </Col>
            <Col span={align === 'horizontal' ? 18 : 24}>
              <Form.Item name={fieldName} style={{ marginBottom: 0 }}>
                <Input style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        );
      }
    }

    // View mode
    const displayValue = type === 'date' && value
      ? dayjs(value).format('DD-MMM-YYYY')
      : value || '-';
    
    return (
      <Row align="middle">
        <Col span={align === 'horizontal' ? 6 : 24} style={{ color: '#8c8c8c', fontSize: 12 }}>
          {label}
        </Col>
        <Col span={align === 'horizontal' ? 18 : 24}>
          <span style={{ fontSize: 14, color: '#000' }}>{displayValue}</span>
        </Col>
      </Row>
    );
  };

  // ========== Loading State ==========
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="未找到会员资料" />
      </div>
    );
  }

  // ========== Render ==========
  
  return (
    <div className="member-detail-page">
      <PageHeader
        title="个人资料"
        subtitle="My Profile"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '个人资料' },
        ]}
      />

      <Form form={form}>
        <Tabs
          defaultActiveKey="basic"
          tabBarExtraContent={
            <Space>
              {isEditing ? (
                <>
                  <Button 
                    icon={<CheckOutlined />} 
                    type="primary"
                    loading={saving}
                    onClick={handleSaveAll}
                  >
                    保存
                  </Button>
                  <Button 
                    icon={<CloseOutlined />}
                    onClick={handleCancelEdit}
                  >
                    取消
                  </Button>
                </>
              ) : (
                <Button 
                  icon={<EditOutlined />}
                  type="primary"
                  onClick={handleStartEdit}
                >
                  编辑
                </Button>
              )}
            </Space>
          }
          items={[
            {
              key: 'basic',
              label: '📋 基本信息',
              children: (
                <Row gutter={[16, 16]} align="stretch">
                  {/* Basic Information Card */}
                  <Col xs={24} md={18}>
                    <Card title="基本信息" bordered style={{ height: '100%' }}>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          {renderField('姓名', 'name', member.name)}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('电话', 'phone', member.phone)}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('身份证全名', 'fullNameNric', (member as any).profile?.fullNameNric)}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('WhatsApp群组', 'whatsappGroup', (member as any).profile?.whatsappGroup)}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('NRIC/护照', 'nricOrPassport', (member as any).profile?.nricOrPassport)}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('邮箱', 'email', member.email)}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('性别', 'gender', member.gender, 'select', [
                            { label: '男', value: 'male' },
                            { label: '女', value: 'female' },
                            { label: '其他', value: 'other' },
                          ])}
                        </Col>
                        <Col xs={24} md={12}>
                          {renderField('备用电话', 'alternativePhone', (member as any).profile?.alternativePhone)}
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  {/* Clothing & Items Card */}
                  <Col xs={24} md={6}>
                    <Card title="服装与物品" bordered style={{ height: '100%' }}>
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {renderField('衬衫尺寸', 'shirtSize', (member as any).profile?.shirtSize, 'text', undefined, 'vertical')}
                        {renderField('夹克尺寸', 'jacketSize', (member as any).profile?.jacketSize, 'text', undefined, 'vertical')}
                        {renderField('刺绣姓名', 'nameToBeEmbroidered', (member as any).profile?.nameToBeEmbroidered, 'text', undefined, 'vertical')}
                        {renderField('T恤领取状态', 'tshirtReceivingStatus', (member as any).profile?.tshirtReceivingStatus, 'text', undefined, 'vertical')}
                        {renderField('裁剪', 'cutting', (member as any).profile?.cutting, 'text', undefined, 'vertical')}
                      </Space>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'business',
              label: '💼 职业商业',
              children: (
                <Card title="职业与商业信息" bordered>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      {renderField('公司名称', 'company', (member as any).business?.company)}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('部门与职位', 'departmentAndPosition', (member as any).business?.departmentAndPosition)}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('行业详情', 'industryDetail', (member as any).business?.industryDetail, 'textarea')}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('公司网站', 'companyWebsite', (member as any).business?.companyWebsite)}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('公司简介', 'companyIntro', (member as any).business?.companyIntro, 'textarea')}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('接受国际业务', 'acceptInternationalBusiness', (member as any).business?.acceptInternationalBusiness, 'select', [
                        { label: '是', value: 'yes' },
                        { label: '否', value: 'no' },
                      ])}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('拥有行业', 'ownIndustry', Array.isArray((member as any).business?.ownIndustry) ? (member as any).business.ownIndustry.join(', ') : '')}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('感兴趣行业', 'interestedIndustries', Array.isArray((member as any).business?.interestedIndustries) ? (member as any).business.interestedIndustries.join(', ') : '')}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('业务类别', 'businessCategories', Array.isArray((member as any).business?.businessCategories) ? (member as any).business.businessCategories.join(', ') : '')}
                    </Col>
                    <Col xs={24} md={12}>
                      {renderField('LinkedIn', 'linkedin', (member as any).profile?.linkedin || (member as any).business?.linkedin)}
                    </Col>
                  </Row>
                </Card>
              ),
            },
            {
              key: 'jci',
              label: '🏛️ JCI发展',
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {/* Organization & JCI Career Side by Side */}
                  <Row gutter={16}>
                    {/* Organization Card */}
                    <Col xs={24} md={12}>
                      <Card title="组织信息" bordered>
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            {renderField('世界地区', 'worldRegion', (member as any).jciCareer?.worldRegion)}
                          </Col>
                          <Col span={12}>
                            {renderField('国家地区', 'countryRegion', (member as any).jciCareer?.countryRegion)}
                          </Col>
                          <Col span={12}>
                            {renderField('国家', 'country', (member as any).jciCareer?.country)}
                          </Col>
                          <Col span={12}>
                            {renderField('分会', 'chapter', (member as any).jciCareer?.chapter)}
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    {/* JCI Career Card */}
                    <Col xs={24} md={12}>
                      <Card title="JCI 会籍与任期" bordered>
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            {renderField('入会日期', 'joinDate', (member as any).jciCareer?.joinDate, 'date')}
                          </Col>
                          <Col span={12}>
                            {renderField('会员类别', 'membershipCategory', (member as any).jciCareer?.category || (member as any).jciCareer?.membershipCategory)}
                          </Col>
                          <Col span={12}>
                            {renderField('介绍人', 'introducerName', (member as any).jciCareer?.introducerName)}
                          </Col>
                          <Col span={12}>
                            {renderField('JCI职位', 'jciPosition', (member as any).jciCareer?.jciPosition)}
                          </Col>
                          <Col span={12}>
                            {renderField('参议员编号', 'senatorId', (member as any).jciCareer?.senatorId)}
                          </Col>
                        </Row>
                        
                        <Divider style={{ margin: '16px 0' }} />
                        
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            {renderField('JCI 期望', 'jciBenefitsExpectation', (member as any).jciCareer?.jciBenefitsExpectation, 'textarea', undefined, 'vertical')}
                          </Col>
                          <Col span={24}>
                            {renderField('JCI 兴趣', 'jciEventInterests', (member as any).jciCareer?.jciEventInterests, 'textarea', undefined, 'vertical')}
                          </Col>
                          <Col span={24}>
                            {renderField('成为活跃会员方式', 'activeMemberHow', (member as any).jciCareer?.activeMemberHow, 'textarea', undefined, 'vertical')}
                          </Col>
                          <Col span={24}>
                            {renderField('五年愿景', 'fiveYearsVision', (member as any).jciCareer?.fiveYearsVision, 'textarea', undefined, 'vertical')}
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  {/* Payment & Endorsement Card */}
                  <Card title="支付与背书" bordered>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        {renderField('支付日期', 'paymentDate', (member as any).jciCareer?.paymentDate, 'date')}
                      </Col>
                      <Col xs={24} md={12}>
                        {renderField('支付凭证URL', 'paymentSlipUrl', (member as any).jciCareer?.paymentSlipUrl)}
                      </Col>
                      <Col xs={24} md={12}>
                        {renderField('支付验证日期', 'paymentVerifiedDate', (member as any).jciCareer?.paymentVerifiedDate, 'date')}
                      </Col>
                      <Col xs={24} md={12}>
                        {renderField('背书日期', 'endorsementDate', (member as any).jciCareer?.endorsementDate, 'date')}
                      </Col>
                    </Row>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'activities',
              label: '📅 活动',
              children: (
                <Empty 
                  description="功能开发中" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            },
            {
              key: 'tasks',
              label: '✅ 任务',
              children: (
                <Empty 
                  description="功能开发中" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            },
          ]}
        />
      </Form>
    </div>
  );
};

export default ProfilePage;

