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
    return (
      <div className="loading-fullscreen">
        <Spin size={size} tip={tip} spinning={true} />
      </div>
    );
  }

  return (
    <div className="loading-container">
      <Spin size={size} tip={tip} spinning={true} />
    </div>
  );
};

export default LoadingSpinner;


