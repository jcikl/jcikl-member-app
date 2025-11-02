/**
 * Lazy Load Wrapper Component
 * 懒加载包装组件
 * 
 * ⚡ Performance: Code splitting with loading states
 * 性能优化：带加载状态的代码分割
 */

import React, { Suspense, ComponentType } from 'react';
import { Spin, Result, Button } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  minHeight?: number | string;
}

/**
 * Loading Skeleton for pages
 * 页面加载骨架屏
 */
export const PageSkeleton: React.FC<{ minHeight?: number | string }> = ({ minHeight = '80vh' }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight,
      width: '100%',
    }}
  >
    <Spin
      size="large"
      indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
      tip="加载中..."
    />
  </div>
);

/**
 * Card Skeleton
 * 卡片骨架屏
 */
export const CardSkeleton: React.FC = () => (
  <div style={{ padding: '20px', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin />
  </div>
);

/**
 * Error Boundary Fallback
 * 错误边界回退组件
 */
interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => (
  <Result
    status="error"
    title="加载失败"
    subTitle={error?.message || '组件加载出错，请刷新页面重试'}
    extra={
      resetErrorBoundary && (
        <Button type="primary" onClick={resetErrorBoundary}>
          重试
        </Button>
      )
    }
  />
);

/**
 * Lazy Load Wrapper with error boundary
 * 带错误边界的懒加载包装器
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback = <PageSkeleton />,
  errorFallback = <ErrorFallback />,
  minHeight,
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <PageSkeleton minHeight={minHeight} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Simple Error Boundary
 * 简单错误边界
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoad Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * Helper function to create lazy loaded component
 * 创建懒加载组件的辅助函数
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(importFn);

  return (props: React.ComponentProps<T>) => (
    <LazyLoadWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyLoadWrapper>
  );
};

export default LazyLoadWrapper;

