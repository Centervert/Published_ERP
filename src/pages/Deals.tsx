import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Loader2, Filter, SortAsc, Plus, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useDeals, 
  useUpdateDeal,
  Deal, 
  DealStage, 
} from '@/hooks/useDeals';
import { useImprints } from '@/hooks/useImprints';
import { useDealCommunicationCounts, CommunicationCounts } from '@/hooks/useDealCommunicationCounts';
import { useAuth } from '@/contexts/AuthContext';
import { KanbanColumn } from '@/components/deals/KanbanColumn';
import { AddDealDialog } from '@/components/deals/AddDealDialog';

// Kanban columns to show (excluding terminal states from main flow)
const KANBAN_STAGES: DealStage[] = [
  'new',
  'outreach',
  'contacted',
  'qualified',
  'nurturing',
  'proposal_sent',
];

export default function Deals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [addDealOpen, setAddDealOpen] = useState(false);

  const { data: deals = [], isLoading } = useDeals(
    filterMode === 'mine' && user ? { assignedAsc: user.id } : undefined
  );
  const { imprints } = useImprints();
  const updateDeal = useUpdateDeal();

  // Build imprint name map for quick lookup
  const imprintMap = useMemo(() => {
    const map: Record<string, string> = {};
    imprints.forEach(imp => {
      map[imp.id] = imp.name;
    });
    return map;
  }, [imprints]);

  // Get all contact IDs for communication counts
  const contactIds = useMemo(() => {
    return [...new Set(deals.map(d => d.contact_id).filter(Boolean))];
  }, [deals]);

  const { data: communicationCounts = {} } = useDealCommunicationCounts(contactIds);

  // Cast to the correct type
  const communicationCountsMap = communicationCounts as Record<string, CommunicationCounts>;

  // Filter and group deals by stage
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      const contactName = `${deal.contact?.first_name || ''} ${deal.contact?.last_name || ''}`.toLowerCase();
      return contactName.includes(searchLower);
    });
  }, [deals, searchQuery]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      new: [],
      outreach: [],
      contacted: [],
      qualified: [],
      nurturing: [],
      proposal_sent: [],
      won: [],
      lost: [],
      not_interested: [],
    };
    
    filteredDeals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });
    
    return grouped;
  }, [filteredDeals]);

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedDeal(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    
    if (!draggedDeal || draggedDeal.stage === newStage) {
      setDraggedDeal(null);
      return;
    }

    try {
      await updateDeal.mutateAsync({
        dealId: draggedDeal.id,
        updates: {
          stage: newStage,
          ...(newStage === 'won' || newStage === 'lost' || newStage === 'not_interested'
            ? { closed_at: new Date().toISOString() }
            : {}),
        },
      });
    } catch (error) {
      console.error('Error updating deal:', error);
    } finally {
      setDraggedDeal(null);
    }
  };

  const handleDealClick = (deal: Deal) => {
    if (deal.contact_id) {
      navigate(`/contacts/${deal.contact_id}`);
    }
  };

  const handleActionClick = (action: 'phone' | 'sms' | 'email' | 'calendar', deal: Deal) => {
    // Navigate to contact detail page - actions can be handled there
    if (deal.contact_id) {
      navigate(`/contacts/${deal.contact_id}`);
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      {/* Header Toolbar - Fixed height, never scrolls */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 shadow-sm px-4 py-3 z-10">
        <div className="flex items-center gap-4">
          {/* Left side - Title */}
          <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap flex-shrink-0">Deals</h1>

          {/* Center - Search (more prominent) */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white text-sm border-gray-300 focus:ring-2 focus:ring-primary/20"
              aria-label="Search deals"
            />
          </div>

          {/* Right side - View options + filter mode + create */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View Options Menu - Combines Filter, Sort, and View Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 px-3 hover:bg-white transition-colors">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">View</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">Filter</div>
                <DropdownMenuItem className="cursor-pointer">
                  <Filter className="h-4 w-4 mr-2" />
                  By Stage
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Filter className="h-4 w-4 mr-2" />
                  By Owner
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Filter className="h-4 w-4 mr-2" />
                  By Value
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Filter className="h-4 w-4 mr-2" />
                  By Date
                </DropdownMenuItem>
                <div className="h-px bg-gray-200 my-1" />
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">Sort</div>
                <DropdownMenuItem className="cursor-pointer">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Date Created
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Value (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Value (Low to High)
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Name A-Z
                </DropdownMenuItem>
                <div className="h-px bg-gray-200 my-1" />
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">View</div>
                <DropdownMenuItem className="cursor-pointer">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban View
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <List className="h-4 w-4 mr-2" />
                  List View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter Mode Selector */}
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as 'all' | 'mine')}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deals</SelectItem>
                <SelectItem value="mine">My Deals</SelectItem>
              </SelectContent>
            </Select>

            {/* Visual Separator */}
            <div className="h-6 w-px bg-gray-300" />

            {/* Primary Action - Add Deal */}
            <Button 
              size="sm" 
              className="gap-1.5 text-xs h-9 px-4 bg-primary hover:bg-primary/90"
              onClick={() => setAddDealOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Deal</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Add Deal Dialog */}
      <AddDealDialog open={addDealOpen} onOpenChange={setAddDealOpen} />

      {/* Kanban Board - Only this area scrolls horizontally */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-w-0">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto bg-gray-50/30">
          <div className="flex gap-4 p-4 h-full" style={{ width: 'max-content' }}>
            {KANBAN_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={dealsByStage[stage]}
                imprintMap={imprintMap}
                communicationCountsMap={communicationCountsMap}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDealClick={handleDealClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onActionClick={handleActionClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
