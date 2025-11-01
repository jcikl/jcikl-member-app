/**
 * Profile Page
 * 个人资料页面
 * 
 * 显示当前登录用户的会员资料（基于共享的 MemberDetailView 组件）
 */

import React, { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components';
import { getMemberById } from '@/modules/member/services/memberService';
import { useAuthStore } from '@/stores/authStore';
import { MemberDetailView } from '@/modules/member/components/MemberDetailView';
import type { Member } from '@/modules/member/types';

/**
 * Profile Page Component
 */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

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
      message.error('加载个人资料失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updatedMember: Member) => {
    setMember(updatedMember);
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
    <div className="profile-page">
      <PageHeader title="个人资料" />
      
      <MemberDetailView
        member={member}
        currentUserId={user.id}
        onUpdate={handleUpdate}
        showEditButton={true}
      />
    </div>
  );
};

export default ProfilePage;
