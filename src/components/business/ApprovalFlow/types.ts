/**
 * ApprovalFlow Types
 */

export type ApprovalAction = 'approve' | 'reject' | 'transfer' | 'recall';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type FlowStatus = 'pending' | 'approved' | 'rejected' | 'recalled';

export interface ApprovalNode {
  id: string;
  name: string;
  approvers: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  status: ApprovalStatus;
  required: boolean;
  sequence: number;
}

export interface ApprovalHistory {
  id: string;
  nodeId: string;
  nodeName: string;
  approverId: string;
  approverName: string;
  approverAvatar?: string;
  action: ApprovalAction;
  comment?: string;
  timestamp: Date | string;
}

export interface ApprovalFlowData {
  id: string;
  nodes: ApprovalNode[];
  currentNodeIndex: number;
  status: FlowStatus;
  history: ApprovalHistory[];
}

export interface ApprovalFlowProps {
  flowData: ApprovalFlowData;
  currentUserId: string;
  onApprove?: (nodeId: string, comment: string) => Promise<void>;
  onReject?: (nodeId: string, comment: string) => Promise<void>;
  onTransfer?: (nodeId: string, targetUserId: string, comment: string) => Promise<void>;
  onRecall?: (nodeId: string) => Promise<void>;
  loading?: boolean;
  readonly?: boolean;
  className?: string;
}

