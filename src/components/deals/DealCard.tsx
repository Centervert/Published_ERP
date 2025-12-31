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
      className="cursor-pointer hover:shadow-md transition-shadow bg-white border border-gray-200 shadow-sm"
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Section A: Header - Name + Avatar */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">{contactName}</span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(deal.contact?.first_name || null, deal.contact?.last_name || null)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Section B: Details */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Opportunity Source</span>
            <span className="text-gray-700">{imprintName || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Opportunity Value</span>
            <span className="text-gray-700">{formatCurrency(deal.total_value)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Outreach Attempt</span>
            <span className="text-gray-700">{deal.outreach_count}</span>
          </div>
        </div>

        {/* Section C: Action Footer */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <button 
            onClick={(e) => handleActionClick(e, 'phone')}
            className="relative text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Phone className="h-4 w-4" />
            {communicationCounts && communicationCounts.calls > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {communicationCounts.calls > 9 ? '9+' : communicationCounts.calls}
              </span>
            )}
          </button>
          <button 
            onClick={(e) => handleActionClick(e, 'sms')}
            className="relative text-gray-500 hover:text-gray-700 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {communicationCounts && communicationCounts.sms > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {communicationCounts.sms > 9 ? '9+' : communicationCounts.sms}
              </span>
            )}
          </button>
          <button 
            onClick={(e) => handleActionClick(e, 'email')}
            className="relative text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            {communicationCounts && communicationCounts.emails > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {communicationCounts.emails > 9 ? '9+' : communicationCounts.emails}
              </span>
            )}
          </button>
          <button 
            onClick={(e) => handleActionClick(e, 'calendar')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <CalendarCheck className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
