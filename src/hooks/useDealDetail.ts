import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DealStage } from './useDeals';

export interface DealDetail {
  id: string;
  contact_id: string;
  stage: DealStage;
  name: string | null;
  writing_status: string | null;
  book_title: string | null;
  book_description: string | null;
  goals: string | null;
  notes: string | null;
  total_value: number | null;
  commission_amount: number | null;
  assigned_asc: string | null;
  assigned_asc_name?: string | null;
  outreach_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  created_by: string | null;
}

export const WRITING_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: '30_days', label: '30 Days' },
  { value: '90_days', label: '90 Days' },
  { value: '6_months', label: '6 Months' },
  { value: 'completed', label: 'Completed' },
] as const;

export function useDealDetail(dealId: string | null) {
  const queryClient = useQueryClient();

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal-detail', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (error) throw error;
      
      // Fetch assigned user name separately
      let assignedAscName: string | null = null;
      if (data.assigned_asc) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.assigned_asc)
          .single();
        assignedAscName = profile?.full_name || null;
      }
      
      return {
        ...data,
        assigned_asc_name: assignedAscName,
      } as DealDetail;
    },
    enabled: !!dealId,
  });

  const updateDeal = useMutation({
    mutationFn: async (updates: Partial<Omit<DealDetail, 'id' | 'contact_id' | 'created_at' | 'created_by'>>) => {
      if (!dealId) throw new Error('No deal ID');
      
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-detail', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal updated');
    },
    onError: (error) => {
      toast.error('Failed to update deal');
      console.error('Update deal error:', error);
    },
  });

  return {
    deal,
    isLoading,
    updateDeal,
  };
}
