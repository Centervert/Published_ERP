import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommunicationCounts {
  emails: number;
  calls: number;
  sms: number;
}

export function useDealCommunicationCounts(contactIds: string[]) {
  return useQuery({
    queryKey: ['deal-communication-counts', contactIds],
    queryFn: async (): Promise<Record<string, CommunicationCounts>> => {
      if (contactIds.length === 0) return {};

      const { data, error } = await supabase
        .from('contact_communications')
        .select('contact_id, type')
        .in('contact_id', contactIds);

      if (error) throw error;

      // Group counts by contact_id and type
      const counts: Record<string, CommunicationCounts> = {};
      
      contactIds.forEach(id => {
        counts[id] = { emails: 0, calls: 0, sms: 0 };
      });

      (data || []).forEach((comm) => {
        if (!counts[comm.contact_id]) {
          counts[comm.contact_id] = { emails: 0, calls: 0, sms: 0 };
        }
        
        if (comm.type === 'email') {
          counts[comm.contact_id].emails++;
        } else if (comm.type === 'call') {
          counts[comm.contact_id].calls++;
        } else if (comm.type === 'sms') {
          counts[comm.contact_id].sms++;
        }
      });

      return counts;
    },
    enabled: contactIds.length > 0,
  });
}
