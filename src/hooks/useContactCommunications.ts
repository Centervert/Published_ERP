import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ContactCommunication {
  id: string;
  contact_id: string;
  type: 'email' | 'sms' | 'call';
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string | null;
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  duration_seconds: number | null;
  outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message' | null;
  notes: string | null;
  external_id: string | null;
  created_at: string;
  created_by: string | null;
}

export function useContactCommunications(contactId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['contact-communications', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_communications')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactCommunication[];
    },
    enabled: !!contactId,
  });

  const logCall = useMutation({
    mutationFn: async (callData: {
      direction: 'inbound' | 'outbound';
      duration_seconds?: number;
      outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message';
      notes?: string;
      deal_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('contact_communications')
        .insert({
          contact_id: contactId,
          type: 'call',
          direction: callData.direction,
          duration_seconds: callData.duration_seconds || null,
          outcome: callData.outcome,
          notes: callData.notes || null,
          status: 'sent',
          created_by: user?.id,
          deal_id: callData.deal_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-communications', contactId] });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async (emailData: {
      to: string;
      subject: string;
      body: string;
      reply_to?: string;
    }) => {
      // Send email via Outlook edge function
      const { data, error } = await supabase.functions.invoke('send-email-outlook', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          contact_id: contactId,
          reply_to: emailData.reply_to,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send email');
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-communications', contactId] });
    },
  });

  return {
    communications,
    isLoading,
    logCall,
    sendEmail,
  };
}
