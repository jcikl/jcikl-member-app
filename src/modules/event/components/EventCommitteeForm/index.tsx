import React, { useState } from 'react';
import { Form, Input, Button, Space, Card, Table, Switch, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Event, CommitteeMember } from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventCommitteeForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const formConfig = globalComponentService.getFormConfig();
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>(
    initialValues.committeeMembers || []
  );

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

  const handleFinish = async () => {
    await onSubmit({ committeeMembers } as any);
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (_: any, record: CommitteeMember, index: number) => index + 1,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: CommitteeMember) => (
        <Input
          value={name}
          onChange={(e) => updateCommitteeMember(record.id, 'name', e.target.value)}
          placeholder="请输入姓名"
        />
      ),
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      width: 150,
      render: (position: string, record: CommitteeMember) => (
        <Input
          value={position}
          onChange={(e) => updateCommitteeMember(record.id, 'position', e.target.value)}
          placeholder="请输入职位"
        />
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
      render: (_, record: CommitteeMember) => (
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


