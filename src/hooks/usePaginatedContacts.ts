import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { LeadSource } from './useContacts';

export interface PaginatedContact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  contact_type: string | null;
  status: string;
  assigned_asc: string | null;
  assigned_ae: string | null;
  assigned_asc_text: string | null;
  assigned_ae_text: string | null;
  staff_asc_id: string | null;
  staff_ae_id: string | null;
  lead_source: LeadSource | null;
  lead_source_detail: string | null;
  created_at: string;
  imprint?: {
    id: string;
    name: string;
  } | null;
}

interface UsePaginatedContactsParams {
  page: number;
  pageSize: number;
  search?: string;
  statusFilter?: string;
  typeFilter?: string;
  sourceFilter?: string;
  validationFilter?: string;
  filterByUser?: string | null;
}

export function usePaginatedContacts({
  page,
  pageSize,
  search = '',
  statusFilter = 'all',
  typeFilter = 'all',
  sourceFilter = 'all',
  validationFilter = 'all',
  filterByUser = null,
}: UsePaginatedContactsParams) {
  // Query for paginated data
  const contactsQuery = useQuery({
    queryKey: ['contacts-paginated', page, pageSize, search, statusFilter, typeFilter, sourceFilter, validationFilter, filterByUser],
    queryFn: async () => {
      const normalizedSearch = (search ?? '').trim();
      // Always use 'planned' for fast count estimates on large tables (423k+ rows)
      // 'exact' count causes full table scans taking 2-3 seconds
      const countMode: 'exact' | 'planned' = 'planned';

      let query = supabase
        .from('contacts')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          contact_type,
          status,
          assigned_asc,
          assigned_ae,
          assigned_asc_text,
          assigned_ae_text,
          staff_asc_id,
          staff_ae_id,
          lead_source,
          lead_source_detail,
          created_at,
          imprint:imprints(id, name)
        `, { count: countMode });

      // Apply filters using optimized trigram-indexed columns
      if (normalizedSearch) {
        if (normalizedSearch.includes('@')) {
          // Email lookup: prefix match (fast with trigram index)
          query = query.ilike('email', `${normalizedSearch}%`);
        } else if (/\d/.test(normalizedSearch)) {
          // Phone search: contains digits, search normalized phone column
          const digits = normalizedSearch.replace(/\D/g, '');
          if (digits.length > 0) {
            query = query.ilike('phone_normalized', `%${digits}%`);
          }
        } else {
          // Name search: use combined search_name column (eliminates OR conditions)
          query = query.ilike('search_name', `%${normalizedSearch.toLowerCase()}%`);
        }
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('contact_type', typeFilter);
      }

      if (sourceFilter !== 'all') {
        query = query.eq('lead_source', sourceFilter as LeadSource);
      }

      // Validation status filter
      if (validationFilter === 'validated') {
        query = query.not('email_validation_result', 'is', null);
      } else if (validationFilter === 'unvalidated') {
        query = query.is('email_validation_result', null);
      } else if (validationFilter === 'deliverable') {
        query = query.eq('email_validation_result', 'deliverable');
      } else if (validationFilter === 'undeliverable') {
        query = query.or('email_validation_result.eq.undeliverable,email_validation_result.eq.do_not_send');
      } else if (validationFilter === 'risky') {
        query = query.or('email_validation_risk.eq.high,email_validation_risk.eq.medium');
      }

      if (filterByUser) {
        query = query.or(`assigned_asc.eq.${filterByUser},assigned_ae.eq.${filterByUser}`);
      }

      // Order and paginate
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        contacts: data as PaginatedContact[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    placeholderData: (previousData) => previousData,
  });

  return {
    contacts: contactsQuery.data?.contacts || [],
    totalCount: contactsQuery.data?.totalCount || 0,
    totalPages: contactsQuery.data?.totalPages || 1,
    isLoading: contactsQuery.isLoading,
    isFetching: contactsQuery.isFetching,
  };
}
