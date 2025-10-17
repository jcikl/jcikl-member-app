/**
 * DetailDrawer Usage Example
 * DetailDrawer 组件使用示例
 */

import React, { useState } from 'react';
import { Button, Card, Space, Descriptions, Avatar, Timeline, Tag } from 'antd';
import {
  UserOutlined,
  HistoryOutlined,
  ProjectOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { DetailDrawer } from './index';
import type { TabConfig, ActionButton } from './types';

/**
 * DetailDrawer 示例页面
 */
export const DetailDrawerExample: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * 基本信息标签页内容
   */
  const BasicInfoContent = () => (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        {/* 头像 */}
        <div style={{ textAlign: 'center' }}>
          <Avatar size={128} icon={<UserOutlined />} />
        </div>

        {/* 详细信息 */}
        <div style={{ flex: 1 }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="会员编号">JCIKL-12345</Descriptions.Item>
            <Descriptions.Item label="入会日期">2023-01-15</Descriptions.Item>
            <Descriptions.Item label="邮箱">john.doe@email.com</Descriptions.Item>
            <Descriptions.Item label="电话号码">+60 12-345 6789</Descriptions.Item>
            <Descriptions.Item label="会员类别">
              <Tag color="blue">正式会员</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="职位">
              <Tag color="green">主席</Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </div>
  );

  /**
   * 历史记录标签页内容
   */
  const HistoryContent = () => (
    <div style={{ padding: '0 24px 24px' }}>
      <Timeline
        items={[
          {
            color: 'green',
            children: (
              <>
                <p><strong>会员状态变更</strong></p>
                <p style={{ color: '#8c8c8c' }}>2024-01-15 10:30</p>
                <p>由"准会员"升级为"正式会员"</p>
              </>
            ),
          },
          {
            color: 'blue',
            children: (
              <>
                <p><strong>参加活动</strong></p>
                <p style={{ color: '#8c8c8c' }}>2024-01-10 14:00</p>
                <p>参加了"2024年年度大会"</p>
              </>
            ),
          },
          {
            color: 'blue',
            children: (
              <>
                <p><strong>任务完成</strong></p>
                <p style={{ color: '#8c8c8c' }}>2024-01-05 09:15</p>
                <p>完成了"会员招募"任务</p>
              </>
            ),
          },
          {
            children: (
              <>
                <p><strong>会员注册</strong></p>
                <p style={{ color: '#8c8c8c' }}>2023-01-15 08:00</p>
                <p>完成会员注册</p>
              </>
            ),
          },
        ]}
      />
    </div>
  );

  /**
   * 项目参与标签页内容
   */
  const ProjectsContent = () => (
    <div style={{ padding: '0 24px 24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="small" title="社区服务项目" extra={<Tag color="green">进行中</Tag>}>
          <p>负责角色：项目经理</p>
          <p>参与时间：2024-01-01 至今</p>
        </Card>
        
        <Card size="small" title="青年领袖培训" extra={<Tag color="blue">已完成</Tag>}>
          <p>负责角色：培训讲师</p>
          <p>参与时间：2023-06-01 - 2023-12-31</p>
        </Card>
        
        <Card size="small" title="会员招募计划" extra={<Tag color="orange">计划中</Tag>}>
          <p>负责角色：团队成员</p>
          <p>参与时间：2024-03-01 开始</p>
        </Card>
      </Space>
    </div>
  );

  /**
   * 标签页配置
   */
  const tabs: TabConfig[] = [
    {
      key: 'basic',
      label: '基本信息',
      icon: <UserOutlined />,
      content: <BasicInfoContent />,
    },
    {
      key: 'history',
      label: '历史记录',
      icon: <HistoryOutlined />,
      content: <HistoryContent />,
    },
    {
      key: 'projects',
      label: '项目参与',
      icon: <ProjectOutlined />,
      content: <ProjectsContent />,
    },
  ];

  /**
   * 头部操作按钮
   */
  const actions: ActionButton[] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      type: 'primary',
      onClick: () => {
        console.log('编辑会员');
      },
    },
    {
      key: 'deactivate',
      label: '停用',
      icon: <StopOutlined />,
      onClick: () => {
        console.log('停用会员');
      },
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        console.log('删除会员');
      },
    },
  ];

  /**
   * 底部操作按钮
   */
  const footerActions: ActionButton[] = [
    {
      key: 'view',
      label: '查看完整档案',
      onClick: () => {
        console.log('查看完整档案');
      },
    },
    {
      key: 'save',
      label: '保存修改',
      type: 'primary',
      onClick: async () => {
        setLoading(true);
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
        console.log('保存修改');
      },
      loading,
    },
  ];

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    setLoading(true);
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    console.log('数据已刷新');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <h1>DetailDrawer 组件示例</h1>
          <p>详情抽屉组件，支持标签页展示、内嵌操作、权限控制等功能。</p>
        </Card>

        <Card>
          <Button type="primary" onClick={() => setVisible(true)}>
            打开详情抽屉
          </Button>
        </Card>

        <DetailDrawer
          visible={visible}
          onClose={() => setVisible(false)}
          title="John Doe"
          subtitle="活跃会员"
          tabs={tabs}
          actions={actions}
          footerActions={footerActions}
          loading={loading}
          onRefresh={handleRefresh}
          width={720}
          defaultActiveTab="basic"
        />
      </Space>
    </div>
  );
};

export default DetailDrawerExample;

