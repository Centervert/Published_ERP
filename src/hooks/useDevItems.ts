import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DevItemType = 'decision' | 'risk' | 'blocker' | 'milestone' | 'scope' | 'link' | 'release';
export type DevItemStatus = 'proposed' | 'accepted' | 'deprecated' | 'open' | 'mitigating' | 'closed';
export type DevItemSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DevItem {
  id: string;
  document_id: string;
  item_type: DevItemType;
  title: string;
  body_md: string | null;
  status: DevItemStatus | null;
  severity: DevItemSeverity | null;
  owner_name: string | null;
  owner_user_id: string | null;
  due_date: string | null;
  phase: string | null;
  related_type: string | null;
  related_id: string | null;
  tags: string[] | null;
  priority: number | null;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDevItems(documentId: string | undefined, itemType?: DevItemType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['dev-items', documentId, itemType],
    queryFn: async () => {
      if (!documentId) return [];
      let query = supabase
        .from('dev_items')
        .select('*')
        .eq('document_id', documentId)
        .eq('is_archived', false)
        .order('priority', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (itemType) {
        query = query.eq('item_type', itemType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DevItem[];
    },
    enabled: !!documentId,
  });

  const createItem = useMutation({
    mutationFn: async (item: Omit<DevItem, 'id' | 'created_at' | 'updated_at' | 'archived_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('dev_items')
        .insert({ ...item, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-items', documentId] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DevItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('dev_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-items', documentId] });
    },
  });

  const archiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('dev_items')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-items', documentId] });
    },
  });

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    error: itemsQuery.error,
    createItem,
    updateItem,
    archiveItem,
  };
}

// Helper hook to get items by type
export function useDecisions(documentId: string | undefined) {
  return useDevItems(documentId, 'decision');
}

export function useRisks(documentId: string | undefined) {
  const { items, ...rest } = useDevItems(documentId);
  const risksAndBlockers = items.filter(i => i.item_type === 'risk' || i.item_type === 'blocker');
  return { items: risksAndBlockers, ...rest };
}

export function useMilestones(documentId: string | undefined) {
  return useDevItems(documentId, 'milestone');
}

export function useReleases(documentId: string | undefined) {
  return useDevItems(documentId, 'release');
}
