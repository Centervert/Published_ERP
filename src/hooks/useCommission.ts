import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommissionTier {
  id: string;
  min_amount: number;
  max_amount: number | null;
  percentage: number;
  milestone_bonus: number;
  created_at: string | null;
}

export interface CommissionCalculation {
  commission: number;
  tierPercentage: number;
  milestoneBonus: number;
}

export function useCommissionTiers() {
  return useQuery({
    queryKey: ['commission-tiers'],
    queryFn: async (): Promise<CommissionTier[]> => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .select('*')
        .order('min_amount', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function calculateCommission(
  saleAmount: number,
  cumulativeSales: number,
  tiers: CommissionTier[]
): CommissionCalculation {
  // Find the applicable tier based on cumulative sales
  const applicableTier = tiers.find(
    (tier) =>
      cumulativeSales >= tier.min_amount &&
      (tier.max_amount === null || cumulativeSales <= tier.max_amount)
  );

  if (!applicableTier) {
    // Default to lowest tier if no match
    const lowestTier = tiers[0];
    return {
      commission: saleAmount * ((lowestTier?.percentage || 6) / 100),
      tierPercentage: lowestTier?.percentage || 6,
      milestoneBonus: 0,
    };
  }

  return {
    commission: saleAmount * (applicableTier.percentage / 100),
    tierPercentage: applicableTier.percentage,
    milestoneBonus: applicableTier.milestone_bonus,
  };
}

export function useAscSalesTotal(ascId: string, startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['asc-sales-total', ascId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<number> => {
      let query = supabase
        .from('deals')
        .select('total_value')
        .eq('assigned_asc', ascId)
        .eq('stage', 'won')
        .eq('commission_locked', true);

      if (startDate) {
        query = query.gte('closed_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('closed_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).reduce((sum, deal) => sum + (deal.total_value || 0), 0);
    },
    enabled: !!ascId,
  });
}

export function useAscCommissionSummary(ascId: string, startDate?: Date, endDate?: Date) {
  const { data: tiers = [] } = useCommissionTiers();
  const { data: totalSales = 0, isLoading } = useAscSalesTotal(ascId, startDate, endDate);

  const calculation = calculateCommission(totalSales, totalSales, tiers);

  // Calculate next tier info
  const currentTierIndex = tiers.findIndex(
    (tier) =>
      totalSales >= tier.min_amount &&
      (tier.max_amount === null || totalSales <= tier.max_amount)
  );
  const nextTier = currentTierIndex >= 0 && currentTierIndex < tiers.length - 1
    ? tiers[currentTierIndex + 1]
    : null;

  const amountToNextTier = nextTier 
    ? nextTier.min_amount - totalSales 
    : 0;

  return {
    totalSales,
    commission: calculation.commission,
    tierPercentage: calculation.tierPercentage,
    milestoneBonus: calculation.milestoneBonus,
    nextTier,
    amountToNextTier,
    isLoading,
  };
}
