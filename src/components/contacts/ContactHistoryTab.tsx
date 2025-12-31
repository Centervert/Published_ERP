import { useContactHistory, formatFieldLabel } from '@/hooks/useContactHistory';
import { 
  UserPlus, 
  Edit, 
  ArrowRight,
  Clock,
  Loader2,
  UserCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Tag,
  Shield,
  Bot,
  Upload,
  Users,
  Globe,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ContactHistoryTabProps {
  contactId: string;
}

const getFieldIcon = (field: string) => {
  switch (field) {
    case 'first_name':
    case 'last_name':
      return UserCheck;
    case 'email':
      return Mail;
    case 'phone':
      return Phone;
    case 'address':
      return MapPin;
    case 'timezone':
      return Globe;
    case 'contact_type':
      return Tag;
    case 'status':
      return Shield;
    case 'assigned_asc':
    case 'assigned_ae':
    case 'staff_asc_id':
    case 'staff_ae_id':
      return Users;
    case 'imprint_id':
      return Building;
    default:
      return Edit;
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'contact_created':
      return UserPlus;
    case 'assignment_changed':
    case 'staff_assignment_changed':
      return Users;
    case 'imprint_changed':
      return Building;
    default:
      return Edit;
  }
};

const getSourceBadge = (source: string) => {
  switch (source) {
    case 'webhook':
      return { label: 'System', icon: Bot, variant: 'secondary' as const };
    case 'import':
      return { label: 'Import', icon: Upload, variant: 'outline' as const };
    case 'bulk':
      return { label: 'Bulk', icon: Users, variant: 'outline' as const };
    default:
      return null;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'contact_created':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'assignment_changed':
    case 'staff_assignment_changed':
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    case 'imprint_changed':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    case 'status_changed':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
  }
};

export function ContactHistoryTab({ contactId }: ContactHistoryTabProps) {
  const { history, isLoading } = useContactHistory(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No property changes recorded</p>
        <p className="text-xs text-muted-foreground mt-1">Changes to contact fields will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => {
        const Icon = getActivityIcon(item.activity_type);
        const colorClass = getActivityColor(item.activity_type);
        const date = parseISO(item.created_at);
        const sourceBadge = getSourceBadge(item.source_type);
        
        return (
          <div 
            key={item.id} 
            className="flex items-start gap-3 pt-2 pb-3 first:pt-0 border-b last:border-b-0"
          >
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {item.description}
                </p>
                {sourceBadge && (
                  <Badge variant={sourceBadge.variant} className="text-xs gap-1">
                    <sourceBadge.icon className="h-3 w-3" />
                    {sourceBadge.label}
                  </Badge>
                )}
              </div>
              
              {/* Render field changes */}
              {item.metadata?.changes && (
                <div className="mt-2 space-y-1">
                  {Object.entries(item.metadata.changes).map(([field, change]: [string, any]) => {
                    const FieldIcon = getFieldIcon(field);
                    // Use friendly names if available (for IDs like imprint_id, staff_asc_id)
                    const fromValue = change.fromName || change.from || '(empty)';
                    const toValue = change.toName || change.to || '(empty)';
                    
                    return (
                      <div key={field} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                        <FieldIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground">{formatFieldLabel(field)}:</span>
                        <span className="text-muted-foreground line-through truncate max-w-[120px]" title={fromValue}>
                          {fromValue}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground truncate max-w-[120px]" title={toValue}>
                          {toValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Assignment changes (legacy format) */}
              {item.activity_type === 'assignment_changed' && item.metadata?.fromName !== undefined && (
                <div className="mt-2 text-xs flex items-center gap-1.5 text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="line-through">{item.metadata.fromName || '(unassigned)'}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-foreground">{item.metadata.toName || '(unassigned)'}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}</span>
                {item.created_by_name && (
                  <>
                    <span>•</span>
                    <span>by {item.created_by_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
