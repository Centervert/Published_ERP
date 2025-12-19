import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRecipientCounts() {
  // Get contact counts per imprint
  const imprintCountsQuery = useQuery({
    queryKey: ['imprint-contact-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('imprint_id')
        .eq('status', 'active')
        .not('imprint_id', 'is', null);
      
      if (error) throw error;
      
      // Count contacts per imprint
      const counts: Record<string, number> = {};
      data.forEach((contact) => {
        if (contact.imprint_id) {
          counts[contact.imprint_id] = (counts[contact.imprint_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Get contact counts per list
  const listCountsQuery = useQuery({
    queryKey: ['list-contact-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('list_id');
      
      if (error) throw error;
      
      // Count contacts per list
      const counts: Record<string, number> = {};
      data.forEach((entry) => {
        counts[entry.list_id] = (counts[entry.list_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Get total active contacts count
  const totalCountQuery = useQuery({
    queryKey: ['total-active-contacts'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (error) throw error;
      return count || 0;
    },
  });

  return {
    imprintCounts: imprintCountsQuery.data || {},
    listCounts: listCountsQuery.data || {},
    totalCount: totalCountQuery.data || 0,
    isLoading: imprintCountsQuery.isLoading || listCountsQuery.isLoading || totalCountQuery.isLoading,
  };
}
