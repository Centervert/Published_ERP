import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Book {
  id: string;
  contact_id: string;
  title: string;
  status: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
}

export function useBooks(contactId: string) {
  const { data: books = [], isLoading, error } = useQuery({
    queryKey: ['books', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
    enabled: !!contactId,
  });

  return { books, isLoading, error };
}

export function useAddBook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, title, status = 'draft' }: { 
      contactId: string; 
      title: string; 
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('books')
        .insert({
          contact_id: contactId,
          title,
          status,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books', variables.contactId] });
      toast.success('Book added successfully');
    },
    onError: (error) => {
      console.error('Error adding book:', error);
      toast.error('Failed to add book');
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, contactId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books', variables.contactId] });
      toast.success('Book removed');
    },
    onError: (error) => {
      console.error('Error deleting book:', error);
      toast.error('Failed to remove book');
    },
  });
}
