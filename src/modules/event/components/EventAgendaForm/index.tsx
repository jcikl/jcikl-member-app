import React, { useState } from 'react';
import { Form, Input, Button, Space, Card, Table, DatePicker, InputNumber, Switch, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Event, EventAgendaItem } from '../../types';
import { globalComponentService } from '@/config/globalComponentSettings';

interface Props {
  initialValues: Event;
  onSubmit: (values: Partial<Event>) => Promise<void>;
  loading?: boolean;
}

const EventAgendaForm: React.FC<Props> = ({ initialValues, onSubmit, loading }) => {
  const formConfig = globalComponentService.getFormConfig();
  const [agendaItems, setAgendaItems] = useState<EventAgendaItem[]>(
    initialValues.agendaItems || []
  );

  const addAgendaItem = () => {
    const newItem: EventAgendaItem = {
      id: Date.now().toString(),
      sequence: agendaItems.length + 1,
      startTime: '',
      duration: 30,
      content: '',
      host: '',
      maxSeats: undefined,
      requiresRegistration: false,
      isCompetition: false,
    };
    setAgendaItems([...agendaItems, newItem]);
  };

  const removeAgendaItem = (id: string) => {
    setAgendaItems(agendaItems.filter(item => item.id !== id));
  };

  const updateAgendaItem = (id: string, field: keyof EventAgendaItem, value: any) => {
    setAgendaItems(agendaItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleFinish = async () => {
    await onSubmit({ agendaItems } as any);
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 80,
      render: (sequence: number, record: EventAgendaItem) => (
        <InputNumber
          min={1}
          value={sequence}
          onChange={(value) => updateAgendaItem(record.id, 'sequence', value)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 200,
      render: (startTime: string, record: EventAgendaItem) => (
        <DatePicker
          showTime
          value={startTime ? dayjs(startTime) : undefined}
          onChange={(date) => updateAgendaItem(record.id, 'startTime', date?.toISOString())}
          style={{ width: '100%' }}
          placeholder="选择时间"
        />
      ),
    },
    {
      title: '时长(分钟)',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (duration: number, record: EventAgendaItem) => (
        <InputNumber
          min={1}
          value={duration}
          onChange={(value) => updateAgendaItem(record.id, 'duration', value)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '程序内容',
      dataIndex: 'content',
      key: 'content',
      render: (content: string, record: EventAgendaItem) => (
        <Input
          value={content}
          onChange={(e) => updateAgendaItem(record.id, 'content', e.target.value)}
          placeholder="请输入程序内容"
        />
      ),
    },
    {
      title: '主持人',
      dataIndex: 'host',
      key: 'host',
      width: 150,
      render: (host: string, record: EventAgendaItem) => (
        <Input
          value={host}
          onChange={(e) => updateAgendaItem(record.id, 'host', e.target.value)}
          placeholder="请输入主持人"
        />
      ),
    },
    {
      title: '最大座位数',
      dataIndex: 'maxSeats',
      key: 'maxSeats',
      width: 120,
      render: (maxSeats: number, record: EventAgendaItem) => (
        <InputNumber
          min={0}
          value={maxSeats}
          onChange={(value) => updateAgendaItem(record.id, 'maxSeats', value)}
          style={{ width: '100%' }}
          placeholder="座位数"
        />
      ),
    },
    {
      title: '需要注册',
      dataIndex: 'requiresRegistration',
      key: 'requiresRegistration',
      width: 100,
      render: (requiresRegistration: boolean, record: EventAgendaItem) => (
        <Switch
          checked={requiresRegistration}
          onChange={(checked) => updateAgendaItem(record.id, 'requiresRegistration', checked)}
        />
      ),
    },
    {
      title: '竞赛项目',
      dataIndex: 'isCompetition',
      key: 'isCompetition',
      width: 100,
      render: (isCompetition: boolean, record: EventAgendaItem) => (
        <Switch
          checked={isCompetition}
          onChange={(checked) => updateAgendaItem(record.id, 'isCompetition', checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record: EventAgendaItem) => (
        <Popconfirm
          title="确定删除这个议程项目吗？"
          onConfirm={() => removeAgendaItem(record.id)}
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
      <Card title="程序安排" className="mb-4">
        <Row gutter={16} className="mb-4">
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={addAgendaItem}>
              添加程序安排
            </Button>
          </Col>
          <Col>
            <Button type="default">
              导入会议模板
            </Button>
          </Col>
        </Row>
        
        <Table
          columns={columns}
          dataSource={agendaItems}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleFinish} loading={loading}>
            保存程序安排
          </Button>
        </Space>
      </Form.Item>
    </div>
  );
};

export default EventAgendaForm;


