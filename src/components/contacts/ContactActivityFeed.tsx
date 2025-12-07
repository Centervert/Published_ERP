import { useState } from 'react';
import { useContactActivity } from '@/hooks/useContacts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  ChevronDown,
  ChevronRight,
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
  Phone,
  Calendar
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

interface ContactActivityFeedProps {
  contactId: string;
  assignedAsc?: string | null;
  assignedBss?: string | null;
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

const groupActivitiesByDate = (activities: ActivityItem[]) => {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  const groupMap = new Map<string, ActivityItem[]>();
  
  activities.forEach(activity => {
    const date = parseISO(activity.created_at);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMMM yyyy');
    }
    
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(activity);
  });
  
  groupMap.forEach((items, label) => {
    groups.push({ label, items });
  });
  
  return groups;
};

export function ContactActivityFeed({ contactId, assignedAsc, assignedBss }: ContactActivityFeedProps) {
  const { activities, isLoading } = useContactActivity(contactId);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredActivities = activities.filter(a => 
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const groupedActivities = groupActivitiesByDate(filteredActivities);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

          <TabsContent value="overview" className="mt-0 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assigned ASC */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Assigned ASC</span>
                    <span className="text-xs text-muted-foreground">(Author Success Coach)</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {assignedAsc ? assignedAsc : <span className="text-muted-foreground">Not assigned</span>}
                  </p>
                </div>

                {/* Assigned BSS */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Assigned BSS</span>
                    <span className="text-xs text-muted-foreground">(Book Support Specialist)</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {assignedBss ? assignedBss : <span className="text-muted-foreground">Not assigned</span>}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="mt-0">
            {/* Search and Filter Bar */}
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button variant="outline" size="sm" className="text-primary">
                Collapse all
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Activity Type Tabs */}
            <div className="px-6 pb-2 flex items-center gap-4 border-b">
              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="h-auto p-0 bg-transparent border-b-0 gap-4">
                  <TabsTrigger 
                    value="activity" 
                    className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Notes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="emails" 
                    className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Emails
                  </TabsTrigger>
                  <TabsTrigger 
                    value="calls" 
                    className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Calls
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tasks" 
                    className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Tasks
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="mt-0 pt-4">
                  {/* Filter badges */}
                  <div className="px-6 pb-4 flex items-center gap-3">
                    <Badge variant="secondary" className="cursor-pointer">
                      ({activities.length}) Activity
                      <button className="ml-1 text-muted-foreground hover:text-foreground">&times;</button>
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      All time so far
                    </Button>
                  </div>

                  {/* Activity List */}
                  <div className="px-6 pb-6">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : groupedActivities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {groupedActivities.map(({ label, items }) => (
                          <div key={label}>
                            <h3 className="text-sm font-medium text-muted-foreground mb-4">{label}</h3>
                            <div className="space-y-3">
                              {items.map((activity) => {
                                const Icon = getActivityIcon(activity.type);
                                const colorClass = getActivityColor(activity.type, activity.source);
                                const isExpanded = expandedItems.has(activity.id);
                                
                                return (
                                  <div 
                                    key={activity.id} 
                                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <button 
                                        onClick={() => toggleExpanded(activity.id)}
                                        className="mt-0.5 text-muted-foreground hover:text-foreground"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </button>
                                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-sm font-medium text-foreground">
                                            {activity.description}
                                          </p>
                                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(parseISO(activity.created_at), 'MMM d, h:mm a')}
                                          </span>
                                        </div>
                                        {activity.source === 'marketing' && (
                                          <Badge variant="outline" className="mt-1 text-xs text-purple-600 border-purple-200">
                                            Marketing
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-0 pt-4">
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>Notes coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="emails" className="mt-0 pt-4">
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2" />
                    <p>Emails coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="calls" className="mt-0 pt-4">
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2" />
                    <p>Calls coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-0 pt-4">
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p>Tasks coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
