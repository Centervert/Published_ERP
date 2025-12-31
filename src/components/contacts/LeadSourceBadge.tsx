import { Globe, Pencil, Handshake, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type LeadSource = 'website_landing_page' | 'manual_entry' | 'marketing_partner' | 'import';

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'website_landing_page', label: 'Website/Landing Page' },
  { value: 'manual_entry', label: 'Manual Entry' },
  { value: 'marketing_partner', label: 'Marketing Partner' },
  { value: 'import', label: 'Import' },
];

export const getLeadSourceConfig = (source: LeadSource | null | undefined) => {
  switch (source) {
    case 'website_landing_page':
      return {
        label: 'Website/Landing Page',
        icon: Globe,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      };
    case 'manual_entry':
      return {
        label: 'Manual Entry',
        icon: Pencil,
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      };
    case 'marketing_partner':
      return {
        label: 'Marketing Partner',
        icon: Handshake,
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      };
    case 'import':
      return {
        label: 'Import',
        icon: Upload,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      };
    default:
      return {
        label: 'Unknown',
        icon: Pencil,
        className: 'bg-muted text-muted-foreground',
      };
  }
};

interface LeadSourceBadgeProps {
  source: LeadSource | null | undefined;
  detail?: string | null;
  showDetail?: boolean;
  size?: 'sm' | 'md';
}

export function LeadSourceBadge({ source, detail, showDetail = false, size = 'md' }: LeadSourceBadgeProps) {
  const config = getLeadSourceConfig(source);
  const Icon = config.icon;
  
  if (!source) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <Badge 
        variant="secondary" 
        className={`${config.className} ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} font-medium border-0`}
      >
        <Icon className={`${size === 'sm' ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'}`} />
        {config.label}
      </Badge>
      {showDetail && detail && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
          {detail}
        </span>
      )}
    </div>
  );
}
