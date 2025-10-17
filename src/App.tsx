import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { theme } from './config/theme';
import NetworkStatus from './components/common/NetworkStatus';

/**
 * Main Application Component
 * 主应用组件
 * 
 * 使用 Ant Design App 组件包装以支持静态方法使用动态主题
 */
const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>
        <NetworkStatus />
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;


