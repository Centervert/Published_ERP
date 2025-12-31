import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DealStage = 
  | 'new' 
  | 'outreach' 
  | 'contacted' 
  | 'qualified' 
  | 'nurturing' 
  | 'proposal_sent' 
  | 'won' 
  | 'lost' 
  | 'not_interested';

export interface Deal {
  id: string;
  contact_id: string;
  assigned_asc: string | null;
  stage: DealStage;
  outreach_count: number;
  total_value: number | null;
  commission_amount: number | null;
  commission_locked: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
  // Joined data
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    timezone: string | null;
    imprint_id: string | null;
    lead_source: string | null;
    lead_source_detail: string | null;
  };
  assigned_user?: {
    full_name: string | null;
  };
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: 'New',
  outreach: 'Outreach',
  contacted: 'Contacted',
  qualified: 'Qualified',
  nurturing: 'Nurturing',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
  not_interested: 'Not Interested',
};

export const DEAL_STAGES_ORDER: DealStage[] = [
  'new',
  'outreach',
  'contacted',
  'qualified',
  'nurturing',
  'proposal_sent',
  'won',
  'lost',
  'not_interested',
];

export function useDeals(filters?: { stage?: DealStage; assignedAsc?: string }) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async (): Promise<Deal[]> => {
      let query = supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(id, first_name, last_name, email, phone, timezone, imprint_id, lead_source, lead_source_detail)
        `)
        .order('created_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.assignedAsc) {
        query = query.eq('assigned_asc', filters.assignedAsc);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch assigned user names separately
      const ascIds = [...new Set((data || []).map(d => d.assigned_asc).filter(Boolean))];
      let userMap: Record<string, string> = {};
      
      if (ascIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ascIds);
        
        profiles?.forEach(p => {
          userMap[p.id] = p.full_name || '';
        });
      }

      return (data || []).map((deal) => ({
        ...deal,
        stage: deal.stage as DealStage,
        contact: deal.contact as Deal['contact'],
        assigned_user: deal.assigned_asc ? { full_name: userMap[deal.assigned_asc] || null } : undefined,
      }));
    },
  });
}

export function useDealsByContact(contactId: string) {
  return useQuery({
    queryKey: ['deals', 'contact', contactId],
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch assigned user names separately
      const ascIds = [...new Set((data || []).map(d => d.assigned_asc).filter(Boolean))];
      let userMap: Record<string, string> = {};
      
      if (ascIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ascIds);
        
        profiles?.forEach(p => {
          userMap[p.id] = p.full_name || '';
        });
      }

      return (data || []).map((deal) => ({
        ...deal,
        stage: deal.stage as DealStage,
        assigned_user: deal.assigned_asc ? { full_name: userMap[deal.assigned_asc] || null } : undefined,
      }));
    },
    enabled: !!contactId,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: {
      contact_id: string;
      assigned_asc?: string;
      stage?: DealStage;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deals')
        .insert({
          contact_id: deal.contact_id,
          assigned_asc: deal.assigned_asc || user.id,
          stage: deal.stage || 'new',
          notes: deal.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal created');
    },
    onError: (error) => {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      updates,
    }: {
      dealId: string;
      updates: Partial<{
        stage: DealStage;
        outreach_count: number;
        total_value: number;
        commission_amount: number;
        notes: string;
        assigned_asc: string;
        closed_at: string;
      }>;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal updated');
    },
    onError: (error) => {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal deleted');
    },
    onError: (error) => {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    },
  });
}
