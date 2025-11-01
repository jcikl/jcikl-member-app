/**
 * Member Detail View Component
 * 会员详情视图组件
 * 
 * 共享组件，用于会员详情页面和个人资料页面
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tag, 
  Avatar, 
  Space, 
  Button, 
  message,
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
} from 'antd';
import dayjs from 'dayjs';
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { updateMember } from '../../services/memberService';
import type { Member } from '../../types';
import { 
  MEMBER_STATUS_OPTIONS, 
  MEMBER_CATEGORY_OPTIONS, 
  MEMBER_LEVEL_OPTIONS 
} from '../../types';
import { getMemberFeesByMemberId } from '@/modules/finance/services/memberFeeService';
import { getTransactions } from '@/modules/finance/services/transactionService';
import type { MemberFee } from '@/modules/finance/types';
import type { Transaction } from '@/modules/finance/types';
import './styles.css';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface MemberDetailViewProps {
  member: Member;
  currentUserId: string;
  onUpdate?: (updatedMember: Member) => void;
  showEditButton?: boolean;
}

/**
 * Member Detail View Component
 */
export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  member,
  currentUserId,
  onUpdate,
  showEditButton = true,
}) => {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ========== Global Editing Functions ==========
  
  const handleStartEdit = () => {
    if (!member) return;
    
    // Initialize form with current member data
    const formData: any = {
      // Top-level fields
      name: member.profile.name || member.name || '',
      email: member.profile.email || member.email || '',
      phone: member.profile.phone || member.phone || '',
      status: (member as any).profile?.status || member.status || '',
      level: (member as any).profile?.level || member.level || '',
      
      // Profile fields
      fullNameNric: member.profile.fullNameNric || '',
      nricOrPassport: member.profile.nricOrPassport || '',
      gender: member.profile.gender || '',
      alternativePhone: member.profile.alternativePhone || '',
      whatsappGroup: (member as any).profile?.whatsappGroup || '',
      nationality: member.profile.nationality || '',
      birthDate: member.profile.birthDate || '',
      profilePhotoUrl: member.profile.profilePhotoUrl || '',
      linkedin: member.profile.linkedin || '',
      
      // Business fields
      company: (member as any).business?.company || member.profile.company || '',
      departmentAndPosition: (member as any).business?.departmentAndPosition || member.profile.departmentAndPosition || '',
      industryDetail: (member as any).business?.industryDetail || '',
      companyWebsite: (member as any).business?.companyWebsite || '',
      companyIntro: (member as any).business?.companyIntro || '',
      acceptInternationalBusiness: (member as any).business?.acceptInternationalBusiness || '',
      ownIndustry: Array.isArray((member as any).business?.ownIndustry) ? (member as any).business.ownIndustry.join(', ') : '',
      interestedIndustries: Array.isArray((member as any).business?.interestedIndustries) ? (member as any).business.interestedIndustries.join(', ') : '',
      businessCategories: Array.isArray((member as any).business?.businessCategories) ? (member as any).business.businessCategories.join(', ') : '',
      
      // JCI Career fields
      memberId: (member as any).jciCareer?.memberId || member.memberId || '',
      category: (member as any).jciCareer?.category || member.category || '',
      chapter: (member as any).jciCareer?.chapter || member.chapter || '',
      chapterId: (member as any).jciCareer?.chapterId || member.chapterId || '',
      joinDate: (member as any).jciCareer?.joinDate || member.joinDate ? dayjs((member as any).jciCareer?.joinDate || member.joinDate) : null,
      paymentDate: (member as any).jciCareer?.paymentDate ? dayjs((member as any).jciCareer.paymentDate) : null,
      paymentVerifiedDate: (member as any).jciCareer?.paymentVerifiedDate ? dayjs((member as any).jciCareer.paymentVerifiedDate) : null,
      endorsementDate: (member as any).jciCareer?.endorsementDate ? dayjs((member as any).jciCareer.endorsementDate) : null,
      senatorId: (member as any).jciCareer?.senatorId || '',
      worldRegion: (member as any).jciCareer?.worldRegion || '',
      countryRegion: (member as any).jciCareer?.countryRegion || '',
      country: (member as any).jciCareer?.country || '',
      introducerName: (member as any).jciCareer?.introducerName || '',
      jciPosition: (member as any).jciCareer?.jciPosition || '',
      membershipCategory: (member as any).jciCareer?.membershipCategory || '',
      jciBenefitsExpectation: (member as any).jciCareer?.jciBenefitsExpectation || '',
      jciEventInterests: (member as any).jciCareer?.jciEventInterests || '',
      activeMemberHow: (member as any).jciCareer?.activeMemberHow || '',
      fiveYearsVision: (member as any).jciCareer?.fiveYearsVision || '',
      paymentSlipUrl: (member as any).jciCareer?.paymentSlipUrl || '',
      
      // Clothing & Items fields
      shirtSize: member.profile.shirtSize || '',
      jacketSize: member.profile.jacketSize || '',
      nameToBeEmbroidered: member.profile.nameToBeEmbroidered || '',
      tshirtReceivingStatus: member.profile.tshirtReceivingStatus || '',
      cutting: member.profile.cutting || '',
    };
    
    form.setFieldsValue(formData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.resetFields();
  };

  const handleSaveAll = async () => {
    if (!member || !currentUserId) return;
    
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      
      // Prepare update data - 使用统一的字段映射，避免重复
      const updateData: any = {};
      
      // Top-level fields
      if (values.name !== undefined) updateData.name = values.name;
      if (values.email !== undefined) updateData.email = values.email;
      if (values.phone !== undefined) updateData.phone = values.phone;
      if (values.status !== undefined) updateData.status = values.status;
      if (values.level !== undefined) updateData.level = values.level;
      if (values.chapter !== undefined) updateData.chapter = values.chapter;
      if (values.chapterId !== undefined) updateData.chapterId = values.chapterId;
      
      // Profile fields with dot notation
      if (values.fullNameNric !== undefined) updateData['profile.fullNameNric'] = values.fullNameNric || '';
      if (values.nricOrPassport !== undefined) updateData['profile.nricOrPassport'] = values.nricOrPassport || '';
      if (values.gender !== undefined) updateData['profile.gender'] = values.gender || '';
      if (values.alternativePhone !== undefined) updateData['profile.alternativePhone'] = values.alternativePhone || '';
      if (values.whatsappGroup !== undefined) updateData['profile.whatsappGroup'] = values.whatsappGroup || '';
      if (values.nationality !== undefined) updateData['profile.nationality'] = values.nationality || '';
      if (values.birthDate !== undefined) updateData['profile.birthDate'] = values.birthDate || '';
      if (values.profilePhotoUrl !== undefined) updateData['profile.profilePhotoUrl'] = values.profilePhotoUrl || '';
      if (values.linkedin !== undefined) updateData['profile.linkedin'] = values.linkedin || '';
      
      // Clothing & Items fields
      if (values.shirtSize !== undefined) updateData['profile.shirtSize'] = values.shirtSize || '';
      if (values.jacketSize !== undefined) updateData['profile.jacketSize'] = values.jacketSize || '';
      if (values.nameToBeEmbroidered !== undefined) updateData['profile.nameToBeEmbroidered'] = values.nameToBeEmbroidered || '';
      if (values.tshirtReceivingStatus !== undefined) updateData['profile.tshirtReceivingStatus'] = values.tshirtReceivingStatus || '';
      if (values.cutting !== undefined) updateData['profile.cutting'] = values.cutting || '';
      
      // Business fields
      if (values.company !== undefined) {
        updateData['business.company'] = values.company || '';
      }
      if (values.departmentAndPosition !== undefined) {
        updateData['business.departmentAndPosition'] = values.departmentAndPosition || '';
      }
      if (values.industryDetail !== undefined) updateData['business.industryDetail'] = values.industryDetail || '';
      if (values.companyWebsite !== undefined) updateData['business.companyWebsite'] = values.companyWebsite || '';
      if (values.companyIntro !== undefined) updateData['business.companyIntro'] = values.companyIntro || '';
      if (values.acceptInternationalBusiness !== undefined) updateData['business.acceptInternationalBusiness'] = values.acceptInternationalBusiness || '';
      if (values.ownIndustry !== undefined) {
        updateData['business.ownIndustry'] = values.ownIndustry ? values.ownIndustry.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
      }
      if (values.interestedIndustries !== undefined) {
        updateData['business.interestedIndustries'] = values.interestedIndustries ? values.interestedIndustries.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
      }
      if (values.businessCategories !== undefined) {
        updateData['business.businessCategories'] = values.businessCategories ? values.businessCategories.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
      }
      
      // JCI Career fields - 日期字段统一转换为YYYY-MM-DD字符串格式
      if (values.memberId !== undefined) updateData['jciCareer.memberId'] = values.memberId || '';
      if (values.joinDate !== undefined) {
        updateData['jciCareer.joinDate'] = values.joinDate ? (values.joinDate.format ? values.joinDate.format('YYYY-MM-DD') : values.joinDate) : '';
      }
      if (values.senatorId !== undefined) updateData['jciCareer.senatorId'] = values.senatorId || '';
      if (values.worldRegion !== undefined) updateData['jciCareer.worldRegion'] = values.worldRegion || '';
      if (values.countryRegion !== undefined) updateData['jciCareer.countryRegion'] = values.countryRegion || '';
      if (values.country !== undefined) updateData['jciCareer.country'] = values.country || '';
      if (values.introducerName !== undefined) updateData['jciCareer.introducerName'] = values.introducerName || '';
      if (values.jciPosition !== undefined) updateData['jciCareer.jciPosition'] = values.jciPosition || '';
      if (values.membershipCategory !== undefined) updateData['jciCareer.membershipCategory'] = values.membershipCategory || '';
      if (values.jciBenefitsExpectation !== undefined) updateData['jciCareer.jciBenefitsExpectation'] = values.jciBenefitsExpectation || '';
      if (values.jciEventInterests !== undefined) updateData['jciCareer.jciEventInterests'] = values.jciEventInterests || '';
      if (values.activeMemberHow !== undefined) updateData['jciCareer.activeMemberHow'] = values.activeMemberHow || '';
      if (values.fiveYearsVision !== undefined) updateData['jciCareer.fiveYearsVision'] = values.fiveYearsVision || '';
      if (values.paymentDate !== undefined) {
        updateData['jciCareer.paymentDate'] = values.paymentDate ? (values.paymentDate.format ? values.paymentDate.format('YYYY-MM-DD') : values.paymentDate) : '';
      }
      if (values.paymentSlipUrl !== undefined) updateData['jciCareer.paymentSlipUrl'] = values.paymentSlipUrl || '';
      if (values.paymentVerifiedDate !== undefined) {
        updateData['jciCareer.paymentVerifiedDate'] = values.paymentVerifiedDate ? (values.paymentVerifiedDate.format ? values.paymentVerifiedDate.format('YYYY-MM-DD') : values.paymentVerifiedDate) : '';
      }
      if (values.endorsementDate !== undefined) {
        updateData['jciCareer.endorsementDate'] = values.endorsementDate ? (values.endorsementDate.format ? values.endorsementDate.format('YYYY-MM-DD') : values.endorsementDate) : '';
      }
      
      console.log('📝 [MemberDetailView] 准备更新数据:', updateData);
      
      const updated = await updateMember(member.id, updateData, currentUserId);
      setIsEditing(false);
      message.success('保存成功');
      
      if (onUpdate) {
        onUpdate(updated);
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== Helper Functions ==========
  
  /**
   * Render field - editable in edit mode, read-only otherwise
   */
  const renderField = (
    fieldName: string,
    label: string,
    value: string | undefined,
    type: 'text' | 'select' | 'textarea' | 'date' = 'text',
    options?: Array<{ label: string; value: string }>,
    align: 'middle' | 'top' = 'middle'
  ) => {
    const displayValue = value || '-';

    if (isEditing) {
      return (
        <Row gutter={[8, 8]} align={align}>
          <Col flex="120px">
            <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
          </Col>
          <Col flex="auto">
            {type === 'select' && options ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <Select
                  options={options}
                  style={{ width: '100%' }}
                  size="small"
                />
              </Form.Item>
            ) : type === 'textarea' ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <TextArea
                  rows={3}
                  size="small"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : type === 'date' ? (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <DatePicker
                  style={{ width: '100%' }}
                  size="small"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            ) : (
              <Form.Item name={fieldName} style={{ marginBottom: 0, width: '100%' }}>
                <Input
                  style={{ width: '100%' }}
                  size="small"
                />
              </Form.Item>
            )}
          </Col>
        </Row>
      );
    }

    // Format date for display
    let formattedValue = displayValue;
    if (type === 'date' && value && value !== '-') {
      try {
        const date = dayjs(value);
        if (date.isValid()) {
          formattedValue = date.format('YYYY-MM-DD');
        }
      } catch {
        // Keep original value if parsing fails
      }
    }

    return (
      <Row gutter={[8, 8]} align={align}>
        <Col flex="120px">
          <span style={{ fontSize: 13, color: '#666' }}>{label}</span>
        </Col>
        <Col flex="auto">
          <span style={{ fontSize: 13, color: '#000' }}>{formattedValue}</span>
        </Col>
      </Row>
    );
  };
  
  const getStatusLabel = (status: string) => {
    const option = MEMBER_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };
  
  const getCategoryLabel = (category: string) => {
    const option = MEMBER_CATEGORY_OPTIONS.find(opt => opt.value === category);
    return option?.label || category;
  };
  
  const getLevelLabel = (level: string) => {
    const option = MEMBER_LEVEL_OPTIONS.find(opt => opt.value === level);
    return option?.label || level;
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'success',
      inactive: 'default',
      pending: 'processing',
      suspended: 'error',
    };
    return colors[status] || 'default';
  };
  
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      bronze: 'default',
      silver: 'blue',
      gold: 'gold',
      platinum: 'purple',
      diamond: 'magenta',
    };
    return colors[level] || 'default';
  };

  // 会费标签页组件
  const MemberFeesTab: React.FC<{ memberId: string }> = ({ memberId }) => {
    const [loadingFees, setLoadingFees] = useState(false);
    const [fees, setFees] = useState<MemberFee[]>([]);
    const [fallbackTxns, setFallbackTxns] = useState<Transaction[]>([]);

    useEffect(() => {
      const loadFees = async () => {
        setLoadingFees(true);
        try {
          const data = await getMemberFeesByMemberId(memberId);
          setFees(data);

          // 如果没有会费记录，尝试读取已关联的交易作为回退展示
          if (!data || data.length === 0) {
            const txnResult = await getTransactions({
              page: 1,
              limit: 50,
              category: 'member-fees',
              includeVirtual: true,
              sortBy: 'transactionDate',
              sortOrder: 'desc',
            });
            const related = txnResult.data.filter((t: any) => (t as any)?.metadata?.memberId === memberId);
            setFallbackTxns(related as Transaction[]);
          } else {
            setFallbackTxns([]);
          }
        } catch (e) {
          message.error('加载会费记录失败');
        } finally {
          setLoadingFees(false);
        }
      };
      loadFees();
    }, [memberId]);

    const columns = [
      { title: '类型', dataIndex: 'feeType', key: 'feeType', width: 120 },
      { title: '金额', dataIndex: 'expectedAmount', key: 'expectedAmount', width: 100, align: 'right' as const, render: (v: number) => `RM ${Number(v || 0).toFixed(2)}` },
      { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => {
          const map: Record<string, { color: string; text: string }> = {
            paid: { color: 'success', text: '已付' },
            unpaid: { color: 'warning', text: '未付' },
            partial: { color: 'processing', text: '部分付款' },
            overdue: { color: 'error', text: '逾期' },
            waived: { color: 'default', text: '豁免' },
            cancelled: { color: 'default', text: '取消' },
          };
          const cfg = map[s] || { color: 'default', text: s };
          return <Tag color={cfg.color}>{cfg.text}</Tag>;
        }
      },
      { title: '到期日', dataIndex: 'dueDate', key: 'dueDate', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
      { title: '付款日', dataIndex: 'paymentDate', key: 'paymentDate', width: 120, render: (d?: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
    ];

    if (fees && fees.length > 0) {
      return (
        <Table
          size="small"
          rowKey="id"
          loading={loadingFees}
          columns={columns as any}
          dataSource={fees}
          pagination={false}
        />
      );
    }

    // 回退：显示已关联的交易提示
    const txColumns = [
      { title: '日期', dataIndex: 'transactionDate', key: 'transactionDate', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
      { title: '描述', dataIndex: 'mainDescription', key: 'mainDescription', width: 220 },
      { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' as const, render: (v: number, r: any) => `${r.transactionType === 'income' ? '+' : '-'}RM ${(v ?? 0).toFixed(2)}` },
      { title: '二次分类', dataIndex: 'txAccount', key: 'txAccount', width: 140 },
      { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    ];

    return (
      <div>
        <div style={{ marginBottom: 8, color: '#999' }}>
          未找到正式"会费记录"。已为您显示与该会员关联的"会员费交易记录"。
        </div>
        <Table
          size="small"
          rowKey="id"
          loading={loadingFees}
          columns={txColumns as any}
          dataSource={fallbackTxns}
          pagination={false}
        />
      </div>
    );
  };

  // ========== Render ==========
  
  // 统一的 Row gutter 配置
  const ROW_GUTTER: [number, number] = [16, 16];  // 标签页层面的 gutter
  
  return (
    <div className="member-detail-view">
      {/* Profile Card */}
      <Card className="profile-card" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
            <Avatar
              size={120}
              src={member.profile.avatar}
              icon={<UserOutlined />}
            />
          </Col>
          <Col xs={24} sm={18}>
            <Title level={2} style={{ marginBottom: 8 }}>
              {member.profile.name || member.name}
            </Title>
            <Space size="middle" wrap>
              <Tag color={getStatusColor(((member as any).profile?.status))}>
                {getStatusLabel(((member as any).profile?.status) as any)}
              </Tag>
              {member.category && (
                <Tag color="blue">{getCategoryLabel(member.category)}</Tag>
              )}
              <Tag color={getLevelColor(((member as any).profile?.level) as any)}>
                {getLevelLabel(((member as any).profile?.level) as any)}
              </Tag>
            </Space>
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" size="small">
                <Text>
                  <MailOutlined /> {((member as any).profile?.email) || '-'}
                </Text>
                <Text>
                  <PhoneOutlined /> {((member as any).profile?.phone) || '-'}
                </Text>
                {(((member as any).jciCareer?.chapter) || member.chapter) && (
                  <Text>
                    <BankOutlined /> {((member as any).jciCareer?.chapter) || '-'}
                  </Text>
                )}
              </Space>
            </div>
          </Col>
        </Row>
      </Card>
      
      {/* Tabs */}
      <Card style={{ marginBottom: 16 }}>
        <Tabs
          tabBarExtraContent={
            showEditButton ? (
              isEditing ? (
                <Space size="small">
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
                    disabled={saving}
                  >
                    取消
                  </Button>
                </Space>
              ) : (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={handleStartEdit}
                >
                  编辑
                </Button>
              )
            ) : null
          }
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Row gutter={ROW_GUTTER} align="stretch">
                  <Col xs={24} md={16}>
      {/* Basic Information */}
                    <Card title="基本信息" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('name', '姓名', member.profile.name || member.name)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('phone', '电话', member.profile.phone)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('fullNameNric', '身份证全名', member.profile.fullNameNric)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('whatsappGroup', 'WhatsApp群组', (member as any).profile?.whatsappGroup)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('nricOrPassport', '身份证(或护照)', member.profile.nricOrPassport)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('email', '邮箱', member.profile.email || member.email)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('gender', '性别', member.profile.gender, 'select', [
                              { label: 'Male', value: 'Male' },
                              { label: 'Female', value: 'Female' },
                            ])}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('alternativePhone', '备用电话', member.profile.alternativePhone)}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    {/* 服装与物品 */}
                    <Card title="服装与物品" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={24}>
                            {renderField('cutting', '裁剪/版型', member.profile.cutting)}
                          </Col>
                          <Col xs={24} md={24}>
                            {renderField('shirtSize', 'T恤尺寸', member.profile.shirtSize)}
                          </Col>
                          <Col xs={24} md={24}>
                            {renderField('jacketSize', '夹克尺寸', member.profile.jacketSize)}
                          </Col>
                          <Col xs={24} md={24}>
                            {renderField('nameToBeEmbroidered', '刺绣名称', member.profile.nameToBeEmbroidered)}
                          </Col>
                          <Col xs={24} md={24}>
                            {renderField('tshirtReceivingStatus', 'T恤领取状态', member.profile.tshirtReceivingStatus)}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24}>
                    {/* 会籍日期与元数据 */}
                    <Card title="会籍日期与元数据" bordered={true}>
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>创建时间</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>
                                {(member as any).profile?.createdAt ? new Date((member as any).profile.createdAt).toLocaleString('zh-CN') : '-'}
                              </span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>更新时间</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>
                                {(member as any).profile?.updatedAt ? new Date((member as any).profile.updatedAt).toLocaleString('zh-CN') : '-'}
                              </span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>账户类型</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.accountType || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>个人状态</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.status || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>会员ID</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{member.profile.memberId || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>个人级别</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.level || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24} md={12}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>加入(旧)</span>
                            </Col>
                            <Col flex="auto">
                              <span style={{ fontSize: 13, color: '#000' }}>{(member as any).profile?.joinedDate || '-'}</span>
                            </Col>
                          </Row>
                        </Col>
                        <Col xs={24}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col flex="120px">
                              <span style={{ fontSize: 13, color: '#666' }}>类别标签</span>
                            </Col>
                            <Col flex="auto">
                              {Array.isArray((member as any).profile?.categories) && (member as any).profile.categories.length > 0 ? (
                                <Space wrap>
                                  {((member as any).profile.categories as string[]).map((c: string) => <Tag key={c}>{c}</Tag>)}
                                </Space>
                              ) : (
                                <span style={{ fontSize: 13, color: '#000' }}>-</span>
                              )}
                            </Col>
                          </Row>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'career-business',
              label: '职业商业',
              children: (
                <Row gutter={ROW_GUTTER}>
                  <Col xs={24}>
                    <Card title="职业与商业" bordered={true}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('company', '公司', (member as any).business?.company || member.profile.company)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('departmentAndPosition', '部门与职位', (member as any).business?.departmentAndPosition || member.profile.departmentAndPosition)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('industryDetail', '行业详情', (member as any).business?.industryDetail, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('companyWebsite', '公司网站', (member as any).business?.companyWebsite)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('ownIndustry', '所属行业', Array.isArray((member as any).business?.ownIndustry) ? (member as any).business.ownIndustry.join(', ') : '')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('linkedin', 'LinkedIn', member.profile.linkedin)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('interestedIndustries', '感兴趣行业', Array.isArray((member as any).business?.interestedIndustries) ? (member as any).business.interestedIndustries.join(', ') : '')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('businessCategories', '商业类别', Array.isArray((member as any).business?.businessCategories) ? (member as any).business.businessCategories.join(', ') : '')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('acceptInternationalBusiness', '接受国际业务', (member as any).business?.acceptInternationalBusiness, 'select', [
                              { label: 'Yes', value: 'Yes' },
                              { label: 'No', value: 'No' },
                              { label: 'Willing to explore', value: 'Willing to explore' },
                            ])}
                          </Col>
                          <Col xs={24}>
                            {renderField('companyIntro', '公司介绍', (member as any).business?.companyIntro, 'textarea', undefined, 'top')}
                          </Col>
                        </Row>
                      </Form>
      </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'jci',
              label: 'JCI发展',
              children: (
                <Row gutter={ROW_GUTTER} align="stretch">
                  <Col xs={24} md={8}>
      {/* Organization Information */}
                    <Card title="组织信息" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24}>
                            {renderField('worldRegion', '世界地区', (member as any).jciCareer?.worldRegion)}
                          </Col>
                          <Col xs={24}>
                            {renderField('countryRegion', '国家地区', (member as any).jciCareer?.countryRegion)}
                          </Col>
                          <Col xs={24}>
                            {renderField('country', '国家', (member as any).jciCareer?.country)}
                          </Col>
                          <Col xs={24}>
                            {renderField('chapter', '分会', (member as any).jciCareer?.chapter || member.chapter)}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={16}>
                    <Card title="JCI 会籍与任期" bordered={true} style={{ height: '100%' }}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('joinDate', '加入日期(JCI)', (member as any).jciCareer?.joinDate || member.joinDate, 'date')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('category', 'JCI 类别', (member as any).jciCareer?.category || member.category)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('introducerName', '介绍人', (member as any).jciCareer?.introducerName)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('jciPosition', 'JCI 职位', (member as any).jciCareer?.jciPosition)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('membershipCategory', '会员类别', (member as any).jciCareer?.membershipCategory)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('senatorId', '参议员编号', (member as any).jciCareer?.senatorId)}
                          </Col>
                        </Row>
                        <Divider style={{ margin: '16px 0' }} />
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('jciBenefitsExpectation', 'JCI 期望', (member as any).jciCareer?.jciBenefitsExpectation, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('jciEventInterests', 'JCI 兴趣', (member as any).jciCareer?.jciEventInterests, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('activeMemberHow', '成为活跃会员方式', (member as any).jciCareer?.activeMemberHow, 'textarea', undefined, 'top')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('fiveYearsVision', '五年愿景', (member as any).jciCareer?.fiveYearsVision, 'textarea', undefined, 'top')}
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24}>
                    <Card title="支付与背书" bordered={true}>
                      <Form form={form}>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            {renderField('paymentDate', '付款日期', (member as any).jciCareer?.paymentDate, 'date')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('paymentSlipUrl', '付款凭证链接', (member as any).jciCareer?.paymentSlipUrl)}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('paymentVerifiedDate', '付款验证日期', (member as any).jciCareer?.paymentVerifiedDate, 'date')}
                          </Col>
                          <Col xs={24} md={12}>
                            {renderField('endorsementDate', '背书日期', (member as any).jciCareer?.endorsementDate, 'date')}
                          </Col>
                        </Row>
                      </Form>
      </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'activities',
              label: '活动',
              children: (
                <Empty description="活动功能开发中" />
              ),
            },
            {
              key: 'tasks',
              label: '任务',
              children: (
                <Row gutter={ROW_GUTTER}>
                  <Col xs={24}>
                    <Card title="Leadership Development Pathway" bordered={true} style={{ marginBottom: 16 }}>
                      <div style={{ position: 'relative', padding: '40px 12px 20px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          {/* Connecting Line - positioned at the center of dots */}
                          <div style={{
                            position: 'absolute',
                            left: '4%',
                            right: '4%',
                            top: 12,
                            height: 3,
                            backgroundColor: '#1890ff',
                            zIndex: 1,
                          }} />
                          
                          {/* All Steps - Using flex to distribute evenly */}
                          {[
                            { label: 'New Member', color: '#faad14', isStart: true },
                            { label: 'Project Committee', color: '#ff7a00' },
                            { label: 'Organising Chairperson', color: '#ff7a00' },
                            { label: 'Commission Director', color: '#ff7a00' },
                            { label: 'Board of Director', color: '#ff4d4f' },
                            { label: 'Local President', color: '#ff4d4f' },
                            { label: 'Area Officer', color: '#eb2f96' },
                            { label: 'National Officer', color: '#722ed1' },
                            { label: 'International Officer', color: '#722ed1' },
                          ].map((step, index) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center',
                              flex: 1,
                              minWidth: 0,
                              position: 'relative',
                              zIndex: 10,
                            }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: step.color,
                                border: '3px solid #fff',
                                boxShadow: step.isStart ? '0 0 0 2px #1890ff' : '0 0 0 2px #1890ff',
                                position: 'relative',
                                zIndex: 10,
                              }} />
                              <div style={{ 
                                marginTop: 8, 
                                fontSize: 10, 
                                color: '#666', 
                                textAlign: 'center', 
                                width: '100%',
                                lineHeight: 1.2,
                                fontWeight: step.isStart ? 500 : 400,
                                wordBreak: 'break-word',
                                padding: '0 2px',
                              }}>
                                {step.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
      </Card>
                  </Col>
                  <Col xs={24}>
                    <Card title="Trainer Development Pathway" bordered={true}>
                      <div style={{ position: 'relative', padding: '40px 12px 20px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          {/* Connecting Line - positioned at the center of dots */}
                          <div style={{
                            position: 'absolute',
                            left: '6%',
                            right: '6%',
                            top: 12,
                            height: 3,
                            backgroundColor: '#1890ff',
                            zIndex: 1,
                          }} />
                          
                          {/* All Steps - Using flex to distribute evenly */}
                          {[
                            { label: 'New Member', color: '#faad14', isStart: true },
                            { label: 'JCI Trainer', color: '#73d13d' },
                            { label: 'JCI Malaysia Intermediate Trainer', color: '#389e0d' },
                            { label: 'JCI Malaysia Certified Trainer', color: '#13c2c2' },
                            { label: 'JCI Malaysia Principal Trainer', color: '#40a9ff' },
                            { label: 'JCI Malaysia Master Trainer', color: '#40a9ff' },
                          ].map((step, index) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center',
                              flex: 1,
                              minWidth: 0,
                              position: 'relative',
                              zIndex: 10,
                            }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: step.color,
                                border: '3px solid #fff',
                                boxShadow: step.isStart ? '0 0 0 2px #1890ff' : '0 0 0 2px #1890ff',
                                position: 'relative',
                                zIndex: 10,
                              }} />
                              <div style={{ 
                                marginTop: 8, 
                                fontSize: 10, 
                                color: '#666', 
                                textAlign: 'center', 
                                width: '100%',
                                lineHeight: 1.2,
                                fontWeight: step.isStart ? 500 : 400,
                                wordBreak: 'break-word',
                                padding: '0 2px',
                              }}>
                                {step.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'member-fees',
              label: '会费',
              children: member ? (
                <div style={{ padding: '16px 0' }}>
                  <MemberFeesTab memberId={member.id} />
                </div>
              ) : (
                <Empty description="会员信息缺失" />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default MemberDetailView;

