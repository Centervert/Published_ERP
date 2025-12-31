import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';
import DOMPurify from 'dompurify';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownLeft,
  Loader2,
  Clock
} from 'lucide-react';
import { ContactCommunication } from '@/hooks/useContactCommunications';

interface CommunicationTimelineProps {
  communications: ContactCommunication[];
  isLoading: boolean;
  contactEmail: string;
  contactName: string;
  userEmail?: string;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getOutcomeLabel = (outcome: string | null) => {
  switch (outcome) {
    case 'answered': return 'Answered';
    case 'voicemail': return 'Voicemail';
    case 'no_answer': return 'No Answer';
    case 'busy': return 'Busy';
    case 'left_message': return 'Left Message';
    default: return null;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'email': return Mail;
    case 'call': return Phone;
    case 'sms': return MessageSquare;
    default: return Mail;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'email': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'call': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'sms': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    default: return 'text-muted-foreground bg-muted';
  }
};

const formatDateHeader = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export function CommunicationTimeline({ communications, isLoading, contactEmail, contactName, userEmail }: CommunicationTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-sm font-medium mb-1">No communications yet</h3>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          Log a call, send an email, or compose an SMS to start tracking your communication history.
        </p>
      </div>
    );
  }

  // Group communications by date
  const groupedComms: { date: Date; items: ContactCommunication[] }[] = [];
  
  communications.forEach((comm) => {
    const commDate = parseISO(comm.created_at);
    const existingGroup = groupedComms.find((g) => isSameDay(g.date, commDate));
    
    if (existingGroup) {
      existingGroup.items.push(comm);
    } else {
      groupedComms.push({ date: commDate, items: [comm] });
    }
  });

  return (
    <div className="space-y-6">
      {groupedComms.map((group) => (
        <div key={group.date.toISOString()}>
          {/* Date Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {formatDateHeader(group.date)}
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Communications for this date */}
          <div className="space-y-3">
            {group.items.map((comm) => {
              const Icon = getTypeIcon(comm.type);
              const colorClass = getTypeColor(comm.type);
              const DirectionIcon = comm.direction === 'outbound' ? ArrowUpRight : ArrowDownLeft;
              const time = format(parseISO(comm.created_at), 'h:mm a');

              return (
                <div 
                  key={comm.id}
                  className="flex flex-col overflow-hidden"
                >
                  {/* Header with From/To */}
                  <div className="flex items-start gap-3 py-3">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${colorClass} relative`}>
                      <span className="text-xs font-semibold">
                        {comm.direction === 'outbound' 
                          ? (userEmail?.slice(0, 2).toUpperCase() || 'ME')
                          : (contactName?.slice(0, 2).toUpperCase() || contactEmail?.slice(0, 2).toUpperCase() || '??')
                        }
                      </span>
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background flex items-center justify-center">
                        <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                      </div>
                    </div>

                    {/* From/To Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {comm.direction === 'outbound' ? (userEmail || 'You') : contactEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">To:</span>{' '}
                        {comm.direction === 'outbound' 
                          ? `${contactName} <${contactEmail}>`
                          : userEmail || 'You'
                        }
                      </p>
                      {/* Subject for emails */}
                      {comm.subject && comm.type === 'email' && (
                        <p className="text-sm font-medium mt-1.5">{comm.subject}</p>
                      )}
                      {comm.type === 'call' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getOutcomeLabel(comm.outcome)}
                          {comm.duration_seconds && ` • ${formatDuration(comm.duration_seconds)}`}
                        </p>
                      )}
                    </div>

                    {/* Date/Time */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(comm.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {time}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  {comm.body && (
                    <div className="py-3 pl-13">
                      {comm.type === 'email' ? (
                        <div 
                          className="text-sm text-foreground prose prose-sm max-w-none [&>*]:m-0 [&>p]:mb-2 [&>ul]:my-2 [&>ol]:my-2"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(comm.body, {
                              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'span', 'div', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                              ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
                            })
                          }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {comm.body}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes for calls */}
                  {comm.notes && (
                    <div className="pb-3 pl-13">
                      <p className="text-sm text-muted-foreground italic">
                        "{comm.notes}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
