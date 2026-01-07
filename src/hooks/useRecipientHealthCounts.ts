import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EmailQualityFilter = 'validated_only' | 'include_unvalidated' | 'include_risky';

export interface RecipientHealthCounts {
  // Per list/imprint
  byList: Record<string, { sendable: number; excluded: number; notValidated: number }>;
  byImprint: Record<string, { sendable: number; excluded: number; notValidated: number }>;
  
  // Totals
  total: {
    sendable: number;      // deliverable + active + has email
    notValidated: number;  // active but not validated
    excluded: number;      // bounced + unsubscribed + complained + no email + undeliverable
  };
  
  // Breakdown of exclusions
  exclusionReasons: {
    noEmail: number;
    bounced: number;
    unsubscribed: number;
    complained: number;
    undeliverable: number;
  };
}

interface RPCResponse {
  total: {
    sendable: string;
    notValidated: string;
    excluded: string;
  };
  exclusionReasons: {
    noEmail: string;
    bounced: string;
    unsubscribed: string;
    complained: string;
    undeliverable: string;
  };
  byImprint: Record<string, { sendable: number; notValidated: number; excluded: number }>;
  byList: Record<string, { sendable: number; notValidated: number; excluded: number }>;
}

export function useRecipientHealthCounts() {
  return useQuery({
    queryKey: ['recipient-health-counts'],
    queryFn: async (): Promise<RecipientHealthCounts> => {
      // Call the database RPC function that aggregates all counts efficiently
      const { data, error } = await supabase.rpc('get_recipient_health_counts' as any);
      
      if (error) throw error;
      
      const response = data as unknown as RPCResponse;
      
      // Parse the response (numbers come as strings from JSONB)
      return {
        total: {
          sendable: parseInt(response.total.sendable) || 0,
          notValidated: parseInt(response.total.notValidated) || 0,
          excluded: parseInt(response.total.excluded) || 0,
        },
        exclusionReasons: {
          noEmail: parseInt(response.exclusionReasons.noEmail) || 0,
          bounced: parseInt(response.exclusionReasons.bounced) || 0,
          unsubscribed: parseInt(response.exclusionReasons.unsubscribed) || 0,
          complained: parseInt(response.exclusionReasons.complained) || 0,
          undeliverable: parseInt(response.exclusionReasons.undeliverable) || 0,
        },
        byImprint: response.byImprint || {},
        byList: response.byList || {},
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Helper to calculate sendable count based on quality filter
export function getSendableCount(
  counts: { sendable: number; notValidated: number; excluded: number },
  filter: EmailQualityFilter
): number {
  switch (filter) {
    case 'validated_only':
      return counts.sendable;
    case 'include_unvalidated':
      return counts.sendable + counts.notValidated;
    case 'include_risky':
      return counts.sendable + counts.notValidated; // Same for now, could add risky contacts
    default:
      return counts.sendable;
  }
}
