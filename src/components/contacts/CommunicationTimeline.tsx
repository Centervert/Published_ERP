import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';
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

export function CommunicationTimeline({ communications, isLoading }: CommunicationTimelineProps) {
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
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <DirectionIcon className={`h-3 w-3 ${comm.direction === 'outbound' ? 'text-green-500' : 'text-blue-500'}`} />
                      <span className="text-sm font-medium capitalize">
                        {comm.type} {comm.direction === 'outbound' ? 'sent' : 'received'}
                      </span>
                      {comm.type === 'call' && (
                        <span className="text-xs text-muted-foreground">
                          {getOutcomeLabel(comm.outcome)}
                          {comm.duration_seconds && ` • ${formatDuration(comm.duration_seconds)}`}
                        </span>
                      )}
                    </div>

                    {/* Subject for emails */}
                    {comm.subject && (
                      <p className="text-sm font-medium mt-1">{comm.subject}</p>
                    )}

                    {/* Body preview */}
                    {comm.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {comm.body}
                      </p>
                    )}

                    {/* Notes for calls */}
                    {comm.notes && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        "{comm.notes}"
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {time}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
