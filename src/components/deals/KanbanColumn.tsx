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
  onActionClick 
}: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + (d.total_value || 0), 0);

  return (
    <div
      className="flex-shrink-0 w-56 sm:w-64 lg:w-72 flex flex-col min-w-0"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      {/* Column Header - White card with top border accent */}
      <div className={`bg-white border border-gray-200 rounded-t-md border-t-[3px] ${STAGE_BORDER_COLORS[stage]} px-3 py-2`}>
        <div className="font-semibold text-gray-900 text-sm truncate">{DEAL_STAGE_LABELS[stage]}</div>
        <div className="text-[10px] text-gray-400 mt-0.5 truncate">
          {deals.length} {deals.length === 1 ? 'Deal' : 'Deals'} | {formatValue(totalValue)}
        </div>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 bg-transparent">
        <div className="space-y-2 pt-2 pb-3">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              imprintName={deal.contact?.imprint_id ? imprintMap[deal.contact.imprint_id] : undefined}
              communicationCounts={deal.contact_id ? communicationCountsMap[deal.contact_id] : undefined}
              onDragStart={onDragStart}
              onClick={() => onDealClick(deal)}
              onActionClick={onActionClick}
            />
          ))}
          {deals.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-400">
              No deals
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
