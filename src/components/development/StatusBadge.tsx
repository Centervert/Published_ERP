import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType = 'proposed' | 'accepted' | 'deprecated' | 'open' | 'mitigating' | 'closed' | 'on_track' | 'at_risk' | 'blocked' | string;

interface StatusBadgeProps {
  status: StatusType | null;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  proposed: { label: 'Proposed', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  accepted: { label: 'Accepted', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  deprecated: { label: 'Deprecated', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  open: { label: 'Open', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  mitigating: { label: 'Mitigating', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  closed: { label: 'Closed', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  on_track: { label: 'On Track', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  at_risk: { label: 'At Risk', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  blocked: { label: 'Blocked', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  
  const config = statusConfig[status.toLowerCase()] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
