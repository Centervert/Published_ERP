import { useContactActivity } from '@/hooks/useContacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Loader2
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface ActivityLogPanelProps {
  contactId: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  metadata?: unknown;
  created_at: string;
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
    return 'text-purple-500 bg-purple-50 dark:bg-purple-950';
  }
  switch (type) {
    case 'contact_created':
      return 'text-green-500 bg-green-50 dark:bg-green-950';
    case 'contact_updated':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950';
    case 'note_added':
    case 'note_updated':
      return 'text-amber-500 bg-amber-50 dark:bg-amber-950';
    case 'link_added':
    case 'link_removed':
      return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

const formatActivityDate = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy \'at\' h:mm a');
};

const groupActivitiesByDate = (activities: ActivityItem[]) => {
  const groups: Record<string, ActivityItem[]> = {};
  
  activities.forEach(activity => {
    const date = parseISO(activity.created_at);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMMM d, yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
  });
  
  return groups;
};

export function ActivityLogPanel({ contactId }: ActivityLogPanelProps) {
  const { activities, isLoading } = useContactActivity(contactId);

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="px-4 pb-4">
              {Object.entries(groupedActivities).map(([dateLabel, items]) => (
                <div key={dateLabel} className="mb-4">
                  <div className="sticky top-0 bg-card py-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {dateLabel}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      const colorClass = getActivityColor(activity.type, activity.source);
                      
                      return (
                        <div key={activity.id} className="flex gap-3">
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              {activity.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(parseISO(activity.created_at), 'h:mm a')}
                              {activity.source === 'marketing' && (
                                <span className="ml-2 text-purple-500">• Marketing</span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
