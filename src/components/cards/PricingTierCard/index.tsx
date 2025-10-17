import React from 'react';
import { Card, Button, Badge, Tag, List, Row, Col, Skeleton } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

// 类型定义
import type { PricingTierCardProps, PricingTier } from './types';

// 样式
import './styles.css';

/**
 * PricingTierCard Component
 * 分级定价卡片组件
 */
export const PricingTierCard: React.FC<PricingTierCardProps> = ({
  tiers,
  onSelectTier,
  currency = 'RM',
  loading = false,
  highlightTierId,
  className = '',
}) => {
  /**
   * 渲染单个定价卡片
   */
  const renderTierCard = (tier: PricingTier) => {
    const isRecommended = tier.recommended || tier.id === highlightTierId;
    const isUnavailable = !tier.available || (tier.limit && tier.remaining === 0);

    return (
      <Col xs={24} sm={24} md={8} key={tier.id}>
        <Badge.Ribbon
          text={tier.badge || (isRecommended ? '推荐' : undefined)}
          color={isRecommended ? '#1890ff' : undefined}
          style={{ display: tier.badge || isRecommended ? 'block' : 'none' }}
        >
          <Card
            className={`pricing-tier-card ${isRecommended ? 'pricing-tier-card--recommended' : ''} ${isUnavailable ? 'pricing-tier-card--unavailable' : ''}`}
            hoverable={!isUnavailable}
          >
            <div className="pricing-tier-card__content">
              {/* 标题 */}
              <h3 className="pricing-tier-card__title">{tier.name}</h3>

              {/* 价格 */}
              <div className="pricing-tier-card__price">
                <span className="pricing-tier-card__price-currency">{currency}</span>
                <span className="pricing-tier-card__price-value">{tier.price}</span>
                {tier.originalPrice && tier.originalPrice > tier.price && (
                  <span className="pricing-tier-card__price-original">
                    {currency} {tier.originalPrice}
                  </span>
                )}
              </div>

              {/* 折扣标签 */}
              {tier.discount && (
                <Tag color="gold" className="pricing-tier-card__discount">
                  {tier.discount}
                </Tag>
              )}

              {/* 特性列表 */}
              <List
                className="pricing-tier-card__features"
                dataSource={tier.features}
                renderItem={(feature) => (
                  <List.Item>
                    <CheckOutlined className="pricing-tier-card__feature-icon" />
                    <span>{feature}</span>
                  </List.Item>
                )}
              />

              {/* 库存提示 */}
              {tier.limit && tier.remaining !== undefined && (
                <div className="pricing-tier-card__stock">
                  剩余名额: {tier.remaining} / {tier.limit}
                </div>
              )}

              {/* 选择按钮 */}
              <Button
                type={isRecommended ? 'primary' : 'default'}
                size="large"
                block
                onClick={() => onSelectTier(tier.id)}
                disabled={!!isUnavailable}
                className="pricing-tier-card__button"
              >
                {isUnavailable ? '已售罄' : `选择 ${tier.name}`}
              </Button>
            </div>
          </Card>
        </Badge.Ribbon>
      </Col>
    );
  };

  if (loading) {
    return (
      <Row gutter={[24, 24]} className={`pricing-tier-cards ${className}`}>
        {[1, 2, 3].map(i => (
          <Col xs={24} sm={24} md={8} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Row gutter={[24, 24]} className={`pricing-tier-cards ${className}`}>
      {tiers.map(renderTierCard)}
    </Row>
  );
};

export default PricingTierCard;

