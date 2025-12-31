import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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

    await updateDeal.mutateAsync({
      dealId: draggedDeal.id,
      updates: {
        stage: newStage,
        ...(newStage === 'won' || newStage === 'lost' || newStage === 'not_interested'
          ? { closed_at: new Date().toISOString() }
          : {}),
      },
    });
    
    setDraggedDeal(null);
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and filters */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Opportunities</h1>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>By Stage</DropdownMenuItem>
                <DropdownMenuItem>By Owner</DropdownMenuItem>
                <DropdownMenuItem>By Value</DropdownMenuItem>
                <DropdownMenuItem>By Date</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SortAsc className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Date Created</DropdownMenuItem>
                <DropdownMenuItem>Value (High to Low)</DropdownMenuItem>
                <DropdownMenuItem>Value (Low to High)</DropdownMenuItem>
                <DropdownMenuItem>Name A-Z</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as 'all' | 'mine')}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deals</SelectItem>
                <SelectItem value="mine">My Deals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right side - Search and actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Opportunities"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 h-9 bg-white"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-200 rounded-md">
              <Button variant="ghost" size="sm" className="h-8 px-2 rounded-r-none bg-gray-100">
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 rounded-l-none">
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Opportunity
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-6">
          <ScrollArea className="h-full">
            <div className="flex gap-4 pb-4 min-w-max">
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
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
