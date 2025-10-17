import React, { useState } from 'react';
import { Table, Input, Button, Space } from 'antd';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TableProps, ColumnType } from 'antd/es/table';
import { globalComponentService } from '@/config';
import './styles.css';

interface DataTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ColumnType<T>[];
  searchable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  onSearch?: (value: string) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  toolbarExtra?: React.ReactNode;
}

/**
 * Data Table Component
 * 增强型数据表格组件
 */
export function DataTable<T extends object>({
  columns,
  dataSource,
  loading,
  pagination,
  searchable = true,
  exportable = false,
  refreshable = true,
  onSearch,
  onExport,
  onRefresh,
  toolbarExtra,
  ...restProps
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const tableConfig = globalComponentService.getTableConfig();

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <div className="data-table-wrapper">
      {/* Toolbar */}
      {(searchable || exportable || refreshable || toolbarExtra) && (
        <div className="data-table-toolbar">
          <Space>
            {searchable && (
              <Input.Search
                placeholder="搜索..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 300 }}
                allowClear
              />
            )}
          </Space>

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
          </Space>
        </div>
      )}

      {/* Table */}
      <Table
        {...tableConfig}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={pagination}
        rowKey="id"
        {...restProps}
      />
    </div>
  );
}

export default DataTable;

