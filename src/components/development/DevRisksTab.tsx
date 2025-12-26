import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRisks, DevItem, DevItemStatus, DevItemSeverity } from '@/hooks/useDevItems';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Plus, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DevRisksTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

export function DevRisksTab({ documentId, isAdmin }: DevRisksTabProps) {
  const { items: risks, createItem, updateItem } = useRisks(documentId);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<DevItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: '',
    body_md: '',
    item_type: 'risk' as 'risk' | 'blocker',
    status: 'open' as DevItemStatus,
    severity: 'medium' as DevItemSeverity,
    owner_name: '',
    due_date: '',
  });

  const filteredRisks = risks.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;
    const matchesType = typeFilter === 'all' || r.item_type === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  const handleCreateRisk = async () => {
    if (!documentId || !newRisk.title) {
      toast.error('Title is required');
      return;
    }

    try {
      await createItem.mutateAsync({
        document_id: documentId,
        item_type: newRisk.item_type,
        title: newRisk.title,
        body_md: newRisk.body_md,
        status: newRisk.status,
        severity: newRisk.severity,
        owner_name: newRisk.owner_name || null,
        due_date: newRisk.due_date || null,
        owner_user_id: null,
        phase: null,
        related_type: null,
        related_id: null,
        tags: null,
        is_archived: false,
      });
      toast.success(`${newRisk.item_type === 'blocker' ? 'Blocker' : 'Risk'} created`);
      setIsAddingNew(false);
      setNewRisk({
        title: '',
        body_md: '',
        item_type: 'risk',
        status: 'open',
        severity: 'medium',
        owner_name: '',
        due_date: '',
      });
    } catch (error) {
      toast.error('Failed to create');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Risks & Blockers</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setIsAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Risk/Blocker
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="risk">Risk</SelectItem>
            <SelectItem value="blocker">Blocker</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Risks Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[90px]">Type</TableHead>
              <TableHead className="w-[90px]">Severity</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Owner</TableHead>
              <TableHead className="w-[100px]">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRisks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No risks or blockers found
                </TableCell>
              </TableRow>
            ) : (
              filteredRisks.map(risk => (
                <TableRow
                  key={risk.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedRisk(risk)}
                >
                  <TableCell className="font-medium">{risk.title}</TableCell>
                  <TableCell>
                    <Badge variant={risk.item_type === 'blocker' ? 'destructive' : 'secondary'}>
                      {risk.item_type === 'blocker' ? 'Blocker' : 'Risk'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={risk.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={risk.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {risk.owner_name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {risk.due_date ? format(new Date(risk.due_date), 'MMM d') : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Risk Detail Sheet */}
      <Sheet open={!!selectedRisk} onOpenChange={open => !open && setSelectedRisk(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedRisk?.title}
            </SheetTitle>
            <SheetDescription>
              {selectedRisk?.item_type === 'blocker' ? 'Blocker' : 'Risk'} created{' '}
              {selectedRisk && format(new Date(selectedRisk.created_at), 'MMMM d, yyyy')}
            </SheetDescription>
          </SheetHeader>

          {selectedRisk && (
            <div className="space-y-4 mt-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Severity:</span>
                  <div className="mt-1">
                    <SeverityBadge severity={selectedRisk.severity} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedRisk.status} />
                  </div>
                </div>
              </div>

              {selectedRisk.owner_name && (
                <div>
                  <span className="text-sm text-muted-foreground">Owner:</span>
                  <span className="ml-2 text-sm">{selectedRisk.owner_name}</span>
                </div>
              )}

              {selectedRisk.due_date && (
                <div>
                  <span className="text-sm text-muted-foreground">Due Date:</span>
                  <span className="ml-2 text-sm">
                    {format(new Date(selectedRisk.due_date), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}

              {selectedRisk.body_md && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Mitigation Plan</h4>
                  <MarkdownRenderer content={selectedRisk.body_md} />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Risk Sheet */}
      <Sheet open={isAddingNew} onOpenChange={setIsAddingNew}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Risk/Blocker</SheetTitle>
            <SheetDescription>
              Record a new risk or blocker for the project
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={newRisk.title}
                onChange={e => setNewRisk({ ...newRisk, title: e.target.value })}
                placeholder="Risk or blocker title"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={newRisk.item_type}
                  onValueChange={v => setNewRisk({ ...newRisk, item_type: v as 'risk' | 'blocker' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="blocker">Blocker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={newRisk.severity}
                  onValueChange={v => setNewRisk({ ...newRisk, severity: v as DevItemSeverity })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newRisk.status}
                  onValueChange={v => setNewRisk({ ...newRisk, status: v as DevItemStatus })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigating">Mitigating</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newRisk.due_date}
                  onChange={e => setNewRisk({ ...newRisk, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={newRisk.owner_name}
                onChange={e => setNewRisk({ ...newRisk, owner_name: e.target.value })}
                placeholder="Who owns this?"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Mitigation Plan (Markdown)</label>
              <Textarea
                value={newRisk.body_md}
                onChange={e => setNewRisk({ ...newRisk, body_md: e.target.value })}
                placeholder="Describe the mitigation strategy..."
                className="mt-1 min-h-[150px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateRisk}
                disabled={createItem.isPending}
              >
                {createItem.isPending ? 'Creating...' : 'Create'}
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
