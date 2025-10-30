import React from 'react';
import { Card, Button, Space, Skeleton, Segmented } from 'antd';
import { LineChartOutlined, BarChartOutlined, PieChartOutlined, AreaChartOutlined, DownloadOutlined } from '@ant-design/icons';

// 类型定义
import type { StatisticsChartProps, ChartType } from './types';

// 样式
import './styles.css';

/**
 * StatisticsChart Component
 * 统计图表组件(简化版，未集成 recharts)
 */
export const StatisticsChart: React.FC<StatisticsChartProps> = ({
  type,
  data,
  xAxisKey: _xAxisKey,
  yAxisKey: _yAxisKey,
  title,
  loading = false,
  height = 400,
  colors: _colors = ['#1890ff', '#52c41a', '#faad14'],
  showLegend = true,
  showGrid: _showGrid = true,
  onExport,
  className = '',
}) => {
  const [chartType, setChartType] = React.useState<ChartType>(type);

  const chartIcons = {
    line: <LineChartOutlined />,
    bar: <BarChartOutlined />,
    pie: <PieChartOutlined />,
    area: <AreaChartOutlined />,
  };

  if (loading) {
    return (
      <Card className={`statistics-chart ${className}`}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  return (
    <Card
      title={title}
      className={`statistics-chart ${className}`}
      extra={
        <Space>
          <Segmented
            value={chartType}
            onChange={(val) => setChartType(val as ChartType)}
            options={[
              { label: chartIcons.line, value: 'line' },
              { label: chartIcons.bar, value: 'bar' },
              { label: chartIcons.pie, value: 'pie' },
              { label: chartIcons.area, value: 'area' },
            ]}
          />
          {onExport && (
            <Button icon={<DownloadOutlined />} onClick={onExport}>
              导出PNG
            </Button>
          )}
        </Space>
      }
    >
      <div className="statistics-chart__container" style={{ height }}>
        {/* 这里应该集成 recharts，暂时使用占位符 */}
        <div className="statistics-chart__placeholder">
          <p>图表区域(需要集成 recharts 库)</p>
          <p>类型: {chartType}</p>
          <p>数据点: {data.length}</p>
        </div>
      </div>

      {showLegend && (
        <div className="statistics-chart__legend">
          {/* 图例 */}
        </div>
      )}
    </Card>
  );
};

export default StatisticsChart;

