import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { EmailBlock } from '@/types/email-blocks';
import type { Json } from '@/integrations/supabase/types';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  template_id: string | null;
  html_content: string;
  blocks_json: EmailBlock[] | null;
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
      return data as unknown as Campaign[];
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
      blocks_json?: EmailBlock[];
      template_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          blocks_json: campaign.blocks_json as unknown as Json,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as Campaign;
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
    mutationFn: async ({ id, blocks_json, ...updates }: Partial<Campaign> & { id: string }) => {
      const updateData = {
        ...updates,
        ...(blocks_json !== undefined && { blocks_json: blocks_json as unknown as Json }),
      };
      
      const { data, error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as Campaign;
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
    mutationFn: async ({ campaignId, listIds, imprintIds, additionalRecipients, routeRepliesToAsc }: { 
      campaignId: string; 
      listIds: string[]; 
      imprintIds?: string[];
      additionalRecipients?: string[];
      routeRepliesToAsc?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId, listIds, imprintIds, additionalRecipients, routeRepliesToAsc },
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

  const scheduleCampaign = useMutation({
    mutationFn: async ({ 
      campaignId, 
      listIds, 
      imprintIds,
      additionalRecipients,
      scheduledAt 
    }: { 
      campaignId: string; 
      listIds: string[]; 
      imprintIds?: string[];
      additionalRecipients?: string[];
      scheduledAt: Date;
    }) => {
      // First, save the selected lists to campaign_lists junction table
      // Delete existing entries first
      await supabase
        .from('campaign_lists')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new list associations
      if (listIds.length > 0) {
        const listEntries = listIds.map(listId => ({
          campaign_id: campaignId,
          list_id: listId,
        }));
        const { error: listError } = await supabase
          .from('campaign_lists')
          .insert(listEntries);
        if (listError) throw listError;
      }

      // Update campaign status to scheduled with all settings
      const { data, error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
          scheduled_imprint_ids: imprintIds || null,
          scheduled_additional_recipients: additionalRecipients || null,
        })
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign scheduled!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error scheduling campaign', description: error.message, variant: 'destructive' });
    },
  });

  const cancelScheduledCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      // Reset campaign status to draft and clear scheduled time
      const { data, error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'draft',
          scheduled_at: null,
          scheduled_imprint_ids: null,
          scheduled_additional_recipients: null,
        })
        .eq('id', campaignId)
        .eq('status', 'scheduled') // Only cancel if still scheduled
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign unscheduled', description: 'Campaign has been returned to draft status.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error canceling campaign', description: error.message, variant: 'destructive' });
    },
  });

  return {
    campaigns: campaignsQuery.data || [],
    isLoading: campaignsQuery.isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    scheduleCampaign,
    cancelScheduledCampaign,
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

export interface AggregateStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  avgOpenRate: number;
  avgClickRate: number;
  campaignCount: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    sent_at: string;
    total_recipients: number;
    openRate: number;
    clickRate: number;
  }>;
}

export function useAggregateStats() {
  return useQuery({
    queryKey: ['aggregate-campaign-stats'],
    queryFn: async () => {
      // Get all sent campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, sent_at, total_recipients')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (campaignsError) throw campaignsError;

      // Get all events for these campaigns
      const campaignIds = campaigns?.map(c => c.id) || [];
      
      if (campaignIds.length === 0) {
        return {
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalBounced: 0,
          totalUnsubscribed: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
          campaignCount: 0,
          recentCampaigns: [],
        } as AggregateStats;
      }

      const { data: events, error: eventsError } = await supabase
        .from('email_events')
        .select('campaign_id, event_type, email, is_bot')
        .in('campaign_id', campaignIds);

      if (eventsError) throw eventsError;

      // Calculate stats per campaign
      const campaignStats = new Map<string, { sent: number; opened: Set<string>; clicked: Set<string>; bounced: number; unsubscribed: number }>();
      
      campaignIds.forEach(id => {
        campaignStats.set(id, { sent: 0, opened: new Set(), clicked: new Set(), bounced: 0, unsubscribed: 0 });
      });

      events?.forEach(event => {
        const stats = campaignStats.get(event.campaign_id);
        if (!stats) return;
        
        switch (event.event_type) {
          case 'sent': stats.sent++; break;
          case 'opened': if (!event.is_bot) stats.opened.add(event.email); break;
          case 'clicked': stats.clicked.add(event.email); break;
          case 'bounced': stats.bounced++; break;
          case 'unsubscribed': stats.unsubscribed++; break;
        }
      });

      // Calculate aggregates
      let totalSent = 0, totalOpened = 0, totalClicked = 0, totalBounced = 0, totalUnsubscribed = 0;
      const recentCampaigns: AggregateStats['recentCampaigns'] = [];

      campaigns?.forEach(campaign => {
        const stats = campaignStats.get(campaign.id);
        if (!stats) return;
        
        const sent = stats.sent || campaign.total_recipients;
        const opened = stats.opened.size;
        const clicked = stats.clicked.size;
        
        totalSent += sent;
        totalOpened += opened;
        totalClicked += clicked;
        totalBounced += stats.bounced;
        totalUnsubscribed += stats.unsubscribed;

        recentCampaigns.push({
          id: campaign.id,
          name: campaign.name,
          sent_at: campaign.sent_at,
          total_recipients: campaign.total_recipients,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
        });
      });

      return {
        totalSent,
        totalOpened,
        totalClicked,
        totalBounced,
        totalUnsubscribed,
        avgOpenRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        avgClickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        campaignCount: campaigns?.length || 0,
        recentCampaigns,
      } as AggregateStats;
    },
  });
}
