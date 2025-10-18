import React, { useState } from 'react';
import { Card, Steps, Button, Space, Modal, Input, Table, Tag, Avatar, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  RollbackOutlined,
} from '@ant-design/icons';

// 全局配置
import { globalDateService } from '@/config/globalDateSettings';

// 类型定义
import type { ApprovalFlowProps, ApprovalHistory, ApprovalStatus } from './types';

// 样式
import './styles.css';

const { TextArea } = Input;

/**
 * ApprovalFlow Component
 * 审批流程组件
 */
export const ApprovalFlow: React.FC<ApprovalFlowProps> = ({
  flowData,
  currentUserId,
  onApprove,
  onReject,
  onTransfer,
  onRecall,
  loading = false,
  readonly = false,
  className = '',
}) => {
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'transfer'>('approve');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: ApprovalStatus) => {
    const iconMap = {
      approved: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      rejected: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      pending: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
      skipped: <CloseCircleOutlined style={{ color: '#8c8c8c' }} />,
    };
    return iconMap[status];
  };

  /**
   * 检查当前用户是否是当前节点的审批人
   */
  const isCurrentApprover = () => {
    const currentNode = flowData.nodes[flowData.currentNodeIndex];
    return currentNode?.approvers.some(a => a.id === currentUserId);
  };

  /**
   * 处理审批操作
   */
  const handleAction = async () => {
    const currentNode = flowData.nodes[flowData.currentNodeIndex];
    if (!currentNode) {
      message.error('未找到当前审批节点');
      return;
    }

    setProcessing(true);
    try {
      if (actionType === 'approve' && onApprove) {
        await onApprove(currentNode.id, comment);
        message.success('审批通过');
      } else if (actionType === 'reject' && onReject) {
        await onReject(currentNode.id, comment);
        message.success('已驳回');
      } else if (actionType === 'transfer' && onTransfer) {
        // 这里简化处理，实际需要选择转交对象
        await onTransfer(currentNode.id, '', comment);
        message.success('已转交');
      }
      
      setActionModalVisible(false);
      setComment('');
    } catch (error) {
      message.error('操作失败');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * 打开操作弹窗
   */
  const openActionModal = (type: 'approve' | 'reject' | 'transfer') => {
    setActionType(type);
    setActionModalVisible(true);
  };

  /**
   * 审批历史表格列定义
   */
  const historyColumns: ColumnsType<ApprovalHistory> = [
    {
      title: '审批人',
      dataIndex: 'approverName',
      key: 'approverName',
      render: (text, record) => (
        <Space>
          <Avatar size="small" src={record.approverAvatar}>
            {text[0]}
          </Avatar>
          {text}
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const actionConfig = {
          approve: { color: 'success', text: '通过' },
          reject: { color: 'error', text: '驳回' },
          transfer: { color: 'processing', text: '转交' },
          recall: { color: 'default', text: '撤回' },
        };
        const config = actionConfig[action as keyof typeof actionConfig] || actionConfig.approve;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => globalDateService.formatDate(timestamp, 'datetime'),
    },
    {
      title: '意见',
      dataIndex: 'comment',
      key: 'comment',
      render: (comment) => comment || '-',
    },
  ];

  /**
   * 渲染步骤
   */
  const steps = flowData.nodes.map((node, index) => ({
    title: node.name,
    status: (index < flowData.currentNodeIndex ? 'finish' : 
            index === flowData.currentNodeIndex ? 'process' : 
            'wait') as 'wait' | 'process' | 'finish',
    icon: getStatusIcon(node.status),
    description: node.approvers.map(a => a.name).join(', '),
  }));

  return (
    <Card className={`approval-flow ${className}`} variant="borderless">
      {/* 流程步骤 */}
      <Steps
        current={flowData.currentNodeIndex}
        items={steps}
        className="approval-flow__steps"
      />

      {/* 当前审批操作 */}
      {!readonly && isCurrentApprover() && flowData.status === 'pending' && (
        <Card className="approval-flow__action-card" type="inner">
          <h3>您的操作</h3>
          <p>请审核并选择操作</p>
          <Space wrap>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => openActionModal('approve')}
              loading={loading}
            >
              通过
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => openActionModal('reject')}
              loading={loading}
            >
              驳回
            </Button>
            {onTransfer && (
              <Button
                icon={<SwapOutlined />}
                onClick={() => openActionModal('transfer')}
                loading={loading}
              >
                转交
              </Button>
            )}
            {onRecall && (
              <Button
                icon={<RollbackOutlined />}
                onClick={() => onRecall(flowData.nodes[flowData.currentNodeIndex].id)}
                loading={loading}
              >
                撤回
              </Button>
            )}
          </Space>
        </Card>
      )}

      {/* 审批历史 */}
      <div className="approval-flow__history">
        <h3>审批历史</h3>
        <Table
          columns={historyColumns}
          dataSource={flowData.history}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>

      {/* 操作弹窗 */}
      <Modal
        title={actionType === 'approve' ? '审批通过' : actionType === 'reject' ? '驳回' : '转交'}
        open={actionModalVisible}
        onOk={handleAction}
        onCancel={() => {
          setActionModalVisible(false);
          setComment('');
        }}
        confirmLoading={processing}
        okText="确认"
        cancelText="取消"
      >
        <TextArea
          rows={4}
          placeholder="请输入审批意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </Card>
  );
};

export default ApprovalFlow;

