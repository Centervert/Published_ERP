import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SeverityType = 'low' | 'medium' | 'high' | 'critical' | string;

interface SeverityBadgeProps {
  severity: SeverityType | null;
  className?: string;
}

const severityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  if (!severity) return null;
  
  const config = severityConfig[severity.toLowerCase()] ?? {
    label: severity,
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
