import React, { useState, useMemo } from 'react';
import { Table, Button, Space, message } from 'antd';
import {
  DeleteOutlined,
  ExportOutlined,
} from '@ant-design/icons';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
import type { DataGridProps } from './types';

// 样式
import './styles.css';

/**
 * DataGrid Component
 * 智能数据网格组件（简化版）
 * 
 * @description 增强版表格，支持批量操作、列配置等功能
 */
export function DataGrid<T extends { id?: string }>({
  columns,
  dataSource,
  editable = false,
  batchOperable = true,
  configurable = false,
  draggable = false,
  onRowEdit,
  onBatchDelete,
  onBatchExport,
  onRowReorder,
  storageKey = 'data-grid-config',
  rowKey = 'id',
  loading = false,
  ...restProps
}: DataGridProps<T>) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const tableConfig = globalComponentService.getTableConfig();

  /**
   * 转换列配置为 Ant Design Table 格式
   */
  const tableColumns = useMemo(() => {
    return columns
      .filter(col => !col.hidden)
      .map(col => ({
        key: col.key,
        title: col.title,
        dataIndex: col.dataIndex,
        width: col.width,
        align: col.align,
        fixed: col.fixed,
        sorter: col.sortable ? (a: any, b: any) => {
          const aVal = a[col.dataIndex];
          const bVal = b[col.dataIndex];
          if (typeof aVal === 'number') return aVal - bVal;
          return String(aVal).localeCompare(String(bVal));
        } : undefined,
        render: col.render,
      }));
  }, [columns]);

  /**
   * 行选择配置
   */
  const rowSelection = batchOperable ? {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  } : undefined;

  /**
   * 批量删除
   */
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的项');
      return;
    }

    if (onBatchDelete) {
      await onBatchDelete(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
      message.success(`已删除 ${selectedRowKeys.length} 项`);
    }
  };

  /**
   * 批量导出
   */
  const handleBatchExport = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的项');
      return;
    }

    if (onBatchExport) {
      onBatchExport(selectedRowKeys as string[]);
      message.success('导出成功');
    }
  };

  /**
   * 渲染批量操作栏
   */
  const renderBatchBar = () => {
    if (!batchOperable || selectedRowKeys.length === 0) {
      return null;
    }

    return (
      <div className="data-grid__batch-bar">
        <Space>
          <span>已选择 {selectedRowKeys.length} 项</span>
          {onBatchDelete && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          )}
          {onBatchExport && (
            <Button
              icon={<ExportOutlined />}
              onClick={handleBatchExport}
            >
              批量导出
            </Button>
          )}
          <Button
            type="text"
            onClick={() => setSelectedRowKeys([])}
          >
            取消选择
          </Button>
        </Space>
      </div>
    );
  };

  return (
    <div className="data-grid">
      {/* 批量操作栏 */}
      {renderBatchBar()}

      {/* 表格 */}
      <Table
        {...tableConfig}
        columns={tableColumns as any}
        dataSource={dataSource}
        rowSelection={rowSelection}
        rowKey={rowKey}
        loading={loading}
        className="data-grid__table"
        {...restProps}
      />
    </div>
  );
}

export default DataGrid;

