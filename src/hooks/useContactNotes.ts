import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ContactNote {
  id: string;
  contact_id: string;
  deal_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name?: string | null;
}

interface UseContactNotesOptions {
  contactId: string;
  dealId?: string | null;
}

export function useContactNotes({ contactId, dealId }: UseContactNotesOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = dealId 
    ? ['contact-notes', contactId, dealId] 
    : ['contact-notes', contactId, 'general'];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('contact_notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (dealId) {
        query = query.eq('deal_id', dealId);
      } else {
        query = query.is('deal_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []) as ContactNote[];
    },
    enabled: !!contactId,
  });

  const addNote = useMutation({
    mutationFn: async ({ content, dealId: noteDealId }: { content: string; dealId?: string | null }) => {
      const { data, error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: contactId,
          deal_id: noteDealId || null,
          content,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const noteQueryKey = variables.dealId 
        ? ['contact-notes', contactId, variables.dealId] 
        : ['contact-notes', contactId, 'general'];
      queryClient.invalidateQueries({ queryKey: noteQueryKey });
    },
    onError: (error) => {
      console.error('Add note error:', error);
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from('contact_notes')
        .update({ content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-notes', contactId] });
    },
    onError: (error) => {
      console.error('Update note error:', error);
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-notes', contactId] });
    },
    onError: (error) => {
      console.error('Delete note error:', error);
    },
  });

  return {
    notes,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
  };
}
