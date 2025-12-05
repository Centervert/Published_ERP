import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contact[];
    },
  });

  const createContact = useMutation({
    mutationFn: async (contact: { email: string; first_name?: string; last_name?: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          email: contact.email,
          first_name: contact.first_name || null,
          last_name: contact.last_name || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact added successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast({ title: 'Contact already exists', description: 'This email is already in your contacts.', variant: 'destructive' });
      } else {
        toast({ title: 'Error adding contact', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating contact', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
    },
  });

  const bulkCreateContacts = useMutation({
    mutationFn: async (contacts: { email: string; first_name?: string; last_name?: string }[]) => {
      const contactsWithUser = contacts.map(c => ({
        email: c.email,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('contacts')
        .upsert(contactsWithUser, { onConflict: 'email', ignoreDuplicates: true })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: `Imported ${data?.length || 0} contacts` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing contacts', description: error.message, variant: 'destructive' });
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    createContact,
    updateContact,
    deleteContact,
    bulkCreateContacts,
  };
}

export function useLists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const listsQuery = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as List[];
    },
  });

  const createList = useMutation({
    mutationFn: async (list: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({
          name: list.name,
          description: list.description || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({ title: 'List created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating list', description: error.message, variant: 'destructive' });
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({ title: 'List deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting list', description: error.message, variant: 'destructive' });
    },
  });

  return {
    lists: listsQuery.data || [],
    isLoading: listsQuery.isLoading,
    createList,
    deleteList,
  };
}

export function useTags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Tag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (tag: { name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: tag.name,
          color: tag.color || '#6B7280',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: 'Tag created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating tag', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: 'Tag deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting tag', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    createTag,
    deleteTag,
  };
}
