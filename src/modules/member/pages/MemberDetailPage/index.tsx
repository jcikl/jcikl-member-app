/**
 * Member Detail Page
 * 会员详情页面
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
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components';
import { getMemberById, deleteMember } from '../../services/memberService';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import type { Member } from '../../types';
import { 
  MEMBER_STATUS_OPTIONS, 
  MEMBER_CATEGORY_OPTIONS, 
  MEMBER_LEVEL_OPTIONS 
} from '../../types';
import './styles.css';

const { Title, Text } = Typography;

/**
 * Member Detail Page Component
 */
const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // ========== Data Fetching ==========
  
  useEffect(() => {
    if (!id) {
      message.error('会员ID无效');
      navigate('/members');
      return;
    }
    
    fetchMemberDetail();
  }, [id]);
  
  const fetchMemberDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getMemberById(id);
      if (!data) {
        message.error('会员不存在');
        navigate('/members');
        return;
      }
      setMember(data);
    } catch (error) {
      message.error('获取会员信息失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ========== Actions ==========
  
  const handleBack = () => {
    navigate('/members');
  };
  
  const handleEdit = () => {
    navigate(`/members/${id}/edit`);
  };
  
  const handleDelete = () => {
    if (!member) return;
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除会员 "${member.name}" 吗？此操作不可撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const result = await handleAsyncOperation(
          () => deleteMember(member.id),
          '会员删除成功',
          '会员删除失败'
        );
        
        if (result !== null) {
          navigate('/members');
        }
      },
    });
  };

  // ========== Helper Functions ==========
  
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

  // ========== Render ==========
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ marginBottom: 16 }}>加载中...</div>
        <Spin size="large" />
      </div>
    );
  }
  
  if (!member) {
    return null;
  }
  
  return (
    <div className="member-detail-page">
      <PageHeader
        title="会员详情"
        onBack={handleBack}
        extra={[
          <Button key="edit" icon={<EditOutlined />} onClick={handleEdit}>
            编辑
          </Button>,
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>,
        ]}
      />
      
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
      
      {/* Basic Information */}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="会员ID">{member.profile.memberId}</Descriptions.Item>
          <Descriptions.Item label="姓名">{member.profile.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{member.profile.email}</Descriptions.Item>
          <Descriptions.Item label="电话">{member.profile.phone}</Descriptions.Item>
          <Descriptions.Item label="性别">
            {member.profile.gender || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="出生日期">
            {member.profile.birthDate || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国籍">
            {member.profile.nationality || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备用电话">
            {member.profile.alternativePhone || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="身份证(或护照)">
            {member.profile.nricOrPassport || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="身份证全名">
            {member.profile.fullNameNric || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="LinkedIn">
            {member.profile.linkedin ? (
              <a href={member.profile.linkedin} target="_blank" rel="noopener noreferrer">{member.profile.linkedin}</a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="头像链接">
            {member.profile.profilePhotoUrl ? (
              <a href={member.profile.profilePhotoUrl} target="_blank" rel="noopener noreferrer">打开</a>
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      {/* Organization Information */}
      <Card title="组织信息" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="分会">
            {(member as any).jciCareer?.chapter || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="分会ID">
            {(member as any).jciCareer?.chapterId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国家地区">
            {(member as any).jciCareer?.countryRegion || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国家">
            {(member as any).jciCareer?.country || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="世界地区">
            {(member as any).jciCareer?.worldRegion || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="JCI职位">
            {(member as any).jciCareer?.jciPosition || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      {/* Career & Business */}
      <Card title="职业与商业" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered>
          <Descriptions.Item label="公司">
            {(member as any).business?.company || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="部门与职位">
            {(member as any).business?.departmentAndPosition || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="行业详情" span={2}>
            {(member as any).business?.industryDetail || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="公司介绍" span={2}>
            {(member as any).business?.companyIntro || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="公司网站" span={2}>
            {(member as any).business?.companyWebsite ? (
              <a href={(member as any).business.companyWebsite} target="_blank" rel="noopener noreferrer">{(member as any).business.companyWebsite}</a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属行业" span={2}>
            {(member as any).business?.ownIndustry?.length 
              ? (member as any).business.ownIndustry.map((ind: string) => (
                  <Tag key={ind}>{ind}</Tag>
                ))
              : '-'
            }
          </Descriptions.Item>
          <Descriptions.Item label="感兴趣行业" span={2}>
            {(member as any).business?.interestedIndustries?.length 
              ? (member as any).business.interestedIndustries.map((ind: string) => (
                  <Tag key={ind}>{ind}</Tag>
                ))
              : '-'
            }
          </Descriptions.Item>
          <Descriptions.Item label="商业类别" span={2}>
            {(member as any).business?.businessCategories?.length 
              ? (member as any).business.businessCategories.map((cat: string) => (
                  <Tag key={cat}>{cat}</Tag>
                ))
              : '-'
            }
          </Descriptions.Item>
          <Descriptions.Item label="接受国际业务">
            {(member as any).business?.acceptInternationalBusiness || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 服装与物品 */}
      <Card title="服装与物品" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered>
          <Descriptions.Item label="T恤尺寸">
            {member.profile.shirtSize || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="夹克尺寸">
            {member.profile.jacketSize || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="刺绣名称" span={2}>
            {member.profile.nameToBeEmbroidered || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="T恤领取状态" span={2}>
            {member.profile.tshirtReceivingStatus || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="裁剪/版型" span={2}>
            {member.profile.cutting || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      {/* Membership Dates */}
      <Card title="JCI 会籍与任期" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="JCI 类别">{(member as any).jciCareer?.category || '-'}</Descriptions.Item>
          <Descriptions.Item label="会员类别">{(member as any).jciCareer?.membershipCategory || '-'}</Descriptions.Item>
          <Descriptions.Item label="分配者">{(member as any).jciCareer?.categoryAssignedBy || '-'}</Descriptions.Item>
          <Descriptions.Item label="分配日期">{(member as any).jciCareer?.categoryAssignedDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="分配原因" span={2}>{(member as any).jciCareer?.categoryReason || '-'}</Descriptions.Item>
          <Descriptions.Item label="JCI 职位">{(member as any).jciCareer?.jciPosition || '-'}</Descriptions.Item>
          <Descriptions.Item label="任期开始">{(member as any).jciCareer?.termStartDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="任期结束">{(member as any).jciCareer?.termEndDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="职位开始">{(member as any).jciCareer?.positionStartDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="职位结束">{(member as any).jciCareer?.positionEndDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="加入日期(JCI)">{(member as any).jciCareer?.joinDate || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="支付与背书" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="付款日期">{(member as any).jciCareer?.paymentDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="付款凭证链接">
            {(member as any).jciCareer?.paymentSlipUrl ? (
              <a href={(member as any).jciCareer.paymentSlipUrl} target="_blank" rel="noopener noreferrer">打开</a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="付款验证日期">{(member as any).jciCareer?.paymentVerifiedDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="背书日期">{(member as any).jciCareer?.endorsementDate || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="JCI 关系与期望" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="介绍人">{(member as any).jciCareer?.introducerName || '-'}</Descriptions.Item>
          <Descriptions.Item label="参议员编号">{(member as any).jciCareer?.senatorId || '-'}</Descriptions.Item>
          <Descriptions.Item label="JCI 期望" span={2}>{(member as any).jciCareer?.jciBenefitsExpectation || '-'}</Descriptions.Item>
          <Descriptions.Item label="JCI 兴趣" span={2}>{(member as any).jciCareer?.jciEventInterests || '-'}</Descriptions.Item>
          <Descriptions.Item label="成为活跃会员方式" span={2}>{(member as any).jciCareer?.activeMemberHow || '-'}</Descriptions.Item>
          <Descriptions.Item label="五年愿景" span={2}>{(member as any).jciCareer?.fiveYearsVision || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="会籍日期与元数据">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="创建时间">
            {(member as any).profile?.createdAt ? new Date((member as any).profile.createdAt).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {(member as any).profile?.updatedAt ? new Date((member as any).profile.updatedAt).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="账户类型">{(member as any).profile?.accountType || '-'}</Descriptions.Item>
          <Descriptions.Item label="个人状态">{(member as any).profile?.status || '-'}</Descriptions.Item>
          <Descriptions.Item label="个人级别">{(member as any).profile?.level || '-'}</Descriptions.Item>
          <Descriptions.Item label="加入(旧)">{(member as any).profile?.joinedDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="个人邮箱">{(member as any).profile?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="个人电话">{(member as any).profile?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="WhatsApp群组">{(member as any).profile?.whatsappGroup || '-'}</Descriptions.Item>
          <Descriptions.Item label="类别标签" span={2}>
            {Array.isArray((member as any).profile?.categories) && (member as any).profile.categories.length > 0 ? (
              ((member as any).profile.categories as string[]).map((c: string) => <Tag key={c}>{c}</Tag>)
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default MemberDetailPage;

