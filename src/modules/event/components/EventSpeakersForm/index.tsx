import React, { useState } from 'react';
import { Form, Input, Button, Space, Card, Table, Popconfirm, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { Event, Speaker } from '../../types';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventSpeakersForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const [speakers, setSpeakers] = useState<Speaker[]>(
    initialValues.speakers || []
  );

  const addSpeaker = () => {
    const newSpeaker: Speaker = {
      id: Date.now().toString(),
      name: '',
      title: '',
      bio: '',
      photo: '',
      contact: '',
      email: '',
    };
    setSpeakers([...speakers, newSpeaker]);
  };

  const removeSpeaker = (id: string) => {
    setSpeakers(speakers.filter(speaker => speaker.id !== id));
  };

  const updateSpeaker = (id: string, field: keyof Speaker, value: any) => {
    setSpeakers(speakers.map(speaker => 
      speaker.id === id ? { ...speaker, [field]: value } : speaker
    ));
  };

  const handleFinish = async () => {
    await onSubmit({ speakers } as any);
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (_: unknown, _record: Speaker, index: number) => index + 1,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: Speaker) => (
        <Input
          value={name}
          onChange={(e) => updateSpeaker(record.id, 'name', e.target.value)}
          placeholder="请输入姓名"
        />
      ),
    },
    {
      title: '职位/头衔',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      render: (title: string, record: Speaker) => (
        <Input
          value={title}
          onChange={(e) => updateSpeaker(record.id, 'title', e.target.value)}
          placeholder="请输入职位/头衔"
        />
      ),
    },
    {
      title: '简介',
      dataIndex: 'bio',
      key: 'bio',
      width: 200,
      render: (bio: string, record: Speaker) => (
        <Input.TextArea
          value={bio}
          onChange={(e) => updateSpeaker(record.id, 'bio', e.target.value)}
          placeholder="请输入简介"
          rows={2}
        />
      ),
    },
    {
      title: '照片',
      dataIndex: 'photo',
      key: 'photo',
      width: 120,
      render: (photo: string, record: Speaker) => (
        <Upload
          listType="picture-card"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={(info) => {
            if (info.file) {
              // 这里应该上传到云存储并获取URL
              updateSpeaker(record.id, 'photo', info.file.name);
            }
          }}
          fileList={photo ? [{
            uid: record.id,
            name: photo,
            status: 'done',
            url: photo,
          }] : []}
        >
          {photo ? (
            <img src={photo} alt="speaker" style={{ width: '100%' }} />
          ) : (
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>上传</div>
            </div>
          )}
        </Upload>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
      width: 150,
      render: (contact: string, record: Speaker) => (
        <Input
          value={contact}
          onChange={(e) => updateSpeaker(record.id, 'contact', e.target.value)}
          placeholder="请输入联系方式"
        />
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email: string, record: Speaker) => (
        <Input
          value={email}
          onChange={(e) => updateSpeaker(record.id, 'email', e.target.value)}
          placeholder="请输入邮箱"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Speaker) => (
        <Popconfirm
          title="确定删除这个讲师吗？"
          onConfirm={() => removeSpeaker(record.id)}
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
      <Card title="讲师信息" className="mb-4">
        <div className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={addSpeaker}>
            + 添加讲师
          </Button>
        </div>
        
        <Table
          columns={columns}
          dataSource={speakers}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleFinish} loading={loading}>
            保存讲师信息
          </Button>
        </Space>
      </Form.Item>
    </div>
  );
};

export default EventSpeakersForm;


