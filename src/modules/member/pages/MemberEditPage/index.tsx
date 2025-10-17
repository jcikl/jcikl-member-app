/**
 * Member Edit Page
 * 会员编辑页面
 */

import React, { useState, useEffect } from 'react';
import { Spin, message, Card } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';


// Components
import { PageHeader, DynamicFormBuilder, PermissionGuard } from '@/components';
import type { FormSchema } from '@/components';

// Services
import { getMemberById, updateMember, checkEmailExists, checkPhoneExists } from '../../services/memberService';
import { useAuthStore } from '@/stores/authStore';

// Types
import type { Member, MemberFormData } from '../../types';

/**
 * Member Edit Page Component
 * 会员编辑页面组件
 */
export const MemberEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMember();
    }
  }, [id]);

  const fetchMember = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const memberData = await getMemberById(id);
      if (memberData) {
        setMember(memberData);
      } else {
        message.error('会员信息不存在');
        navigate('/members');
      }
    } catch (error) {
      console.error('获取会员信息失败:', error);
      message.error('获取会员信息失败');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/members');
  };

  // 表单配置
  const formSchema: FormSchema = {
    id: 'member-edit-form',
    name: '编辑会员',
    fields: [
      {
        id: 'name',
        name: 'name',
        label: '姓名',
        type: 'text',
        order: 1,
        required: true,
        placeholder: '请输入姓名',
        validation: [
          { type: 'required', message: '请输入姓名' },
          { type: 'min', value: 2, message: '姓名至少2个字符' },
          { type: 'max', value: 50, message: '姓名最多50个字符' },
        ],
      },
      {
        id: 'email',
        name: 'email',
        label: '邮箱',
        type: 'text',
        order: 2,
        required: true,
        placeholder: '请输入邮箱',
        validation: [
          { type: 'required', message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ],
      },
      {
        id: 'phone',
        name: 'phone',
        label: '电话',
        type: 'text',
        order: 3,
        required: true,
        placeholder: '请输入电话号码',
        validation: [
          { type: 'required', message: '请输入电话' },
        ],
      },
      {
        id: 'memberId',
        name: 'memberId',
        label: '会员ID',
        type: 'text',
        order: 4,
        placeholder: '会员ID',
      },
      {
        id: 'status',
        name: 'status',
        label: '状态',
        type: 'select',
        order: 5,
        required: true,
        options: [
          { label: '待审核', value: 'pending' },
          { label: '活跃', value: 'active' },
          { label: '非活跃', value: 'inactive' },
          { label: '暂停', value: 'suspended' },
        ],
      },
      {
        id: 'category',
        name: 'category',
        label: '分类',
        type: 'select',
        order: 6,
        options: [
          { label: '正式会员', value: 'official' },
          { label: '准会员', value: 'associate' },
          { label: '荣誉会员', value: 'honorary' },
          { label: '访问会员', value: 'visiting' },
        ],
      },
      {
        id: 'level',
        name: 'level',
        label: '级别',
        type: 'select',
        order: 7,
        options: [
          { label: '铜级', value: 'bronze' },
          { label: '银级', value: 'silver' },
          { label: '金级', value: 'gold' },
          { label: '钻石级', value: 'diamond' },
        ],
      },
      {
        id: 'chapter',
        name: 'chapter',
        label: '分会',
        type: 'text',
        order: 8,
        placeholder: '请输入分会名称',
      },
    ],
  };

  /**
   * 获取表单初始值
   */
  const getInitialValues = () => {
    if (!member) return {};
    
    return {
      name: member.name,
      email: member.email,
      phone: member.phone,
      memberId: member.memberId,
      status: member.status,
      category: member.category,
      level: member.level,
      chapter: member.chapter,
      avatar: member.profile?.avatar,
      birthDate: member.profile?.birthDate,
      gender: member.profile?.gender,
      company: member.profile?.company,
      departmentAndPosition: member.profile?.departmentAndPosition,
      joinDate: member.joinDate,
    };
  };

  const handleSubmit = async (values: any) => {
    if (!user || !member) {
      message.error('用户未登录或会员信息不存在');
      return;
    }

    setSubmitting(true);
    try {
      // 验证邮箱唯一性（排除当前会员）
      if (values.email && values.email !== member.email) {
        const emailExists = await checkEmailExists(values.email);
        if (emailExists) {
          message.error('该邮箱已被使用');
          return;
        }
      }

      // 验证电话唯一性（排除当前会员）
      if (values.phone && values.phone !== member.phone) {
        const phoneExists = await checkPhoneExists(values.phone);
        if (phoneExists) {
          message.error('该电话号码已被使用');
          return;
        }
      }

      // 更新会员数据
      const updateData: Partial<MemberFormData> = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        status: values.status,
        category: values.category,
        level: values.level,
        chapter: values.chapter,
      };

      await updateMember(member.id, updateData, user.id || '');
      message.success('会员信息更新成功');
      navigate('/members');
    } catch (error) {
      console.error('更新会员信息失败:', error);
      message.error('更新会员信息失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <PermissionGuard permissions="MEMBER_EDIT">
      <div>
        <PageHeader
          title={`编辑会员 - ${member?.name}`}
          onBack={handleBack}
        />
        
        <Card style={{ marginTop: 16 }} className="content-card">
          <DynamicFormBuilder
            mode="fill"
            schema={formSchema}
            initialValues={getInitialValues()}
            onSubmit={handleSubmit}
            loading={submitting}
          />
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default MemberEditPage;