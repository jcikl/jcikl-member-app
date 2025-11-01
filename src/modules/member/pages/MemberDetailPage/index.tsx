/**
 * Member Detail Page
 * 会员详情页面
 */

import React, { useState, useEffect } from 'react';
import { Button, Spin, message, Modal } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components';
import { getMemberById, deleteMember } from '../../services/memberService';
import { handleAsyncOperation } from '@/utils/errorHelpers';
import { useAuthStore } from '@/stores/authStore';
import { MemberDetailView } from '../../components/MemberDetailView';
import type { Member } from '../../types';
import './styles.css';

/**
 * Member Detail Page Component
 */
const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
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
    
    console.log(`🟢 [MemberDetailPage] Loading member with route id: ${id}`);
    
    setLoading(true);
    try {
      const data = await getMemberById(id);
      if (!data) {
        console.log(`❌ [MemberDetailPage] No member data returned`);
        message.error('会员不存在');
        navigate('/members');
        return;
      }
      
      console.log(`✅ [MemberDetailPage] Member loaded:`, {
        id: data.id,
        email: data.email,
        name: data.name,
        category: data.category,
        hasProfile: !!data.profile,
        hasBusiness: !!data.business,
        hasJciCareer: !!data.jciCareer,
      });
      
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

  const handleUpdate = async (updatedMember: Member) => {
    console.log('✅ [MemberDetailPage] 收到更新通知，重新加载会员数据');
    // 重新获取最新数据以确保同步
    await fetchMemberDetail();
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
  
  if (!member || !user) {
    return null;
  }
  
  return (
    <div className="member-detail-page">
      <PageHeader
        title="会员详情"
        onBack={handleBack}
        extra={[
          <Button 
            key="delete" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={handleDelete}
          >
            删除
          </Button>,
        ]}
      />
      
      <MemberDetailView
        member={member}
        currentUserId={user.id}
        onUpdate={handleUpdate}
        showEditButton={true}
      />
    </div>
  );
};

export default MemberDetailPage;
