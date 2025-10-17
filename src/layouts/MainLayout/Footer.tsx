import React from 'react';
import { Layout } from 'antd';

const { Footer: AntFooter } = Layout;

/**
 * Footer Component
 * 底部栏组件
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <AntFooter
      className="app-footer"
      style={{
        textAlign: 'center',
        transition: 'background-color 0.3s ease',
        background: 'var(--card-bg)',
        borderTop: '1px solid var(--border-color-light)',
        color: 'var(--text-secondary)',
      }}
    >
      JCI KL Membership System ©{currentYear} Created by JCI KL
    </AntFooter>
  );
};

export default Footer;


