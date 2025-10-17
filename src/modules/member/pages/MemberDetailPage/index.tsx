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
        <Spin size="large" tip="加载中..." />
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
              {member.name}
            </Title>
            <Space size="middle" wrap>
              <Tag color={getStatusColor(member.status)}>
                {getStatusLabel(member.status)}
              </Tag>
              {member.category && (
                <Tag color="blue">{getCategoryLabel(member.category)}</Tag>
              )}
              <Tag color={getLevelColor(member.level)}>
                {getLevelLabel(member.level)}
              </Tag>
            </Space>
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" size="small">
                <Text>
                  <MailOutlined /> {member.email}
                </Text>
                <Text>
                  <PhoneOutlined /> {member.phone}
                </Text>
                {member.chapter && (
                  <Text>
                    <BankOutlined /> {member.chapter}
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
          <Descriptions.Item label="会员ID">{member.memberId}</Descriptions.Item>
          <Descriptions.Item label="姓名">{member.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{member.email}</Descriptions.Item>
          <Descriptions.Item label="电话">{member.phone}</Descriptions.Item>
          <Descriptions.Item label="性别">
            {member.profile.gender || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="出生日期">
            {member.profile.birthDate || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="身份证号">
            {member.profile.nric || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国籍">
            {member.profile.nationality || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备用电话">
            {member.profile.alternativePhone || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      {/* Organization Information */}
      <Card title="组织信息" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="分会">
            {member.chapter || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="分会ID">
            {member.chapterId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国家地区">
            {member.countryRegion || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国家">
            {member.country || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="世界地区">
            {member.worldRegion || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="JCI职位">
            {member.profile.jciPosition || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      {/* Career & Business */}
      <Card title="职业与商业" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered>
          <Descriptions.Item label="公司">
            {member.profile.company || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="部门与职位">
            {member.profile.departmentAndPosition || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="行业详情" span={2}>
            {member.profile.industryDetail || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="公司介绍" span={2}>
            {member.profile.companyIntro || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属行业" span={2}>
            {member.profile.ownIndustry?.length 
              ? member.profile.ownIndustry.map(ind => (
                  <Tag key={ind}>{ind}</Tag>
                ))
              : '-'
            }
          </Descriptions.Item>
          <Descriptions.Item label="感兴趣行业" span={2}>
            {member.profile.interestedIndustries?.length 
              ? member.profile.interestedIndustries.map(ind => (
                  <Tag key={ind}>{ind}</Tag>
                ))
              : '-'
            }
          </Descriptions.Item>
          <Descriptions.Item label="商业类别" span={2}>
            {member.profile.businessCategories?.length 
              ? member.profile.businessCategories.map(cat => (
                  <Tag key={cat}>{cat}</Tag>
                ))
              : '-'
            }
          </Descriptions.Item>
          <Descriptions.Item label="接受国际业务">
            {member.profile.acceptInternationalBusiness || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      {/* Membership Dates */}
      <Card title="会籍日期">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="加入日期">
            {member.joinDate ? new Date(member.joinDate).toLocaleDateString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="续期日期">
            {member.renewalDate ? new Date(member.renewalDate).toLocaleDateString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="到期日期">
            {member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {member.createdAt ? new Date(member.createdAt).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {member.updatedAt ? new Date(member.updatedAt).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default MemberDetailPage;

