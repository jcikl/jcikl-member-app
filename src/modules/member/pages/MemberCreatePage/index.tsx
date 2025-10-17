/**
 * Member Create Page
 * 会员创建页面
 */

import React, { useState } from 'react';
import { Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';


// Components
import { PageHeader, DynamicFormBuilder, PermissionGuard } from '@/components';
import type { FormSchema } from '@/components';

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

  const handleBack = () => {
    navigate('/members');
  };

  // 表单配置
  const formSchema: FormSchema = {
    id: 'member-create-form',
    name: '创建会员',
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
        placeholder: '自动生成或手动输入',
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
        defaultValue: 'pending',
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
        defaultValue: 'bronze',
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
        category: values.category,
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
        
        <Card style={{ marginTop: 16 }} className="content-card">
          <DynamicFormBuilder
            mode="fill"
            schema={formSchema}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default MemberCreatePage;