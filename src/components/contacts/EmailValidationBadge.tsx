import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, AlertTriangle, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { getValidationStatusColor, getValidationStatusLabel } from '@/hooks/useEmailValidation';

interface EmailValidationBadgeProps {
  result: string | null;
  risk: string | null;
  reasons?: string[] | null;
  isDisposable?: boolean | null;
  isRoleAddress?: boolean | null;
  didYouMean?: string | null;
  validatedAt?: string | null;
  isValidating?: boolean;
  compact?: boolean;
  onSuggestClick?: (suggestion: string) => void;
}

export function EmailValidationBadge({
  result,
  risk,
  reasons,
  isDisposable,
  isRoleAddress,
  didYouMean,
  validatedAt,
  isValidating,
  compact = false,
  onSuggestClick
}: EmailValidationBadgeProps) {
  if (isValidating) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && 'Validating...'}
      </Badge>
    );
  }

  const statusColor = getValidationStatusColor(result, risk);
  const statusLabel = getValidationStatusLabel(result, risk);

  const getIcon = () => {
    switch (statusColor) {
      case 'green':
        return <CheckCircle className="h-3 w-3" />;
      case 'red':
        return <XCircle className="h-3 w-3" />;
      case 'orange':
        return <AlertTriangle className="h-3 w-3" />;
      case 'yellow':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <HelpCircle className="h-3 w-3" />;
    }
  };

  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (statusColor) {
      case 'green':
        return 'default';
      case 'red':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getBadgeClassName = () => {
    switch (statusColor) {
      case 'green':
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'orange':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      case 'red':
        return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const tooltipContent = (
    <div className="space-y-1 text-xs max-w-xs">
      <div className="font-medium">{statusLabel}</div>
      {reasons && reasons.length > 0 && (
        <div className="text-muted-foreground">
          Reasons: {reasons.join(', ')}
        </div>
      )}
      {isDisposable && (
        <div className="text-orange-600">⚠️ Disposable email address</div>
      )}
      {isRoleAddress && (
        <div className="text-yellow-600">📧 Role address (e.g., admin@, support@)</div>
      )}
      {didYouMean && (
        <div 
          className="text-blue-600 cursor-pointer hover:underline"
          onClick={() => onSuggestClick?.(didYouMean)}
        >
          💡 Did you mean: {didYouMean}?
        </div>
      )}
      {validatedAt && (
        <div className="text-muted-foreground">
          Validated: {new Date(validatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  if (!result) {
    if (compact) return null;
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <HelpCircle className="h-3 w-3" />
        Not validated
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`gap-1 cursor-help ${getBadgeClassName()}`}
          >
            {getIcon()}
            {!compact && statusLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
