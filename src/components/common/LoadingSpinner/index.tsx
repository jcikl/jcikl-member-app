import React from 'react';
import { Spin } from 'antd';
import './styles.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  fullscreen?: boolean;
}

/**
 * Loading Spinner Component
 * 加载动画组件
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  tip,
  fullscreen = false,
}) => {
  if (fullscreen) {
    // 全屏模式：tip 有效
    return (
      <div className="loading-fullscreen">
        <Spin size={size} tip={tip} spinning={true} />
      </div>
    );
  }

  // 非全屏模式：tip 无效，改用文本节点
  return (
    <div className="loading-container">
      {tip && <div style={{ marginBottom: 16, textAlign: 'center' }}>{tip}</div>}
      <Spin size={size} spinning={true} />
    </div>
  );
};

export default LoadingSpinner;


