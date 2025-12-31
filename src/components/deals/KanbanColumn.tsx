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

function formatCurrency(value: number | null): string {
  if (!value) return '$0.00';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
      className="flex-shrink-0 w-80 flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      {/* Column Header - White card with top border accent */}
      <div className={`bg-white border border-gray-200 rounded-t-md border-t-[3px] ${STAGE_BORDER_COLORS[stage]} px-4 py-3`}>
        <div className="font-semibold text-gray-900">{DEAL_STAGE_LABELS[stage]}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {deals.length} Opportunities | {formatCurrency(totalValue)}
        </div>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 bg-transparent">
        <div className="space-y-3 pt-3 pb-4">
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
            <div className="text-center py-8 text-sm text-gray-400">
              No opportunities
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
