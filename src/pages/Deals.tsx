import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, DollarSign, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useDeals, 
  useUpdateDeal,
  Deal, 
  DealStage, 
  DEAL_STAGE_LABELS,
  DEAL_STAGES_ORDER 
} from '@/hooks/useDeals';
import { useAuth } from '@/contexts/AuthContext';

// Kanban columns to show (excluding terminal states from main flow)
const KANBAN_STAGES: DealStage[] = [
  'new',
  'outreach',
  'contacted',
  'qualified',
  'nurturing',
  'proposal_sent',
];

const STAGE_COLORS: Record<DealStage, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-200',
  outreach: 'bg-purple-500/10 text-purple-600 border-purple-200',
  contacted: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  qualified: 'bg-amber-500/10 text-amber-600 border-amber-200',
  nurturing: 'bg-orange-500/10 text-orange-600 border-orange-200',
  proposal_sent: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  won: 'bg-green-500/10 text-green-600 border-green-200',
  lost: 'bg-red-500/10 text-red-600 border-red-200',
  not_interested: 'bg-gray-500/10 text-gray-600 border-gray-200',
};

function formatCurrency(value: number | null): string {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '??';
}

interface DealCardProps {
  deal: Deal;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onClick: () => void;
}

function DealCard({ deal, onDragStart, onClick }: DealCardProps) {
  const contactName = deal.contact 
    ? `${deal.contact.first_name || ''} ${deal.contact.last_name || ''}`.trim() || 'Unknown'
    : 'Unknown';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: 'hsl(var(--primary))' }}
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(deal.contact?.first_name || null, deal.contact?.last_name || null)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{contactName}</span>
          </div>
          {deal.outreach_count > 0 && (
            <Badge variant="outline" className="text-xs">
              {deal.outreach_count}/6
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(deal.total_value)}
          </span>
          {deal.assigned_user?.full_name && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {deal.assigned_user.full_name.split(' ')[0]}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  stage: DealStage;
  deals: Deal[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: DealStage) => void;
  onDealClick: (deal: Deal) => void;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
}

function KanbanColumn({ stage, deals, onDragOver, onDrop, onDealClick, onDragStart }: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + (d.total_value || 0), 0);

  return (
    <div
      className="flex-shrink-0 w-72 bg-muted/30 rounded-lg flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STAGE_COLORS[stage]}>
              {DEAL_STAGE_LABELS[stage]}
            </Badge>
            <span className="text-sm text-muted-foreground">{deals.length}</span>
          </div>
          <span className="text-sm font-medium">{formatCurrency(totalValue)}</span>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onDragStart={onDragStart}
              onClick={() => onDealClick(deal)}
            />
          ))}
          {deals.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No deals
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function Deals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const { data: deals = [], isLoading } = useDeals(
    filterMode === 'mine' && user ? { assignedAsc: user.id } : undefined
  );
  const updateDeal = useUpdateDeal();

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

  // Summary stats
  const stats = useMemo(() => {
    const activeDeals = filteredDeals.filter(d => !['won', 'lost', 'not_interested'].includes(d.stage));
    const wonDeals = filteredDeals.filter(d => d.stage === 'won');
    
    return {
      totalActive: activeDeals.length,
      totalValue: activeDeals.reduce((sum, d) => sum + (d.total_value || 0), 0),
      wonCount: wonDeals.length,
      wonValue: wonDeals.reduce((sum, d) => sum + (d.total_value || 0), 0),
    };
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
    // Navigate to contact detail page with deal info
    if (deal.contact_id) {
      navigate(`/contacts/${deal.contact_id}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Deals Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage sales opportunities
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Deals</p>
                <p className="text-xl font-semibold">{stats.totalActive}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Won This Period</p>
                <p className="text-xl font-semibold">{formatCurrency(stats.wonValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as 'all' | 'mine')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value="mine">My Deals</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex gap-4 pb-4 min-w-max">
                {KANBAN_STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    deals={dealsByStage[stage]}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDealClick={handleDealClick}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
