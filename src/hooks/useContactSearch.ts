import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactSearchResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface UseContactSearchParams {
  search: string;
  excludeIds?: string[];
  limit?: number;
  enabled?: boolean;
}

/**
 * Lightweight hook for searching contacts by name, email, or phone.
 * Uses the optimized search_name column with trigram indexes for name search,
 * and also searches email and phone_normalized fields.
 * Only fetches when search term is provided (no eager loading).
 */
export function useContactSearch({
  search,
  excludeIds = [],
  limit = 50,
  enabled = true,
}: UseContactSearchParams) {
  return useQuery({
    queryKey: ['contact-search', search, excludeIds, limit],
    queryFn: async () => {
      const normalizedSearch = search.trim().toLowerCase();
      
      if (!normalizedSearch) {
        return [];
      }

      // Build OR filter to search across name, email, and phone
      let query = supabase
        .from('contacts')
        .select('id, email, first_name, last_name, phone')
        .or(`search_name.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%,phone_normalized.ilike.%${normalizedSearch}%`)
        .limit(limit);

      // Exclude already-selected contacts
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as ContactSearchResult[];
    },
    enabled: enabled && search.trim().length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });
}
