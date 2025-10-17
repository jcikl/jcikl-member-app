import React from 'react';
import { Breadcrumb, Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { BreadcrumbItem } from '@/types';
import './styles.css';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  extra?: React.ReactNode;
  onBack?: () => void;
}

/**
 * Page Header Component
 * 页面标题组件
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="page-header-wrapper">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb 
          style={{ marginBottom: 8 }}
          items={breadcrumbs.map((item, index) => ({
            key: index,
            title: (
              <span 
                style={{ cursor: item.path ? 'pointer' : 'default' }}
                onClick={() => item.path && navigate(item.path)}
              >
                {item.title}
              </span>
            ),
          }))}
        />
      )}

      <div className="page-header">
        <div className="page-header-main">
          {onBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginRight: 16 }}
            />
          )}
          <div className="page-header-title-group">
            <Title level={2} style={{ margin: 0 }}>
              {title}
            </Title>
            {subtitle && <Text type="secondary">{subtitle}</Text>}
          </div>
        </div>

        {extra && <div className="page-header-extra">{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;

