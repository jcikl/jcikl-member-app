/**
 * PricingTierCard Types
 */

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  features: string[];
  badge?: string;
  recommended?: boolean;
  available: boolean;
  limit?: number;
  remaining?: number;
}

export interface PricingTierCardProps {
  tiers: PricingTier[];
  onSelectTier: (tierId: string) => void;
  currency?: string;
  loading?: boolean;
  highlightTierId?: string;
  className?: string;
}

