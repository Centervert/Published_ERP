import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DevMeeting {
  id: string;
  document_id: string;
  title: string;
  meeting_date: string | null;
  attendees: string[] | null;
  notes_md: string | null;
  outcomes_md: string | null;
  action_items_md: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevMeetingLink {
  id: string;
  meeting_id: string;
  item_id: string;
  created_at: string;
}

export function useDevMeetings(documentId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const meetingsQuery = useQuery({
    queryKey: ['dev-meetings', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from('dev_meetings')
        .select('*')
        .eq('document_id', documentId)
        .order('meeting_date', { ascending: false });
      if (error) throw error;
      return data as DevMeeting[];
    },
    enabled: !!documentId,
  });

  const createMeeting = useMutation({
    mutationFn: async (meeting: Omit<DevMeeting, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('dev_meetings')
        .insert({ ...meeting, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-meetings', documentId] });
    },
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DevMeeting> & { id: string }) => {
      const { data, error } = await supabase
        .from('dev_meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-meetings', documentId] });
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dev_meetings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-meetings', documentId] });
    },
  });

  return {
    meetings: meetingsQuery.data ?? [],
    isLoading: meetingsQuery.isLoading,
    error: meetingsQuery.error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}

export function useMeetingLinks(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ['dev-meeting-links', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from('dev_meeting_links')
        .select('*')
        .eq('meeting_id', meetingId);
      if (error) throw error;
      return data as DevMeetingLink[];
    },
    enabled: !!meetingId,
  });

  const linkItem = useMutation({
    mutationFn: async ({ meetingId, itemId }: { meetingId: string; itemId: string }) => {
      const { data, error } = await supabase
        .from('dev_meeting_links')
        .insert({ meeting_id: meetingId, item_id: itemId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-meeting-links', meetingId] });
    },
  });

  const unlinkItem = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('dev_meeting_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-meeting-links', meetingId] });
    },
  });

  return {
    links: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading,
    linkItem,
    unlinkItem,
  };
}
