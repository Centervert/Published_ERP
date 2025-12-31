import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DealCommunication {
  id: string;
  contact_id: string;
  deal_id: string | null;
  type: 'email' | 'sms' | 'call';
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string | null;
  status: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export function useDealCommunications(dealId: string | null) {
  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['deal-communications', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      
      const { data, error } = await supabase
        .from('contact_communications')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DealCommunication[];
    },
    enabled: !!dealId,
  });

  return {
    communications,
    isLoading,
  };
}
