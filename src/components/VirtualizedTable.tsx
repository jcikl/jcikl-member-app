/**
 * Virtualized Table Component
 * 虚拟化表格组件
 * 
 * ⚡ Performance: Renders only visible rows for large datasets
 * 性能优化：只渲染可见行，适用于大数据集
 */

import React, { useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Table } from 'antd';
import type { ColumnType } from 'antd/es/table';
import './VirtualizedTable.css';

interface VirtualizedTableProps<T = any> {
  columns: ColumnType<T>[];
  dataSource: T[];
  rowHeight?: number;
  height?: number | string;
  rowKey?: string | ((record: T) => string);
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLElement>;
  className?: string;
  loading?: boolean;
  locale?: any;
}

/**
 * Virtualized Table Component
 * 虚拟化表格组件
 */
export const VirtualizedTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  rowHeight = 50,
  height = '600px',
  rowKey = 'id',
  onRow,
  className = '',
  loading = false,
  locale,
}: VirtualizedTableProps<T>) => {
  const listRef = useRef<List>(null);

  // Scroll to top when data changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [dataSource]);

  // Get row key
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || String(index);
  };

  // Render row
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = dataSource[index];
    const key = getRowKey(record, index);
    const rowProps = onRow ? onRow(record, index) : {};

    return (
      <div 
        key={key}
        style={style} 
        className="virtualized-table-row"
        {...rowProps}
      >
        <div className="virtualized-table-row-inner">
          {columns.map((col, colIndex) => {
            const value = col.dataIndex ? record[col.dataIndex as string] : undefined;
            const rendered = col.render 
              ? col.render(value, record, index)
              : value;

            return (
              <div
                key={colIndex}
                className="virtualized-table-cell"
                style={{
                  width: col.width || 'auto',
                  flex: col.width ? undefined : 1,
                }}
              >
                {rendered}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Table
        columns={columns}
        dataSource={[]}
        loading={true}
        locale={locale}
      />
    );
  }

  if (!dataSource || dataSource.length === 0) {
    return (
      <Table
        columns={columns}
        dataSource={[]}
        locale={locale}
      />
    );
  }

  return (
    <div className={`virtualized-table-container ${className}`}>
      {/* Header */}
      <div className="virtualized-table-header">
        {columns.map((col, index) => (
          <div
            key={index}
            className="virtualized-table-header-cell"
            style={{
              width: col.width || 'auto',
              flex: col.width ? undefined : 1,
            }}
          >
            {col.title}
          </div>
        ))}
      </div>

      {/* Body with virtualization */}
      <div 
        className="virtualized-table-body" 
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <AutoSizer>
          {({ height: autoHeight, width }) => (
            <List
              ref={listRef}
              height={autoHeight}
              width={width}
              itemCount={dataSource.length}
              itemSize={rowHeight}
              overscanCount={5} // Render 5 extra rows for smooth scrolling
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>

      {/* Footer */}
      <div className="virtualized-table-footer">
        共 {dataSource.length} 条记录
      </div>
    </div>
  );
};

/**
 * Simple Virtualized List (for simpler use cases)
 * 简单虚拟化列表
 */
interface VirtualizedListProps<T = any> {
  data: T[];
  height?: number;
  itemHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyText?: string;
}

export const VirtualizedList = <T extends any>({
  data,
  height = 600,
  itemHeight = 50,
  renderItem,
  className = '',
  emptyText = '暂无数据',
}: VirtualizedListProps<T>) => {
  if (!data || data.length === 0) {
    return (
      <div className="virtualized-list-empty" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {emptyText}
      </div>
    );
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    return (
      <div style={style}>
        {renderItem(data[index], index)}
      </div>
    );
  };

  return (
    <div className={`virtualized-list ${className}`} style={{ height }}>
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedTable;

