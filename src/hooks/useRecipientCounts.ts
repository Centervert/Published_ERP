import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRecipientCounts() {
  // Get contact counts per imprint using RPC or individual queries
  const imprintCountsQuery = useQuery({
    queryKey: ['imprint-contact-counts'],
    queryFn: async () => {
      // First get all imprints
      const { data: imprints, error: imprintsError } = await supabase
        .from('imprints')
        .select('id');
      
      if (imprintsError) throw imprintsError;
      
      // Get counts for each imprint
      const counts: Record<string, number> = {};
      
      await Promise.all(
        imprints.map(async (imprint) => {
          const { count, error } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .eq('imprint_id', imprint.id);
          
          if (!error && count !== null) {
            counts[imprint.id] = count;
          }
        })
      );
      
      return counts;
    },
  });

  // Get contact counts per list
  const listCountsQuery = useQuery({
    queryKey: ['list-contact-counts'],
    queryFn: async () => {
      // First get all lists
      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .select('id');
      
      if (listsError) throw listsError;
      
      // Get counts for each list
      const counts: Record<string, number> = {};
      
      await Promise.all(
        lists.map(async (list) => {
          const { count, error } = await supabase
            .from('contact_lists')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);
          
          if (!error && count !== null) {
            counts[list.id] = count;
          }
        })
      );
      
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
