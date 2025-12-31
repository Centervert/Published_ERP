import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ContactTask {
  id: string;
  contact_id: string;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name?: string | null;
}

interface UseContactTasksOptions {
  contactId: string;
  dealId?: string | null;
}

export function useContactTasks({ contactId, dealId }: UseContactTasksOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = dealId 
    ? ['contact-tasks', contactId, dealId] 
    : ['contact-tasks', contactId, 'general'];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('contact_tasks')
        .select('*')
        .eq('contact_id', contactId)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (dealId) {
        query = query.eq('deal_id', dealId);
      } else {
        query = query.is('deal_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []) as ContactTask[];
    },
    enabled: !!contactId,
  });

  const addTask = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description?: string;
      due_date?: string;
      priority?: 'low' | 'medium' | 'high';
      dealId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('contact_tasks')
        .insert({
          contact_id: contactId,
          deal_id: taskData.dealId || null,
          title: taskData.title,
          description: taskData.description || null,
          due_date: taskData.due_date || null,
          priority: taskData.priority || 'medium',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const taskQueryKey = variables.dealId 
        ? ['contact-tasks', contactId, variables.dealId] 
        : ['contact-tasks', contactId, 'general'];
      queryClient.invalidateQueries({ queryKey: taskQueryKey });
    },
    onError: (error) => {
      console.error('Add task error:', error);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContactTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('contact_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tasks', contactId] });
    },
    onError: (error) => {
      console.error('Update task error:', error);
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('contact_tasks')
        .update({ 
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tasks', contactId] });
    },
    onError: (error) => {
      console.error('Toggle task error:', error);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tasks', contactId] });
    },
    onError: (error) => {
      console.error('Delete task error:', error);
    },
  });

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    toggleComplete,
    deleteTask,
  };
}
