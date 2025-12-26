import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useDecisions, DevItem, DevItemStatus } from '@/hooks/useDevItems';
import { StatusBadge } from './StatusBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Plus, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DevDecisionsTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

export function DevDecisionsTab({ documentId, isAdmin }: DevDecisionsTabProps) {
  const { items: decisions, createItem, updateItem } = useDecisions(documentId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDecision, setSelectedDecision] = useState<DevItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDecision, setNewDecision] = useState({
    title: '',
    body_md: '',
    status: 'proposed' as DevItemStatus,
    owner_name: '',
    tags: '',
  });

  const filteredDecisions = decisions.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.body_md?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDecision = async () => {
    if (!documentId || !newDecision.title) {
      toast.error('Title is required');
      return;
    }

    try {
      await createItem.mutateAsync({
        document_id: documentId,
        item_type: 'decision',
        title: newDecision.title,
        body_md: newDecision.body_md,
        status: newDecision.status,
        owner_name: newDecision.owner_name || null,
        tags: newDecision.tags ? newDecision.tags.split(',').map(t => t.trim()) : null,
        severity: null,
        owner_user_id: null,
        due_date: null,
        phase: null,
        related_type: null,
        related_id: null,
        is_archived: false,
      });
      toast.success('Decision created');
      setIsAddingNew(false);
      setNewDecision({ title: '', body_md: '', status: 'proposed', owner_name: '', tags: '' });
    } catch (error) {
      toast.error('Failed to create decision');
    }
  };

  const handleUpdateStatus = async (id: string, status: DevItemStatus) => {
    try {
      await updateItem.mutateAsync({ id, status });
      toast.success('Status updated');
      if (selectedDecision?.id === id) {
        setSelectedDecision({ ...selectedDecision, status });
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Decisions Log</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setIsAddingNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Decision
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Decisions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Owner</TableHead>
              <TableHead className="w-[150px]">Tags</TableHead>
              <TableHead className="w-[100px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDecisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No decisions found
                </TableCell>
              </TableRow>
            ) : (
              filteredDecisions.map(decision => (
                <TableRow
                  key={decision.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedDecision(decision)}
                >
                  <TableCell className="font-medium">{decision.title}</TableCell>
                  <TableCell>
                    <StatusBadge status={decision.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {decision.owner_name || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {decision.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(decision.tags?.length ?? 0) > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(decision.tags?.length ?? 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(decision.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Decision Detail Sheet */}
      <Sheet open={!!selectedDecision} onOpenChange={open => !open && setSelectedDecision(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedDecision?.title}</SheetTitle>
            <SheetDescription>
              Created {selectedDecision && format(new Date(selectedDecision.created_at), 'MMMM d, yyyy')}
            </SheetDescription>
          </SheetHeader>

          {selectedDecision && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {isAdmin ? (
                  <Select
                    value={selectedDecision.status || 'proposed'}
                    onValueChange={v => handleUpdateStatus(selectedDecision.id, v as DevItemStatus)}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposed">Proposed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={selectedDecision.status} />
                )}
              </div>

              {selectedDecision.owner_name && (
                <div>
                  <span className="text-sm text-muted-foreground">Owner:</span>
                  <span className="ml-2 text-sm">{selectedDecision.owner_name}</span>
                </div>
              )}

              {selectedDecision.tags && selectedDecision.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDecision.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedDecision.body_md && (
                <div className="pt-4 border-t">
                  <MarkdownRenderer content={selectedDecision.body_md} />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Decision Sheet */}
      <Sheet open={isAddingNew} onOpenChange={setIsAddingNew}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Decision</SheetTitle>
            <SheetDescription>
              Record a new decision for the project
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={newDecision.title}
                onChange={e => setNewDecision({ ...newDecision, title: e.target.value })}
                placeholder="Decision title"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={newDecision.status}
                onValueChange={v => setNewDecision({ ...newDecision, status: v as DevItemStatus })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Owner</label>
              <Input
                value={newDecision.owner_name}
                onChange={e => setNewDecision({ ...newDecision, owner_name: e.target.value })}
                placeholder="Who owns this decision?"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={newDecision.tags}
                onChange={e => setNewDecision({ ...newDecision, tags: e.target.value })}
                placeholder="architecture, crm, integration"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Details (Markdown)</label>
              <Textarea
                value={newDecision.body_md}
                onChange={e => setNewDecision({ ...newDecision, body_md: e.target.value })}
                placeholder="Decision rationale, alternatives considered, impacted modules..."
                className="mt-1 min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateDecision}
                disabled={createItem.isPending}
              >
                {createItem.isPending ? 'Creating...' : 'Create Decision'}
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
