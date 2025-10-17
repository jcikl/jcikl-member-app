/**
 * FilterPanel Usage Example
 * FilterPanel 组件使用示例
 */

import React, { useState } from 'react';
import { Card, Table, Space, Tag, message } from 'antd';
import { FilterPanel } from './index';
import type { FilterField } from './types';
import type { ColumnsType } from 'antd/es/table';

interface Member {
  id: string;
  name: string;
  email: string;
  memberId: string;
  category: string;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  age: number;
}

/**
 * FilterPanel 示例页面
 */
export const FilterPanelExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data] = useState<Member[]>([
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      memberId: 'JCI-KL-000001',
      category: 'official',
      status: 'active',
      joinDate: '2024-01-15',
      age: 28,
    },
    {
      id: '2',
      name: '李四',
      email: 'lisi@example.com',
      memberId: 'JCI-KL-000002',
      category: 'associate',
      status: 'active',
      joinDate: '2024-02-20',
      age: 32,
    },
    {
      id: '3',
      name: '王五',
      email: 'wangwu@example.com',
      memberId: 'JCI-KL-000003',
      category: 'honorary',
      status: 'inactive',
      joinDate: '2023-12-10',
      age: 45,
    },
  ]);

  // 定义筛选字段
  const filterFields: FilterField[] = [
    // 基本信息组
    {
      name: 'name',
      label: '姓名',
      type: 'text',
      placeholder: '请输入姓名',
      group: '基本信息',
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'email',
      placeholder: '请输入邮箱地址',
      group: '基本信息',
    },
    {
      name: 'memberId',
      label: '会员编号',
      type: 'text',
      placeholder: '例如：JCI-KL-000001',
      group: '基本信息',
    },
    
    // 会员详情组
    {
      name: 'category',
      label: '会员类别',
      type: 'select',
      group: '会员详情',
      options: [
        { label: '正式会员', value: 'official' },
        { label: '准会员', value: 'associate' },
        { label: '荣誉会员', value: 'honorary' },
        { label: '访问会员', value: 'visiting' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'multiSelect',
      group: '会员详情',
      options: [
        { label: '活跃', value: 'active' },
        { label: '未激活', value: 'inactive' },
        { label: '已停用', value: 'suspended' },
      ],
    },
    {
      name: 'joinDateRange',
      label: '入会日期',
      type: 'dateRange',
      group: '会员详情',
    },
    
    // 活动情况组
    {
      name: 'ageRange',
      label: '年龄范围',
      type: 'numberRange',
      group: '活动情况',
      validation: {
        min: 18,
        max: 100,
      },
    },
  ];

  // 表格列定义
  const columns: ColumnsType<Member> = [
    {
      title: '会员编号',
      dataIndex: 'memberId',
      key: 'memberId',
      width: 150,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const categoryMap: Record<string, string> = {
          official: '正式会员',
          associate: '准会员',
          honorary: '荣誉会员',
          visiting: '访问会员',
        };
        return categoryMap[category] || category;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Member['status']) => {
        const statusConfig = {
          active: { color: 'success', text: '活跃' },
          inactive: { color: 'warning', text: '未激活' },
          suspended: { color: 'error', text: '已停用' },
        };
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '入会日期',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: 120,
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      width: 80,
    },
  ];

  /**
   * 处理筛选
   */
  const handleFilter = async (values: Record<string, any>) => {
    console.log('筛选条件:', values);
    
    setLoading(true);
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // 这里应该调用实际的 API
      // const result = await memberService.getMembers(values);
      // setData(result.data);
      
      message.success(`筛选条件已应用${values._search ? `，关键词：${values._search}` : ''}`);
    } catch (error) {
      console.error('筛选失败:', error);
      message.error('筛选失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理重置
   */
  const handleReset = () => {
    console.log('重置筛选');
    message.info('筛选条件已重置');
    
    // 这里可以重新加载初始数据
    // loadInitialData();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <h1>FilterPanel 组件示例</h1>
          <p>这是一个完整的 FilterPanel 组件使用示例，展示了如何与数据表格集成。</p>
        </Card>

        {/* 筛选面板 */}
        <FilterPanel
          fields={filterFields}
          onFilter={handleFilter}
          onReset={handleReset}
          storageKey="member-filter-example-presets"
          collapsible={true}
          defaultCollapsed={false}
          loading={loading}
          showPresets={true}
          showSearch={true}
          searchPlaceholder="搜索会员姓名、邮箱或编号..."
        />

        {/* 数据表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={data}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Card>

        {/* 使用说明 */}
        <Card title="使用说明">
          <Space direction="vertical" size="small">
            <p><strong>功能演示：</strong></p>
            <ul>
              <li>✅ 在筛选面板中填写筛选条件</li>
              <li>✅ 点击"保存预设"可以保存当前筛选条件</li>
              <li>✅ 从下拉框选择已保存的预设，点击"加载"恢复筛选条件</li>
              <li>✅ 点击"重置"或"清除全部"可以清空筛选条件</li>
              <li>✅ 使用顶部搜索框进行快速搜索</li>
              <li>✅ 点击标题栏可以折叠/展开筛选面板</li>
            </ul>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default FilterPanelExample;

