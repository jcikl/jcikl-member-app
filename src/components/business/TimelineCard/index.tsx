import React, { useState, useMemo } from 'react';
import { Card, Timeline, Select, Button, Space, Empty, Skeleton } from 'antd';
import {
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

// 全局配置
import { globalDateService } from '@/config/globalDateSettings';

// 类型定义
import type { TimelineCardProps, TimelineItem, OperationType } from './types';

// 样式
import './styles.css';

const { Option } = Select;

/**
 * 操作类型配置
 */
const OPERATION_CONFIG: Record<OperationType, { color: string; icon: React.ReactNode }> = {
  create: { color: 'green', icon: <PlusCircleOutlined /> },
  update: { color: 'blue', icon: <EditOutlined /> },
  delete: { color: 'red', icon: <DeleteOutlined /> },
  approve: { color: 'green', icon: <CheckCircleOutlined /> },
  reject: { color: 'orange', icon: <CloseCircleOutlined /> },
  other: { color: 'default', icon: <EditOutlined /> },
};

/**
 * TimelineCard Component
 * 时间线卡片组件
 * 
 * @description 展示操作历史，支持筛选和分页
 */
export const TimelineCard: React.FC<TimelineCardProps> = ({
  data,
  loading = false,
  filterable = true,
  filterTypes = [],
  pagination = false,
  pageSize = 10,
  onLoadMore,
  onExport,
  showOperatorFilter = true,
  className = '',
}) => {
  const [selectedType, setSelectedType] = useState<OperationType | 'all'>('all');
  const [selectedOperator, setSelectedOperator] = useState<string | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  /**
   * 筛选后的数据
   */
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // 按操作类型筛选
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // 按操作人筛选
    if (selectedOperator !== 'all') {
      filtered = filtered.filter(item => item.operatorId === selectedOperator);
    }

    return filtered;
  }, [data, selectedType, selectedOperator]);

  /**
   * 获取所有操作人
   */
  const operators = useMemo(() => {
    const uniqueOperators = new Map();
    data.forEach(item => {
      if (!uniqueOperators.has(item.operatorId)) {
        uniqueOperators.set(item.operatorId, item.operator);
      }
    });
    return Array.from(uniqueOperators.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  /**
   * 切换展开/折叠
   */
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  /**
   * 渲染时间线项
   */
  const renderTimelineItem = (item: TimelineItem) => {
    const config = OPERATION_CONFIG[item.type];
    const isExpanded = expandedItems.has(item.id);

    return {
      key: item.id,
      dot: (
        <div
          className="timeline-card__dot"
          style={{ background: config.color }}
        >
          {config.icon}
        </div>
      ),
      children: (
        <div className="timeline-card__item">
          <div className="timeline-card__item-header">
            <div className="timeline-card__item-info">
              <h4 className="timeline-card__item-title">{item.title}</h4>
              <p className="timeline-card__item-operator">
                by {item.operator}
              </p>
            </div>
            <span className="timeline-card__item-time">
              {globalDateService.fromNow(item.timestamp)}
            </span>
          </div>

          {item.description && (
            <p className="timeline-card__item-description">{item.description}</p>
          )}

          {item.detail && (
            <div className="timeline-card__item-detail">
              {!isExpanded ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => toggleExpand(item.id)}
                  className="timeline-card__toggle"
                >
                  显示详情
                </Button>
              ) : (
                <>
                  <div className="timeline-card__detail-content">
                    {typeof item.detail === 'string' ? (
                      <p>{item.detail}</p>
                    ) : (
                      item.detail
                    )}
                  </div>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => toggleExpand(item.id)}
                    className="timeline-card__toggle"
                  >
                    收起
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ),
    };
  };

  /**
   * 渲染筛选栏
   */
  const renderFilters = () => {
    if (!filterable) return null;

    return (
      <div className="timeline-card__filters">
        <Space wrap>
          {/* 操作类型筛选 */}
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 200 }}
            placeholder="选择操作类型"
          >
            <Option value="all">所有操作</Option>
            {filterTypes.length > 0 ? (
              filterTypes.map(type => (
                <Option key={type} value={type}>
                  {OPERATION_CONFIG[type].icon} {type}
                </Option>
              ))
            ) : (
              Object.keys(OPERATION_CONFIG).map(type => (
                <Option key={type} value={type}>
                  {OPERATION_CONFIG[type as OperationType].icon} {type}
                </Option>
              ))
            )}
          </Select>

          {/* 操作人筛选 */}
          {showOperatorFilter && operators.length > 0 && (
            <Select
              value={selectedOperator}
              onChange={setSelectedOperator}
              style={{ width: 200 }}
              placeholder="选择操作人"
            >
              <Option value="all">所有操作人</Option>
              {operators.map(op => (
                <Option key={op.id} value={op.id}>
                  {op.name}
                </Option>
              ))}
            </Select>
          )}

          {/* 导出按钮 */}
          {onExport && (
            <Button icon={<DownloadOutlined />} onClick={() => onExport('csv')}>
              导出
            </Button>
          )}
        </Space>
      </div>
    );
  };

  /**
   * 渲染内容
   */
  const renderContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 4 }} />;
    }

    if (filteredData.length === 0) {
      return (
        <Empty
          description="暂无操作历史"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <Timeline
        items={filteredData.slice(0, pagination ? pageSize : undefined).map(renderTimelineItem)}
        className="timeline-card__timeline"
      />
    );
  };

  return (
    <Card className={`timeline-card ${className}`} bordered={false}>
      {renderFilters()}
      <div className="timeline-card__content">
        {renderContent()}
      </div>

      {pagination && filteredData.length > pageSize && onLoadMore && (
        <div className="timeline-card__load-more">
          <Button onClick={onLoadMore}>加载更多</Button>
        </div>
      )}
    </Card>
  );
};

export default TimelineCard;

