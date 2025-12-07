import { useContactActivity } from '@/hooks/useContacts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, 
  Edit, 
  Mail, 
  MousePointer, 
  Eye, 
  Link as LinkIcon,
  FileText,
  Send,
  Clock,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ContactActivityFeedProps {
  contactId: string;
  assignedAsc?: string | null;
  assignedAe?: string | null;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  metadata?: any;
  created_at: string;
  created_by?: string | null;
  source: 'crm' | 'marketing';
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'contact_created':
      return UserPlus;
    case 'contact_updated':
      return Edit;
    case 'note_added':
    case 'note_updated':
      return FileText;
    case 'link_added':
    case 'link_removed':
      return LinkIcon;
    case 'sent':
      return Send;
    case 'delivered':
      return Mail;
    case 'opened':
      return Eye;
    case 'clicked':
      return MousePointer;
    default:
      return Clock;
  }
};

const getActivityColor = (type: string, source: string) => {
  if (source === 'marketing') {
    return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
  }
  switch (type) {
    case 'contact_created':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'contact_updated':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'note_added':
    case 'note_updated':
      return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    case 'link_added':
    case 'link_removed':
      return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

const formatFieldName = (field: string) => {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const renderFieldChanges = (metadata: any) => {
  if (!metadata) return null;
  
  // Handle old/new value changes
  if (metadata.changes && typeof metadata.changes === 'object') {
    return (
      <div className="mt-2 space-y-1">
        {Object.entries(metadata.changes).map(([field, change]: [string, any]) => (
          <div key={field} className="text-xs flex items-center gap-1.5 text-muted-foreground">
            <span className="font-medium text-foreground">{formatFieldName(field)}:</span>
            <span className="text-muted-foreground line-through">{change.from || '(empty)'}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-foreground">{change.to || '(empty)'}</span>
          </div>
        ))}
      </div>
    );
  }
  
  // Handle simple field list (older format)
  if (metadata.fields && Array.isArray(metadata.fields)) {
    return (
      <div className="mt-1 text-xs text-muted-foreground">
        Updated: {metadata.fields.map(formatFieldName).join(', ')}
      </div>
    );
  }
  
  return null;
};

export function ContactActivityFeed({ contactId, assignedAsc, assignedAe }: ContactActivityFeedProps) {
  const { activities, isLoading } = useContactActivity(contactId);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <Tabs defaultValue="overview" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="h-auto p-0 bg-transparent border-b-0 gap-6">
              <TabsTrigger 
                value="overview" 
                className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="px-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Activities
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Assigned ASC */}
              <div className="border rounded-lg p-3">
                <div className="flex flex-wrap items-baseline gap-x-1.5 mb-1">
                  <span className="text-sm font-medium text-foreground">Assigned ASC</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">(Author Success Coach)</span>
                </div>
                <p className="text-sm">
                  {assignedAsc ? assignedAsc : <span className="text-muted-foreground">Not assigned</span>}
                </p>
              </div>

              {/* Assigned AE */}
              <div className="border rounded-lg p-3">
                <div className="flex flex-wrap items-baseline gap-x-1.5 mb-1">
                  <span className="text-sm font-medium text-foreground">Assigned AE</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">(Account Executive)</span>
                </div>
                <p className="text-sm">
                  {assignedAe ? assignedAe : <span className="text-muted-foreground">Not assigned</span>}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="mt-0 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity: ActivityItem) => {
                  const Icon = getActivityIcon(activity.type);
                  const colorClass = getActivityColor(activity.type, activity.source);
                  const date = parseISO(activity.created_at);
                  
                  return (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-3 py-3 border-b last:border-b-0"
                    >
                      <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          {activity.description}
                        </p>
                        {renderFieldChanges(activity.metadata)}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{format(date, 'MMM d, yyyy')} at {format(date, 'h:mm a')}</span>
                          {activity.source === 'marketing' && (
                            <>
                              <span>•</span>
                              <span className="text-purple-600">Marketing</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
