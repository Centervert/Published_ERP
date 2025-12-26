import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  filterByUser?: string | null;
}

export function usePaginatedContacts({
  page,
  pageSize,
  search = '',
  statusFilter = 'all',
  typeFilter = 'all',
  filterByUser = null,
}: UsePaginatedContactsParams) {
  // Query for paginated data
  const contactsQuery = useQuery({
    queryKey: ['contacts-paginated', page, pageSize, search, statusFilter, typeFilter, filterByUser],
    queryFn: async () => {
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
          created_at,
          imprint:imprints(id, name)
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('contact_type', typeFilter);
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
