/**
 * BudgetAllocator Types
 */

export interface BudgetCategory {
  id: string;
  name: string;
  parentId?: string;
  allocated: number;
  spent: number;
  limit?: number;
  children?: BudgetCategory[];
}

export interface AllocationData {
  categoryId: string;
  amount: number;
}

export interface BudgetAllocatorProps {
  categories: BudgetCategory[];
  totalBudget: number;
  onAllocate: (allocations: AllocationData[]) => Promise<void>;
  currency?: string;
  editable?: boolean;
  loading?: boolean;
  onExport?: (format: 'pdf' | 'excel') => void;
  className?: string;
}

