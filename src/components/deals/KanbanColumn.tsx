import { ScrollArea } from '@/components/ui/scroll-area';
import { Deal, DealStage, DEAL_STAGE_LABELS } from '@/hooks/useDeals';
import { CommunicationCounts } from '@/hooks/useDealCommunicationCounts';
import { DealCard } from './DealCard';

// Top border accent colors per stage
const STAGE_BORDER_COLORS: Record<DealStage, string> = {
  new: 'border-t-blue-500',
  outreach: 'border-t-purple-500',
  contacted: 'border-t-cyan-500',
  qualified: 'border-t-amber-500',
  nurturing: 'border-t-orange-500',
  proposal_sent: 'border-t-emerald-500',
  won: 'border-t-green-500',
  lost: 'border-t-red-500',
  not_interested: 'border-t-gray-500',
};

interface KanbanColumnProps {
  stage: DealStage;
  deals: Deal[];
  imprintMap: Record<string, string>;
  communicationCountsMap: Record<string, CommunicationCounts>;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: DealStage) => void;
  onDealClick: (deal: Deal) => void;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onActionClick?: (action: 'phone' | 'sms' | 'email' | 'calendar', deal: Deal) => void;
}

function formatValue(value: number | null): string {
  if (!value) return '0';
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanColumn({ 
  stage, 
  deals, 
  imprintMap,
  communicationCountsMap,
  onDragOver, 
  onDrop, 
  onDealClick, 
  onDragStart,
  onDragEnd,
  onActionClick 
}: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + (d.total_value || 0), 0);

  return (
    <div
      className="flex-shrink-0 w-64 sm:w-72 lg:w-80 flex flex-col min-w-0 h-full"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      {/* Column Header - Container with subtle styling */}
      <div className={`bg-white border-t-[2px] ${STAGE_BORDER_COLORS[stage]} border-x border-gray-200 rounded-t-md px-3 py-2.5 shadow-sm`}>
        <div className="font-semibold text-gray-900 text-sm mb-0.5 truncate">{DEAL_STAGE_LABELS[stage]}</div>
        <div className="text-xs text-gray-500 truncate">
          {deals.length} {deals.length === 1 ? 'Deal' : 'Deals'} | {stage === 'proposal_sent' ? '$' : ''}{formatValue(totalValue)}
        </div>
      </div>

      {/* Cards Container - Clean, minimal background */}
      <ScrollArea className="flex-1">
        <div className="space-y-2.5 p-3 min-h-[200px]">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              imprintName={deal.contact?.imprint_id ? imprintMap[deal.contact.imprint_id] : undefined}
              communicationCounts={deal.contact_id ? communicationCountsMap[deal.contact_id] : undefined}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={() => onDealClick(deal)}
              onActionClick={onActionClick}
            />
          ))}
          {deals.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">
              <div className="text-gray-300 mb-1 font-medium">No deals</div>
              <div className="text-xs text-gray-400 mt-1">Drag deals here to move them</div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
