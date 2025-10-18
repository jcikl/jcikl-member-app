import React, { useState } from 'react';
import { Card, Avatar, Tag, Dropdown, Statistic, Row, Col, Upload, Button, Skeleton } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  MoreOutlined,
  EditOutlined,
  StopOutlined,
  MailOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  UploadOutlined,
} from '@ant-design/icons';


// 类型定义
import type { MemberProfileCardProps } from './types';

// 样式
import './styles.css';

/**
 * MemberProfileCard Component
 * 会员档案卡片组件
 */
export const MemberProfileCard: React.FC<MemberProfileCardProps> = ({
  member,
  mode = 'expanded',
  editable = true,
  onEdit,
  onDisable,
  onMessage,
  onViewDetail,
  onAvatarChange,
  actions,
  loading = false,
  className = '',
}) => {
  const [compact, setCompact] = useState(mode === 'compact');
  const [uploading, setUploading] = useState(false);

  /**
   * 获取状态配置
   */
  const getStatusConfig = () => {
    const statusConfig = {
      active: { color: 'success', text: '活跃' },
      inactive: { color: 'warning', text: '未激活' },
      suspended: { color: 'error', text: '已停用' },
    };
    return statusConfig[member.status];
  };

  /**
   * 处理头像上传
   */
  const handleAvatarUpload = async (file: File) => {
    if (!onAvatarChange) return;

    setUploading(true);
    try {
      await onAvatarChange(file);
    } catch (error) {
      console.error('头像上传失败:', error);
    } finally {
      setUploading(false);
    }
  };

  /**
   * 下拉菜单项
   */
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: onEdit,
      disabled: !editable || !onEdit,
    },
    {
      key: 'disable',
      label: '停用',
      icon: <StopOutlined />,
      onClick: onDisable,
      disabled: !onDisable,
    },
    {
      key: 'message',
      label: '发消息',
      icon: <MailOutlined />,
      onClick: onMessage,
      disabled: !onMessage,
    },
    {
      key: 'view',
      label: '查看详情',
      icon: <EyeOutlined />,
      onClick: onViewDetail,
      disabled: !onViewDetail,
    },
    ...(actions || []).filter(action => action.visible !== false).map(action => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      onClick: action.onClick,
      danger: action.danger,
    })),
  ].filter(item => !('disabled' in item) || !item.disabled);

  if (loading) {
    return (
      <Card className={`member-profile-card ${className}`}>
        <Skeleton active avatar paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  const statusConfig = getStatusConfig();

  return (
    <Card className={`member-profile-card member-profile-card--${mode} ${className}`} variant="borderless">
      {/* 头部区域 */}
      <div className="member-profile-card__header">
        <div className="member-profile-card__avatar-wrapper">
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              handleAvatarUpload(file);
              return false;
            }}
            disabled={!onAvatarChange || uploading}
          >
            <Avatar
              size={80}
              src={member.avatar}
              icon={<UserOutlined />}
              className="member-profile-card__avatar"
            />
            {editable && onAvatarChange && (
              <div className="member-profile-card__avatar-overlay">
                <UploadOutlined />
              </div>
            )}
          </Upload>
        </div>

        <div className="member-profile-card__info">
          <div className="member-profile-card__name-row">
            <h3 className="member-profile-card__name">{member.name}</h3>
            {menuItems.length > 0 && (
              <Dropdown menu={{ items: menuItems }} placement="bottomRight">
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </div>
          
          <div className="member-profile-card__meta">
            <span>{member.category}</span>
            {member.position && <span>{member.position}</span>}
          </div>

          <Tag color={statusConfig.color} className="member-profile-card__status">
            {statusConfig.text}
          </Tag>
        </div>
      </div>

      {/* 统计数据 */}
      {!compact && member.stats && (
        <>
          <div className="member-profile-card__divider" />
          <Row gutter={16} className="member-profile-card__stats">
            <Col span={8}>
              <Statistic
                title="已完成任务"
                value={member.stats.tasks}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="参加活动"
                value={member.stats.events}
                prefix={<CalendarOutlined />}
                valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="积分"
                value={member.stats.points}
                prefix={<TrophyOutlined />}
                valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
              />
            </Col>
          </Row>
        </>
      )}

      {/* 折叠开关 */}
      <div className="member-profile-card__footer">
        <Button
          type="link"
          size="small"
          onClick={() => setCompact(!compact)}
          className="member-profile-card__toggle"
        >
          {compact ? '展开' : '收起'}
        </Button>
      </div>
    </Card>
  );
};

export default MemberProfileCard;

