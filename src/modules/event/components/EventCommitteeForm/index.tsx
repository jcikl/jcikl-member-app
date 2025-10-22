import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, Card, Table, Switch, Popconfirm, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Event, CommitteeMember } from '../../types';
import { getMembers } from '../../../member/services/memberService';
import type { Member } from '../../../member/types';

const { Option } = Select;

// 默认职位选项
const DEFAULT_POSITIONS = [
  '筹委主席',
  '筹委秘书',
  '筹委财政',
  '筹委票务',
  '活动主席',
  '活动秘书',
  '活动财政',
  '活动票务',
];

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventCommitteeForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>(
    initialValues.committeeMembers || []
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // 加载会员列表
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const result = await getMembers({
        page: 1,
        limit: 1000,
        status: 'active', // 只加载活跃会员
      });
      setMembers(result.data);
    } catch (error) {
      console.error('加载会员列表失败:', error);
      message.error('加载会员列表失败');
    } finally {
      setLoadingMembers(false);
    }
  };

  const addCommitteeMember = () => {
    const newMember: CommitteeMember = {
      id: Date.now().toString(),
      name: '',
      position: '',
      contact: '',
      email: '',
      canEditEvent: false,
      canApproveTickets: false,
    };
    setCommitteeMembers([...committeeMembers, newMember]);
  };

  const removeCommitteeMember = (id: string) => {
    setCommitteeMembers(committeeMembers.filter(member => member.id !== id));
  };

  const updateCommitteeMember = (id: string, field: keyof CommitteeMember, value: any) => {
    setCommitteeMembers(committeeMembers.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  // 当选择会员时，自动填充联系方式和邮箱
  const handleMemberSelect = (memberId: string, record: CommitteeMember) => {
    const selectedMember = members.find(m => m.id === memberId);
    if (selectedMember) {
      setCommitteeMembers(committeeMembers.map(member => 
        member.id === record.id ? {
          ...member,
          name: selectedMember.name,
          contact: selectedMember.phone || member.contact,
          email: selectedMember.email || member.email,
        } : member
      ));
    }
  };

  const handleFinish = async () => {
    await onSubmit({ committeeMembers } as any);
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (_: unknown, _record: CommitteeMember, index: number) => index + 1,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: CommitteeMember) => (
        <Select
          value={name || undefined}
          onChange={(value) => {
            // 如果选择的是会员ID，自动填充信息
            const selectedMember = members.find(m => m.id === value);
            if (selectedMember) {
              handleMemberSelect(value, record);
            } else {
              // 如果是手动输入的名字
              updateCommitteeMember(record.id, 'name', value);
            }
          }}
          placeholder="请选择会员"
          style={{ width: '100%' }}
          showSearch
          allowClear
          loading={loadingMembers}
          filterOption={(input, option) => {
            const label = option?.children?.toString() || '';
            return label.toLowerCase().includes(input.toLowerCase());
          }}
          notFoundContent={loadingMembers ? '加载中...' : '无匹配会员'}
        >
          {members.map(m => (
            <Option key={m.id} value={m.id}>
              {m.name} - {m.email}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      width: 180,
      render: (position: string, record: CommitteeMember) => (
        <Select
          value={position}
          onChange={(value) => updateCommitteeMember(record.id, 'position', value)}
          placeholder="请选择职位"
          style={{ width: '100%' }}
          showSearch
          allowClear
          filterOption={(input, option) => {
            const label = option?.children?.toString() || '';
            return label.toLowerCase().includes(input.toLowerCase());
          }}
        >
          {DEFAULT_POSITIONS.map(pos => (
            <Option key={pos} value={pos}>
              {pos}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
      width: 150,
      render: (contact: string, record: CommitteeMember) => (
        <Input
          value={contact}
          onChange={(e) => updateCommitteeMember(record.id, 'contact', e.target.value)}
          placeholder="请输入联系方式"
        />
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email: string, record: CommitteeMember) => (
        <Input
          value={email}
          onChange={(e) => updateCommitteeMember(record.id, 'email', e.target.value)}
          placeholder="请输入邮箱"
        />
      ),
    },
    {
      title: '活动编辑权限',
      dataIndex: 'canEditEvent',
      key: 'canEditEvent',
      width: 120,
      render: (canEditEvent: boolean, record: CommitteeMember) => (
        <Switch
          checked={canEditEvent}
          onChange={(checked) => updateCommitteeMember(record.id, 'canEditEvent', checked)}
        />
      ),
    },
    {
      title: '票务批准权限',
      dataIndex: 'canApproveTickets',
      key: 'canApproveTickets',
      width: 120,
      render: (canApproveTickets: boolean, record: CommitteeMember) => (
        <Switch
          checked={canApproveTickets}
          onChange={(checked) => updateCommitteeMember(record.id, 'canApproveTickets', checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: CommitteeMember) => (
        <Popconfirm
          title="确定删除这个委员会成员吗？"
          onConfirm={() => removeCommitteeMember(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Card title="委员会成员" className="mb-4">
        <div className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={addCommitteeMember}>
            + 添加委员会成员
          </Button>
        </div>
        
        <Table
          columns={columns}
          dataSource={committeeMembers}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleFinish} loading={loading}>
            保存委员会成员
          </Button>
        </Space>
      </Form.Item>
    </div>
  );
};

export default EventCommitteeForm;


