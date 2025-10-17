/**
 * ExportModal Types
 */

export type ExportFormat = 'excel' | 'csv' | 'pdf';
export type ExportRange = 'all' | 'current' | 'selected' | 'dateRange';

export interface ExportColumn {
  key: string;
  title: string;
  dataIndex: string;
  selected?: boolean;
}

export interface ExportTemplate {
  id: string;
  name: string;
  format: ExportFormat;
  columns: string[];
}

export interface ExportConfig {
  format: ExportFormat;
  columns: string[];
  range: ExportRange;
  dateRange?: [Date, Date];
  template?: string;
}

export interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  columns: ExportColumn[];
  dataSource: any[];
  onExport: (config: ExportConfig) => Promise<void>;
  formats?: ExportFormat[];
  templates?: ExportTemplate[];
  selectedCount?: number;
  className?: string;
}

