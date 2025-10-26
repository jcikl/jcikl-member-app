import React, { useState, useMemo } from 'react';
import { Table, Button, Space, Input, message } from 'antd';
import {
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TableProps, ColumnType } from 'antd/es/table';

// 全局配置
import { globalComponentService } from '@/config/globalComponentSettings';

// 类型定义
export interface BaseTableProps<T extends { id?: string }> extends Omit<TableProps<T>, 'columns'> {
  columns: ColumnType<T>[];
  // 搜索功能
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  // 导出功能
  exportable?: boolean;
  onExport?: () => void;
  // 刷新功能
  refreshable?: boolean;
  onRefresh?: () => void;
  // 批量操作
  batchOperable?: boolean;
  onBatchDelete?: (selectedKeys: React.Key[]) => Promise<void>;
  onBatchExport?: (selectedKeys: React.Key[]) => Promise<void>;
  // 工具栏
  toolbarExtra?: React.ReactNode;
  // 配置
  storageKey?: string;
  rowKey?: string;
}

/**
 * BaseTable Component
 * 基础表格组件
 * 
 * @description 统一的表格基础组件，提供标准化的表格行为
 */
export function BaseTable<T extends { id?: string }>({
  columns,
  dataSource,
  loading,
  pagination,
  searchable = true,
  searchPlaceholder = '搜索...',
  onSearch,
  exportable = false,
  onExport,
  refreshable = true,
  onRefresh,
  batchOperable = false,
  onBatchDelete,
  onBatchExport,
  toolbarExtra,
  storageKey = 'base-table-config',
  rowKey = 'id',
  ...restProps
}: BaseTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const tableConfig = globalComponentService.getTableConfig();

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  /**
   * 处理批量删除
   */
  const handleBatchDelete = async () => {
    if (!onBatchDelete || selectedRowKeys.length === 0) return;

    try {
      await onBatchDelete(selectedRowKeys);
      message.success(`已删除 ${selectedRowKeys.length} 条记录`);
      setSelectedRowKeys([]);
    } catch (error: any) {
      message.error(error.message || '批量删除失败');
    }
  };

  /**
   * 处理批量导出
   */
  const handleBatchExport = async () => {
    if (!onBatchExport || selectedRowKeys.length === 0) return;

    try {
      await onBatchExport(selectedRowKeys);
      message.success(`已导出 ${selectedRowKeys.length} 条记录`);
    } catch (error: any) {
      message.error(error.message || '批量导出失败');
    }
  };

  /**
   * 行选择配置
   */
  const rowSelection = batchOperable ? {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  } : undefined;

  /**
   * 渲染工具栏
   */
  const renderToolbar = () => {
    if (!searchable && !exportable && !refreshable && !toolbarExtra && !batchOperable) {
      return null;
    }

    return (
      <div className="base-table-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左侧：搜索 */}
          <div>
            {searchable && (
              <Input.Search
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 300 }}
                allowClear
                prefix={<SearchOutlined />}
              />
            )}
          </div>

          {/* 右侧：操作按钮 */}
          <Space>
            {toolbarExtra}
            
            {refreshable && onRefresh && (
              <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                刷新
              </Button>
            )}
            
            {exportable && onExport && (
              <Button icon={<ExportOutlined />} onClick={onExport}>
                导出
              </Button>
            )}

            {batchOperable && selectedRowKeys.length > 0 && (
              <>
                <span style={{ color: '#666' }}>
                  已选择 {selectedRowKeys.length} 项
                </span>
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
              </>
            )}
          </Space>
        </div>
      </div>
    );
  };

  return (
    <div className="base-table-wrapper">
      {renderToolbar()}
      
      <Table
        {...tableConfig}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
        rowKey={rowKey}
        className="base-table"
        {...restProps}
      />
    </div>
  );
}

export default BaseTable;
