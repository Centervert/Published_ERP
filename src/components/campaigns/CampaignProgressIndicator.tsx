import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface CampaignProgressIndicatorProps {
  campaignId: string;
  status: string;
}

export function CampaignProgressIndicator({ campaignId, status }: CampaignProgressIndicatorProps) {
  const { data: progress, isLoading } = useCampaignProgress(
    campaignId, 
    status === "sending"
  );

  // Only show for sending campaigns
  if (status !== "sending") return null;

  if (isLoading || !progress) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading progress...</span>
      </div>
    );
  }

  const { sentCount, totalRecipients, pendingCount, failedCount, estimatedCompletionTime, progressPercent } = progress;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-muted-foreground">
            Sending: {sentCount.toLocaleString()} / {totalRecipients.toLocaleString()}
          </span>
        </div>
        <span className="font-medium">{progressPercent}%</span>
      </div>
      
      <Progress value={progressPercent} className="h-2" />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {pendingCount.toLocaleString()} queued
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {failedCount.toLocaleString()} failed
            </span>
          )}
        </div>
        
        {estimatedCompletionTime && pendingCount > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Est. complete {formatDistanceToNow(estimatedCompletionTime, { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}
