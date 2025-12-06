import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  template_id: string | null;
  html_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  openedHuman: number; // Excluding bots
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export function useCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: {
      name: string;
      subject: string;
      from_name: string;
      from_email: string;
      reply_to_email?: string;
      html_content: string;
      template_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating campaign', description: error.message, variant: 'destructive' });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating campaign', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting campaign', description: error.message, variant: 'destructive' });
    },
  });

  const sendCampaign = useMutation({
    mutationFn: async ({ campaignId, listIds }: { campaignId: string; listIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId, listIds },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign is being sent!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error sending campaign', description: error.message, variant: 'destructive' });
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    refetch: campaignsQuery.refetch,
  };
}

export function useCampaignStats(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const { data, error } = await supabase
        .from('email_events')
        .select('event_type, email, is_bot')
        .eq('campaign_id', campaignId);
      
      if (error) throw error;

      const stats: CampaignStats = {
        sent: 0,
        delivered: 0,
        opened: 0,
        openedHuman: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
      };

      // Track unique opens/clicks by email (all and human-only)
      const uniqueOpensAll = new Set<string>();
      const uniqueOpensHuman = new Set<string>();
      const uniqueClicks = new Set<string>();

      data.forEach((event: { event_type: string; email: string; is_bot: boolean | null }) => {
        if (event.event_type === 'sent') stats.sent++;
        else if (event.event_type === 'delivered') stats.delivered++;
        else if (event.event_type === 'opened') {
          uniqueOpensAll.add(event.email);
          if (!event.is_bot) {
            uniqueOpensHuman.add(event.email);
          }
        }
        else if (event.event_type === 'clicked') uniqueClicks.add(event.email);
        else if (event.event_type === 'bounced') stats.bounced++;
        else if (event.event_type === 'unsubscribed') stats.unsubscribed++;
      });

      stats.opened = uniqueOpensAll.size;
      stats.openedHuman = uniqueOpensHuman.size;
      stats.clicked = uniqueClicks.size;

      return stats;
    },
    enabled: !!campaignId,
  });
}
