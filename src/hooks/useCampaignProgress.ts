import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignProgress {
  campaignId: string;
  totalRecipients: number;
  sentCount: number;
  pendingCount: number;
  failedCount: number;
  estimatedCompletionTime: Date | null;
  progressPercent: number;
  isComplete: boolean;
}

export function useCampaignProgress(campaignId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["campaign-progress", campaignId],
    queryFn: async (): Promise<CampaignProgress | null> => {
      if (!campaignId) return null;

      // Get campaign total recipients
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("total_recipients, status")
        .eq("id", campaignId)
        .single();

      if (campaignError || !campaign) return null;

      // Get queue stats for this campaign
      const { data: queueStats, error: queueError } = await supabase
        .from("email_queue")
        .select("status, scheduled_for")
        .eq("campaign_id", campaignId);

      if (queueError || !queueStats) return null;

      const sentCount = queueStats.filter(e => e.status === "sent").length;
      const pendingCount = queueStats.filter(e => e.status === "pending").length;
      const failedCount = queueStats.filter(e => e.status === "failed").length;
      const totalRecipients = campaign.total_recipients || queueStats.length;

      // Find the latest scheduled_for time to estimate completion
      const pendingEmails = queueStats.filter(e => e.status === "pending" && e.scheduled_for);
      let estimatedCompletionTime: Date | null = null;
      
      if (pendingEmails.length > 0) {
        const latestScheduled = pendingEmails.reduce((latest, email) => {
          const scheduledTime = new Date(email.scheduled_for!).getTime();
          return scheduledTime > latest ? scheduledTime : latest;
        }, 0);
        // Add a buffer for processing time (about 2 minutes after last scheduled)
        estimatedCompletionTime = new Date(latestScheduled + 2 * 60 * 1000);
      }

      const progressPercent = totalRecipients > 0 
        ? Math.round((sentCount / totalRecipients) * 100) 
        : 0;

      const isComplete = pendingCount === 0 && campaign.status !== "sending";

      return {
        campaignId,
        totalRecipients,
        sentCount,
        pendingCount,
        failedCount,
        estimatedCompletionTime,
        progressPercent,
        isComplete,
      };
    },
    enabled: enabled && !!campaignId,
    refetchInterval: enabled ? 5000 : false, // Refetch every 5 seconds when enabled
  });
}
