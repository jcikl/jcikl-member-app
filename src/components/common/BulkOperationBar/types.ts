/**
 * BulkOperationBar Types
 */

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  confirmMessage?: string;
  disabled?: boolean;
  loading?: boolean;
}

export interface BulkOperationBarProps {
  visible: boolean;
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onSelectAll?: () => void;
  onDeselectAll: () => void;
  onClose?: () => void;
  className?: string;
}

