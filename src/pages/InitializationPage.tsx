/**
 * Initialization Page
 * 系统初始化页面
 * 
 * 提供数据库初始化和类别初始化功能
 */

import React from 'react';
import { Row, Col, Space } from 'antd';
import { PageHeader } from '@/components/common/PageHeader';
// import { DataInitializer } from '@/components/admin/DataInitializer'; // 已删除
import FinancialCategoryInitializer from '@/components/admin/FinancialCategoryInitializer';

const InitializationPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        title="系统初始化"
        breadcrumbs={[
          { title: '首页', path: '/' },
          { title: '系统设置', path: '/settings' },
          { title: '系统初始化' },
        ]}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          {/* DataInitializer 已删除 */}
          {/* <Col xs={24}>
            <DataInitializer />
          </Col> */}
          
          <Col xs={24}>
            <FinancialCategoryInitializer />
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default InitializationPage;

