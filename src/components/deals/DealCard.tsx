import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, MessageSquare, Mail, CalendarCheck } from 'lucide-react';
import { Deal } from '@/hooks/useDeals';
import { CommunicationCounts } from '@/hooks/useDealCommunicationCounts';

interface DealCardProps {
  deal: Deal;
  imprintName?: string;
  communicationCounts?: CommunicationCounts;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick: () => void;
  onActionClick?: (action: 'phone' | 'sms' | 'email' | 'calendar', deal: Deal) => void;
}

function formatCurrency(value: number | null): string {
  if (!value) return '$0.00';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '??';
}

export function DealCard({ 
  deal, 
  imprintName,
  communicationCounts,
  onDragStart,
  onDragEnd,
  onClick,
  onActionClick 
}: DealCardProps) {
  const contactName = deal.contact 
    ? `${deal.contact.first_name || ''} ${deal.contact.last_name || ''}`.trim() || 'Unknown'
    : 'Unknown';

  const handleActionClick = (e: React.MouseEvent, action: 'phone' | 'sms' | 'email' | 'calendar') => {
    e.stopPropagation();
    onActionClick?.(action, deal);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white border border-gray-200 shadow-sm hover:border-gray-300"
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Section A: Header - Name + Avatar */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-gray-900 text-sm leading-tight flex-1 min-w-0 truncate">{contactName}</span>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(deal.contact?.first_name || null, deal.contact?.last_name || null)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Section B: Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 text-xs">Opportunity Source</span>
            <span className="text-gray-900 font-medium text-xs truncate ml-2 max-w-[120px]">{imprintName || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 text-xs">Opportunity Value</span>
            <span className="text-gray-900 font-medium text-xs">{formatCurrency(deal.total_value)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 text-xs">Outreach Attempt</span>
            <span className="text-gray-900 font-medium text-xs">{deal.outreach_count}</span>
          </div>
        </div>

        {/* Section C: Action Footer */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-gray-100">
          <button 
            onClick={(e) => handleActionClick(e, 'phone')}
            className="relative text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
            aria-label="Call"
          >
            <Phone className="h-4 w-4" />
            {communicationCounts && communicationCounts.calls > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 text-white text-[10px] font-medium rounded-full flex items-center justify-center min-w-[16px] px-0.5">
                {communicationCounts.calls > 9 ? '9+' : communicationCounts.calls}
              </span>
            )}
          </button>
          <button 
            onClick={(e) => handleActionClick(e, 'sms')}
            className="relative text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
            aria-label="Message"
          >
            <MessageSquare className="h-4 w-4" />
            {communicationCounts && communicationCounts.sms > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 text-white text-[10px] font-medium rounded-full flex items-center justify-center min-w-[16px] px-0.5">
                {communicationCounts.sms > 9 ? '9+' : communicationCounts.sms}
              </span>
            )}
          </button>
          <button 
            onClick={(e) => handleActionClick(e, 'email')}
            className="relative text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
            aria-label="Email"
          >
            <Mail className="h-4 w-4" />
            {communicationCounts && communicationCounts.emails > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 text-white text-[10px] font-medium rounded-full flex items-center justify-center min-w-[16px] px-0.5">
                {communicationCounts.emails > 9 ? '9+' : communicationCounts.emails}
              </span>
            )}
          </button>
          <button 
            onClick={(e) => handleActionClick(e, 'calendar')}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
            aria-label="Calendar"
          >
            <CalendarCheck className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
