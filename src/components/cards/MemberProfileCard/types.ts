/**
 * MemberProfileCard Types
 */

export interface MemberProfile {
  id: string;
  name: string;
  chineseName?: string;
  avatar?: string;
  category: string;
  position?: string;
  status: 'active' | 'inactive' | 'suspended';
  email?: string;
  phone?: string;
  joinDate: Date | string;
  stats?: {
    tasks: number;
    events: number;
    points: number;
  };
}

export interface ActionConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  visible?: boolean;
  danger?: boolean;
}

export interface MemberProfileCardProps {
  member: MemberProfile;
  mode?: 'compact' | 'expanded';
  editable?: boolean;
  onEdit?: () => void;
  onDisable?: () => void;
  onMessage?: () => void;
  onViewDetail?: () => void;
  onAvatarChange?: (file: File) => Promise<string>;
  actions?: ActionConfig[];
  loading?: boolean;
  className?: string;
}

