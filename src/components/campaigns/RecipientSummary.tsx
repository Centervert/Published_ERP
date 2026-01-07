import { Info, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { EmailQualityFilter, RecipientHealthCounts } from '@/hooks/useRecipientHealthCounts';

interface RecipientSummaryProps {
  sendable: number;
  excluded: number;
  notValidated: number;
  exclusionReasons: RecipientHealthCounts['exclusionReasons'];
  qualityFilter: EmailQualityFilter;
}

export function RecipientSummary({
  sendable,
  excluded,
  notValidated,
  exclusionReasons,
  qualityFilter,
}: RecipientSummaryProps) {
  // Calculate effective sendable based on filter
  const effectiveSendable = qualityFilter === 'validated_only' 
    ? sendable 
    : sendable + notValidated;
  
  const effectiveExcluded = qualityFilter === 'validated_only'
    ? excluded + notValidated
    : excluded;

  const hasWarning = qualityFilter !== 'validated_only' && notValidated > 0;
  const lowSendable = effectiveSendable < 10 && effectiveSendable > 0;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Audience Summary</span>
        {hasWarning && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Includes unvalidated
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        {/* Sendable count */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <span className="text-2xl font-bold text-green-600">
              {effectiveSendable.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground ml-1">sendable</span>
          </div>
        </div>
        
        {/* Excluded count with popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <span className="text-2xl font-bold text-red-500">
                    {effectiveExcluded.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">excluded</span>
                </div>
                <Info className="h-4 w-4 text-muted-foreground ml-1" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Exclusion Breakdown</h4>
              <div className="space-y-1.5 text-sm">
                {qualityFilter === 'validated_only' && notValidated > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Not validated</span>
                    <span className="font-medium">{notValidated.toLocaleString()}</span>
                  </div>
                )}
                {exclusionReasons.noEmail > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No email</span>
                    <span className="font-medium">{exclusionReasons.noEmail.toLocaleString()}</span>
                  </div>
                )}
                {exclusionReasons.bounced > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bounced</span>
                    <span className="font-medium">{exclusionReasons.bounced.toLocaleString()}</span>
                  </div>
                )}
                {exclusionReasons.unsubscribed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unsubscribed</span>
                    <span className="font-medium">{exclusionReasons.unsubscribed.toLocaleString()}</span>
                  </div>
                )}
                {exclusionReasons.complained > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complained</span>
                    <span className="font-medium">{exclusionReasons.complained.toLocaleString()}</span>
                  </div>
                )}
                {exclusionReasons.undeliverable > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Undeliverable</span>
                    <span className="font-medium">{exclusionReasons.undeliverable.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Warnings */}
      {lowSendable && (
        <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Low sendable count. Consider validating more contacts before sending.
          </p>
        </div>
      )}
    </div>
  );
}
