import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { useTickets, DevItem, DevItemSeverity, DevItemStatus } from '@/hooks/useDevItems';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DevTicketsTabProps {
  documentId: string;
  isAdmin: boolean;
}

type TicketCategory = 'bug' | 'fix' | 'feature' | 'qa' | 'enhancement' | 'refactor';

const categoryColors: Record<TicketCategory, string> = {
  bug: 'bg-red-500/20 text-red-400 border-red-500/30',
  fix: 'bg-green-500/20 text-green-400 border-green-500/30',
  feature: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  qa: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  enhancement: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  refactor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const categoryLabels: Record<TicketCategory, string> = {
  bug: 'Bug',
  fix: 'Fix',
  feature: 'Feature',
  qa: 'QA',
  enhancement: 'Enhancement',
  refactor: 'Refactor',
};

export function DevTicketsTab({ documentId, isAdmin }: DevTicketsTabProps) {
  const { items: tickets, isLoading, createItem, updateItem, archiveItem } = useTickets(documentId);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<DevItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    category: 'bug' as TicketCategory,
    severity: 'medium' as DevItemSeverity,
    status: 'open' as DevItemStatus,
    body_md: '',
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.body_md?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ticket.tags?.includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      await createItem.mutateAsync({
        document_id: documentId,
        item_type: 'ticket',
        title: newTicket.title,
        body_md: newTicket.body_md,
        severity: newTicket.severity,
        status: newTicket.status,
        tags: [newTicket.category],
        is_archived: false,
        owner_name: null,
        owner_user_id: null,
        due_date: null,
        phase: null,
        related_type: null,
        related_id: null,
        priority: null,
      });
      toast.success('Ticket created');
      setIsAddingNew(false);
      setNewTicket({
        title: '',
        category: 'bug',
        severity: 'medium',
        status: 'open' as DevItemStatus,
        body_md: '',
      });
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const handleUpdateStatus = async (ticket: DevItem, newStatus: DevItemStatus) => {
    try {
      await updateItem.mutateAsync({ id: ticket.id, status: newStatus });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getCategory = (ticket: DevItem): TicketCategory => {
    const tag = ticket.tags?.find(t => Object.keys(categoryColors).includes(t));
    return (tag as TicketCategory) || 'bug';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Tickets & Changelog
          </h2>
          <p className="text-sm text-muted-foreground">
            Track bugs, fixes, features, and QA work
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddingNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Ticket
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="mitigating">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px]">Category</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading tickets...
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <TableCell className="font-medium">{ticket.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={categoryColors[getCategory(ticket)]}>
                        {categoryLabels[getCategory(ticket)]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.severity && <SeverityBadge severity={ticket.severity} />}
                    </TableCell>
                    <TableCell>
                      {ticket.status && <StatusBadge status={ticket.status} />}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Detail Sheet */}
      <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedTicket && (
            <>
              <SheetHeader>
                <div className="flex items-start gap-2 flex-wrap">
                  <Badge variant="outline" className={categoryColors[getCategory(selectedTicket)]}>
                    {categoryLabels[getCategory(selectedTicket)]}
                  </Badge>
                  {selectedTicket.severity && <SeverityBadge severity={selectedTicket.severity} />}
                </div>
                <SheetTitle className="text-left">{selectedTicket.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {isAdmin ? (
                      <Select
                        value={selectedTicket.status || 'open'}
                        onValueChange={(v) => handleUpdateStatus(selectedTicket, v as DevItemStatus)}
                      >
                        <SelectTrigger className="w-[140px] mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="mitigating">In Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      selectedTicket.status && <StatusBadge status={selectedTicket.status} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm mt-1">
                      {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                {selectedTicket.body_md && (
                  <div>
                    <p className="text-sm font-medium mb-2">Details</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
                      <MarkdownRenderer content={selectedTicket.body_md} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Ticket Sheet */}
      <Sheet open={isAddingNew} onOpenChange={setIsAddingNew}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Ticket</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newTicket.title}
                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the issue or work"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={newTicket.category}
                  onValueChange={(v) => setNewTicket(prev => ({ ...prev, category: v as TicketCategory }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={newTicket.severity}
                  onValueChange={(v) => setNewTicket(prev => ({ ...prev, severity: v as DevItemSeverity }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={newTicket.status}
                onValueChange={(v) => setNewTicket(prev => ({ ...prev, status: v as DevItemStatus }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="mitigating">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Details (Markdown)</label>
              <Textarea
                value={newTicket.body_md}
                onChange={(e) => setNewTicket(prev => ({ ...prev, body_md: e.target.value }))}
                placeholder={`## Problem\nDescribe the issue...\n\n## Root Cause\nWhat caused it...\n\n## Solution\nHow it was fixed...\n\n## Files Changed\n- file1.tsx\n- file2.ts`}
                className="mt-1 min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateTicket} disabled={createItem.isPending}>
                {createItem.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
