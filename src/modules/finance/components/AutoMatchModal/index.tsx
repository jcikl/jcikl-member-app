/**
 * Auto Match Modal
 * 自动分类预览Modal
 * 
 * 展示自动匹配结果，支持：
 * - 查看匹配详情和得分
 * - 批量确认高置信度匹配
 * - 单个确认或忽略
 * - 手动调整匹配
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Card,
  Space,
  Button,
  Tag,
  Descriptions,
  Progress,
  Checkbox,
  Divider,
  Empty,
  Alert,
  Statistic,
  Row,
  Col,
  Radio,
  Select,
  Input,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { AutoMatchPreviewItem, MatchResult } from '../../services/autoMatchService';
import { generateMatchStatistics } from '../../services/autoMatchService';
import dayjs from 'dayjs';
import './styles.css';


interface Props {
  visible: boolean;
  previewItems: AutoMatchPreviewItem[];
  onConfirm: (selectedItems: Array<{ transactionId: string; matchResult: MatchResult; customData?: { category?: string; eventName?: string; memberId?: string; payerPayee?: string } }>) => Promise<void>;
  onCancel: () => void;
  allEvents?: Array<{ id: string; eventName: string; eventDate: string }>; // 🆕 所有活动列表用于下拉选择
  allMembers?: Array<{ id: string; name: string; email?: string; phone?: string }>; // 🆕 所有会员列表用于下拉选择
}

type FilterType = 'all' | 'high' | 'medium' | 'noMatch';

// 🆕 自定义编辑数据
interface CustomEditData {
  category?: string; // 主分类
  eventName?: string; // 活动名称(二次分类)
  memberId?: string; // 会员ID
  payerPayee?: string; // 付款人/收款人(可以是会员名或非会员)
}

export const AutoMatchModal: React.FC<Props> = ({
  visible,
  previewItems,
  onConfirm,
  onCancel,
  allEvents = [],
  allMembers = [],
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  // 🆕 存储每个交易的自定义编辑数据
  const [customEdits, setCustomEdits] = useState<Record<string, CustomEditData>>({});

  // 计算统计数据
  const statistics = useMemo(() => {
    return generateMatchStatistics(previewItems);
  }, [previewItems]);

  // 过滤显示的项目
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return previewItems;
    if (filterType === 'high')
      return previewItems.filter((item) => item.bestMatch?.confidence === 'high');
    if (filterType === 'medium')
      return previewItems.filter((item) => item.bestMatch?.confidence === 'medium');
    if (filterType === 'noMatch') return previewItems.filter((item) => !item.bestMatch);
    return previewItems;
  }, [previewItems, filterType]);

  // 全选高置信度
  const handleSelectAllHigh = () => {
    const highConfidenceIds = previewItems
      .filter((item) => item.bestMatch?.confidence === 'high')
      .map((item) => item.transaction.id);

    setSelectedIds(highConfidenceIds);
  };

  // 全选当前筛选结果
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredItems
      .filter((item) => item.bestMatch) // 只选择有匹配的
      .map((item) => item.transaction.id);

    setSelectedIds(filteredIds);
  };

  // 全选所有有匹配的项目
  const handleSelectAllMatched = () => {
    const matchedIds = previewItems
      .filter((item) => item.bestMatch) // 只选择有匹配的
      .map((item) => item.transaction.id);

    setSelectedIds(matchedIds);
  };

  // 清空选择
  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // 切换选中状态
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 🆕 更新自定义编辑数据
  const updateCustomEdit = (transactionId: string, field: keyof CustomEditData, value: string) => {
    setCustomEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        [field]: value,
      }
    }));
  };

  // 确认应用
  const handleApply = async () => {
    try {
      setLoading(true);

      const selectedItems = previewItems
        .filter((item) => selectedIds.includes(item.transaction.id) && item.bestMatch)
        .map((item) => ({
          transactionId: item.transaction.id,
          matchResult: item.bestMatch!,
          // 🆕 包含用户自定义编辑的数据
          customData: customEdits[item.transaction.id],
        }));

      await onConfirm(selectedItems);
    } finally {
      setLoading(false);
    }
  };

  // 获取置信度标签
  const getConfidenceTag = (confidence: 'high' | 'medium' | 'low') => {
    if (confidence === 'high') {
      return <Tag color="success" icon={<CheckCircleOutlined />}>高置信度</Tag>;
    }
    if (confidence === 'medium') {
      return <Tag color="warning" icon={<WarningOutlined />}>中置信度</Tag>;
    }
    return <Tag color="default" icon={<InfoCircleOutlined />}>低置信度</Tag>;
  };

  // 获取票价类型标签
  const getPriceTypeTag = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      'member价': { label: '会员价', color: 'blue' },
      'regular价': { label: '非会员价', color: 'orange' },
      'alumni价': { label: '校友价', color: 'purple' },
      'earlyBird价': { label: '早鸟价', color: 'green' },
      'committee价': { label: '委员会价', color: 'gold' },
    };

    const match = typeMap[type];
    if (match) {
      return <Tag color={match.color}>{match.label}</Tag>;
    }

    // 处理倍数情况，如 "member价 x2"
    if (type.includes('x')) {
      return <Tag color="cyan">{type.replace('价', '').replace('member', '会员').replace('regular', '非会员')}</Tag>;
    }

    return <Tag>{type}</Tag>;
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>自动分类预览</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={1400}
      footer={
        <Space wrap>
          <Button onClick={onCancel}>取消</Button>
          
          {/* 全选选项 */}
          <Button 
            onClick={handleSelectAllHigh} 
            disabled={statistics.highConfidence === 0}
            type={statistics.highConfidence > 0 ? "default" : "dashed"}
          >
            全选高置信度 ({statistics.highConfidence}条)
          </Button>
          
          <Button 
            onClick={handleSelectAllMatched} 
            disabled={statistics.hasMatch === 0}
            type={statistics.hasMatch > 0 ? "default" : "dashed"}
          >
            全选有匹配 ({statistics.hasMatch}条)
          </Button>
          
          <Button 
            onClick={handleSelectAllFiltered} 
            disabled={filteredItems.filter(item => item.bestMatch).length === 0}
            type="default"
          >
            全选当前筛选 ({filteredItems.filter(item => item.bestMatch).length}条)
          </Button>
          
          {selectedIds.length > 0 && (
            <Button onClick={handleClearSelection} type="dashed">
              清空选择
            </Button>
          )}
          
          <Button
            type="primary"
            onClick={handleApply}
            loading={loading}
            disabled={selectedIds.length === 0}
          >
            应用选中 ({selectedIds.length}条)
          </Button>
        </Space>
      }
      className="auto-match-modal"
    >
      {/* 统计信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic title="待分类" value={statistics.total} />
          </Col>
          <Col span={4}>
            <Statistic
              title="找到匹配"
              value={statistics.hasMatch}
              suffix={`/ ${statistics.total}`}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="高置信度"
              value={statistics.highConfidence}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="中置信度"
              value={statistics.mediumConfidence}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="无法匹配"
              value={statistics.noMatch}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#999' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 筛选器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <span>显示:</span>
          <Radio.Group value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <Radio.Button value="all">全部 ({statistics.total})</Radio.Button>
            <Radio.Button value="high">高置信度 ({statistics.highConfidence})</Radio.Button>
            <Radio.Button value="medium">中置信度 ({statistics.mediumConfidence})</Radio.Button>
            <Radio.Button value="noMatch">无匹配 ({statistics.noMatch})</Radio.Button>
          </Radio.Group>
        </Space>
      </Card>

      {/* 提示信息 */}
      {statistics.hasMatch > 0 && (
        <Alert
          message={
            <div>
              <div style={{ marginBottom: 8 }}>
                <strong>💡 快速分类建议：</strong>
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                {statistics.highConfidence > 0 && (
                  <div>• <strong>全选高置信度</strong>：一键选中 {statistics.highConfidence} 条高置信度匹配(推荐)</div>
                )}
                {statistics.mediumConfidence > 0 && (
                  <div>• <strong>全选有匹配</strong>：选中所有 {statistics.hasMatch} 条有匹配的记录</div>
                )}
                <div>• <strong>全选当前筛选</strong>：选中当前筛选结果中的所有匹配项</div>
                <div>• 也可以单独勾选需要分类的交易记录</div>
              </div>
            </div>
          }
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 匹配结果列表 */}
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <Empty description="没有匹配结果" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {filteredItems.map((item, index) => (
              <Card
                key={item.transaction.id}
                size="small"
                className={`match-item-card ${
                  item.bestMatch?.confidence === 'high'
                    ? 'high-confidence'
                    : item.bestMatch?.confidence === 'medium'
                    ? 'medium-confidence'
                    : 'no-match'
                }`}
                title={
                  <Space>
                    {item.bestMatch && (
                      <Checkbox
                        checked={selectedIds.includes(item.transaction.id)}
                        onChange={() => toggleSelection(item.transaction.id)}
                      />
                    )}
                    <span>#{index + 1}</span>
                    {item.bestMatch && getConfidenceTag(item.bestMatch.confidence)}
                    {item.bestMatch && (
                      <Tag color="blue">得分: {item.bestMatch.totalScore}/100</Tag>
                    )}
                  </Space>
                }
                extra={
                  item.bestMatch && (
                    <Progress
                      type="circle"
                      percent={item.bestMatch.totalScore}
                      width={50}
                      strokeColor={
                        item.bestMatch.confidence === 'high'
                          ? '#52c41a'
                          : item.bestMatch.confidence === 'medium'
                          ? '#faad14'
                          : '#d9d9d9'
                      }
                    />
                  )
                }
              >
                <Row gutter={16}>
                  {/* 左侧：原始交易信息 */}
                  <Col span={12}>
                    <div className="section-title">📋 原始交易记录</div>
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="交易日期">
                        {dayjs(item.transaction.transactionDate).format('YYYY-MM-DD')}
                      </Descriptions.Item>
                      <Descriptions.Item label="主描述">
                        <strong>{item.transaction.mainDescription}</strong>
                      </Descriptions.Item>
                      {item.transaction.subDescription && (
                        <Descriptions.Item label="副描述">
                          {item.transaction.subDescription}
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="金额">
                        <Tag color={item.transaction.transactionType === 'income' ? 'green' : 'red'}>
                          RM {item.transaction.amount.toFixed(2)} (
                          {item.transaction.transactionType === 'income' ? '收入' : '支出'})
                        </Tag>
                      </Descriptions.Item>
                      {item.transaction.payerPayee && (
                        <Descriptions.Item label="付款人/收款人">
                          {item.transaction.payerPayee}
                          {item.transaction.payerId && <Tag color="blue">会员</Tag>}
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="当前分类">
                        <Tag color="orange">未分类</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>

                  {/* 右侧：匹配结果 */}
                  <Col span={12}>
                    {item.bestMatch ? (
                      <>
                        <div className="section-title">🎯 匹配结果</div>
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="匹配到活动">
                            <strong style={{ color: '#1890ff', fontSize: '14px' }}>
                              {item.bestMatch.eventName}
                            </strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="活动日期">
                            {dayjs(item.bestMatch.eventDate).format('YYYY-MM-DD')}
                            {item.bestMatch.daysDifference !== undefined && (
                              <Tag color={item.bestMatch.daysDifference === 0 ? 'green' : item.bestMatch.daysDifference <= 7 ? 'blue' : 'orange'} style={{ marginLeft: 8 }}>
                                相差 {item.bestMatch.daysDifference} 天
                              </Tag>
                            )}
                          </Descriptions.Item>
                          {item.bestMatch.matchedPriceType && (
                            <Descriptions.Item label="匹配票价">
                              {getPriceTypeTag(item.bestMatch.matchedPriceType)}
                              {item.bestMatch.matchedPrice && (
                                <span style={{ marginLeft: 8 }}>
                                  RM {item.bestMatch.matchedPrice.toFixed(2)}
                                </span>
                              )}
                            </Descriptions.Item>
                          )}
                          <Descriptions.Item label="将更新为" span={2}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* 主分类 - 左右并排 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ minWidth: '80px', fontWeight: 500 }}>
                                  <EditOutlined style={{ marginRight: 4, color: '#9254de' }} />
                                  主分类:
                                </span>
                                <Select
                                  style={{ flex: 1 }}
                                  value={customEdits[item.transaction.id]?.category || 'event-finance'}
                                  onChange={(value) => updateCustomEdit(item.transaction.id, 'category', value)}
                                >
                                  <Select.Option value="event-finance">活动财务</Select.Option>
                                  <Select.Option value="member-fees">会员费用</Select.Option>
                                  <Select.Option value="general-accounts">日常账户</Select.Option>
                                </Select>
                              </div>
                              
                              {/* 二次分类 - 仅当主分类为活动财务时显示 */}
                              {(customEdits[item.transaction.id]?.category || 'event-finance') === 'event-finance' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ minWidth: '80px', fontWeight: 500 }}>
                                    <EditOutlined style={{ marginRight: 4, color: '#13c2c2' }} />
                                    活动名称:
                                  </span>
                                  <Select
                                    style={{ flex: 1 }}
                                    value={customEdits[item.transaction.id]?.eventName || item.bestMatch.eventName}
                                    onChange={(value) => updateCustomEdit(item.transaction.id, 'eventName', value)}
                                    showSearch
                                    placeholder="选择活动"
                                    optionFilterProp="children"
                                  >
                                    {allEvents.map(event => (
                                      <Select.Option key={event.id} value={event.eventName}>
                                        {event.eventName} ({dayjs(event.eventDate).format('YYYY-MM-DD')})
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </div>
                              )}
                              
                              {/* 关联会员 - 左右并排 */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ minWidth: '80px', fontWeight: 500, paddingTop: '4px' }}>
                                  <EditOutlined style={{ marginRight: 4, color: '#eb2f96' }} />
                                  {item.transaction.transactionType === 'income' ? '付款人:' : '收款人:'}
                                </span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <Select
                                    style={{ width: '100%' }}
                                    value={customEdits[item.transaction.id]?.memberId || (item.bestMatch.matchedMember?.memberId)}
                                    onChange={(value) => {
                                      updateCustomEdit(item.transaction.id, 'memberId', value);
                                      // 自动填充会员名称
                                      const selectedMember = allMembers.find(m => m.id === value);
                                      if (selectedMember) {
                                        updateCustomEdit(item.transaction.id, 'payerPayee', selectedMember.name);
                                      }
                                    }}
                                    showSearch
                                    allowClear
                                    placeholder="选择会员(可选)"
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                      (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                                    }
                                  >
                                    {allMembers.map(member => (
                                      <Select.Option key={member.id} value={member.id}>
                                        {member.name} {member.email && `(${member.email})`}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                  <Input
                                    style={{ width: '100%' }}
                                    value={customEdits[item.transaction.id]?.payerPayee || item.bestMatch.matchedMember?.memberName || ''}
                                    onChange={(e) => updateCustomEdit(item.transaction.id, 'payerPayee', e.target.value)}
                                    placeholder="或手动输入非会员姓名/公司"
                                    disabled={!!customEdits[item.transaction.id]?.memberId && !customEdits[item.transaction.id]?.payerPayee}
                                    suffix={
                                      item.bestMatch.matchedMember && (
                                        <Tag color="default" style={{ border: 'none', marginRight: -8, fontSize: '11px' }}>
                                          {item.bestMatch.matchedMember.matchType === 'phone' && '📱手机号'}
                                          {item.bestMatch.matchedMember.matchType === 'email' && '📧邮箱'}
                                          {item.bestMatch.matchedMember.matchType === 'name' && '👤姓名'}
                                          {item.bestMatch.matchedMember.matchType === 'memberId' && '🆔ID'}
                                        </Tag>
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </Descriptions.Item>
                        </Descriptions>

                        <Divider style={{ margin: '12px 0' }} />

                        <div className="section-title">📊 匹配详情</div>
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                          <div>
                            <Tag color="orange">日期匹配</Tag>
                            <Tag color="volcano" style={{ marginLeft: 4 }}>最重要</Tag>
                            <Progress
                              percent={Math.floor((item.bestMatch!.dateScore / 40) * 100)}
                              size="small"
                              format={() => `${item.bestMatch!.dateScore}/40`}
                            />
                          </div>
                          <div>
                            <Tag color="green">票价匹配</Tag>
                            <Tag color="gold" style={{ marginLeft: 4 }}>次重要</Tag>
                            <Progress
                              percent={Math.floor((item.bestMatch!.priceScore / 40) * 100)}
                              size="small"
                              format={() => `${item.bestMatch!.priceScore}/40`}
                            />
                          </div>
                          <div>
                            <Tag color="blue">名称匹配</Tag>
                            <Tag color="default" style={{ marginLeft: 4 }}>参考</Tag>
                            <Progress
                              percent={Math.floor((item.bestMatch!.nameScore / 20) * 100)}
                              size="small"
                              format={() => `${item.bestMatch!.nameScore}/20`}
                            />
                          </div>
                          {item.bestMatch.explanation && (
                            <Alert
                              message={item.bestMatch.explanation}
                              type="info"
                              showIcon
                              style={{ fontSize: '12px' }}
                            />
                          )}
                        </Space>
                      </>
                    ) : item.topAttempt ? (
                      <>
                        <div className="section-title">⚠️ 最佳尝试匹配(需手动确认)</div>
                        <Alert
                          message={
                            (() => {
                              // 🔄 根据交易类型显示不同的阈值
                              const threshold = item.transaction.transactionType === 'expense' ? 45 : 60;
                              const maxScore = item.transaction.transactionType === 'expense' ? 60 : 100;
                              const transactionTypeText = item.transaction.transactionType === 'expense' ? '支出交易' : '收入交易';
                              
                              if (item.topAttempt.daysDifference <= 30) {
                                return `未达到${transactionTypeText}自动分类阈值(${threshold}分)，但找到时间最接近的活动(相差${item.topAttempt.daysDifference}天，得分：${item.topAttempt.totalScore}/${maxScore})`;
                              } else {
                                return `未达到${transactionTypeText}自动分类阈值(${threshold}分)，但找到以下活动(得分：${item.topAttempt.totalScore}/${maxScore})`;
                              }
                            })()
                          }
                          type="warning"
                          showIcon
                          style={{ marginBottom: 12 }}
                        />
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="最接近活动">
                            <strong style={{ color: '#fa8c16', fontSize: '14px' }}>
                              {item.topAttempt.eventName}
                            </strong>
                          </Descriptions.Item>
                          <Descriptions.Item label="活动日期">
                            {dayjs(item.topAttempt.eventDate).format('YYYY-MM-DD')}
                            {item.topAttempt.daysDifference <= 30 && (
                              <Tag color={item.topAttempt.daysDifference === 0 ? 'green' : item.topAttempt.daysDifference <= 7 ? 'blue' : 'orange'} style={{ marginLeft: 8 }}>
                                相差 {item.topAttempt.daysDifference} 天
                              </Tag>
                            )}
                          </Descriptions.Item>
                          {item.topAttempt.matchedPriceType && (
                            <Descriptions.Item label="票价匹配">
                              {getPriceTypeTag(item.topAttempt.matchedPriceType)}
                              {item.topAttempt.matchedPrice && (
                                <span style={{ marginLeft: 8 }}>
                                  RM {item.topAttempt.matchedPrice.toFixed(2)}
                                </span>
                              )}
                            </Descriptions.Item>
                          )}
                          {item.topAttempt.matchedMember && (
                            <Descriptions.Item label="识别到会员">
                              <Space>
                                <Tag color="magenta" icon={<CheckCircleOutlined />}>
                                  {item.topAttempt.matchedMember.memberName}
                                </Tag>
                                <Tag color="default">
                                  {item.topAttempt.matchedMember.matchType === 'phone' && '通过手机号匹配'}
                                  {item.topAttempt.matchedMember.matchType === 'email' && '通过邮箱匹配'}
                                  {item.topAttempt.matchedMember.matchType === 'name' && '通过姓名匹配'}
                                  {item.topAttempt.matchedMember.matchType === 'memberId' && '通过会员ID匹配'}
                                </Tag>
                              </Space>
                            </Descriptions.Item>
                          )}
                        </Descriptions>

                        <Divider style={{ margin: '12px 0' }} />

                        <div className="section-title">📊 分数详情</div>
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                          <div>
                            <Tag color="orange">日期匹配</Tag>
                            <Tag color="volcano" style={{ marginLeft: 4 }}>最重要</Tag>
                            <Progress
                              percent={Math.floor((item.topAttempt.dateScore / 40) * 100)}
                              size="small"
                              format={() => `${item.topAttempt!.dateScore}/40`}
                              status={item.topAttempt.dateScore > 0 ? 'normal' : 'exception'}
                            />
                          </div>
                          <div>
                            <Tag color="green">票价匹配</Tag>
                            <Tag color="gold" style={{ marginLeft: 4 }}>次重要</Tag>
                            <Progress
                              percent={Math.floor((item.topAttempt.priceScore / 40) * 100)}
                              size="small"
                              format={() => `${item.topAttempt!.priceScore}/40`}
                              status={item.topAttempt.priceScore > 0 ? 'normal' : 'exception'}
                            />
                          </div>
                          <div>
                            <Tag color="blue">名称匹配</Tag>
                            <Tag color="default" style={{ marginLeft: 4 }}>参考</Tag>
                            <Progress
                              percent={Math.floor((item.topAttempt.nameScore / 20) * 100)}
                              size="small"
                              format={() => `${item.topAttempt!.nameScore}/20`}
                              status={item.topAttempt.nameScore > 0 ? 'normal' : 'exception'}
                            />
                          </div>
                          <div>
                            <Tag color="red">总分</Tag>
                            <Progress
                              percent={item.topAttempt.totalScore}
                              size="small"
                              format={() => `${item.topAttempt!.totalScore}/100`}
                              status="exception"
                            />
                          </div>
                          {item.topAttempt.explanation && (
                            <Alert
                              message={`匹配说明：${item.topAttempt.explanation}`}
                              type="info"
                              showIcon
                              style={{ fontSize: '12px' }}
                            />
                          )}
                          <Alert
                            message="💡 提示：如果确认此交易确实属于该活动，请前往交易列表手动分类"
                            type="info"
                            showIcon
                            style={{ fontSize: '12px', marginTop: 8 }}
                          />
                        </Space>
                      </>
                    ) : (
                      <>
                        <div className="section-title">❌ 无法自动匹配</div>
                        <Empty
                          description="未找到任何可能的活动匹配，需要手动分类"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </>
                    )}
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        )}
      </div>
    </Modal>
  );
};

export default AutoMatchModal;

