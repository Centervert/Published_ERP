import { useState } from 'react';
import { useDealDetail, WRITING_STATUS_OPTIONS } from '@/hooks/useDealDetail';
import { useContactCommunications } from '@/hooks/useContactCommunications';
import { useContactNotes } from '@/hooks/useContactNotes';
import { DEAL_STAGE_LABELS, DealStage } from '@/hooks/useDeals';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { 
  Phone, 
  Plus, 
  Loader2, 
  FileText, 
  CheckSquare,
  MessageSquare,
  Clock,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { NotesSection } from '@/components/contacts/NotesSection';
import { TasksSection } from '@/components/contacts/TasksSection';
import { LogCallDialog } from '@/components/contacts/LogCallDialog';
import { toast } from 'sonner';

interface DealDetailSheetProps {
  dealId: string | null;
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAGE_COLORS: Record<DealStage, string> = {
  new: 'bg-slate-500',
  outreach: 'bg-blue-500',
  contacted: 'bg-cyan-500',
  qualified: 'bg-violet-500',
  nurturing: 'bg-purple-500',
  proposal_sent: 'bg-amber-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
  not_interested: 'bg-gray-500',
};

export function DealDetailSheet({ dealId, contactId, open, onOpenChange }: DealDetailSheetProps) {
  const { deal, isLoading, updateDeal } = useDealDetail(dealId);
  const { logCall } = useContactCommunications(contactId);
  const [isEditing, setIsEditing] = useState(false);
  const [showLogCallDialog, setShowLogCallDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  // Edit form state
  const [editForm, setEditForm] = useState({
    book_title: '',
    writing_status: '',
    book_description: '',
    goals: '',
    notes: '',
  });

  const startEditing = () => {
    if (!deal) return;
    setEditForm({
      book_title: deal.book_title || '',
      writing_status: deal.writing_status || '',
      book_description: deal.book_description || '',
      goals: deal.goals || '',
      notes: deal.notes || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    await updateDeal.mutateAsync({
      book_title: editForm.book_title || null,
      writing_status: editForm.writing_status || null,
      book_description: editForm.book_description || null,
      goals: editForm.goals || null,
      notes: editForm.notes || null,
    });
    setIsEditing(false);
  };

  const handleLogCall = async (data: {
    direction: 'inbound' | 'outbound';
    duration_seconds?: number;
    outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message';
    notes?: string;
  }) => {
    await logCall.mutateAsync({
      ...data,
      deal_id: dealId,
    });
    toast.success('Call logged');
  };

  if (!dealId) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deal ? (
            <>
              {/* Header */}
              <SheetHeader className="p-6 border-b space-y-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`${STAGE_COLORS[deal.stage]} text-white text-xs`}>
                        {DEAL_STAGE_LABELS[deal.stage]}
                      </Badge>
                      {deal.total_value && deal.total_value > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          ${deal.total_value.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-lg">
                      {deal.book_title || deal.name || 'Untitled Deal'}
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      Created {format(parseISO(deal.created_at), 'MMM d, yyyy')}
                      {deal.assigned_asc_name && ` • Assigned to ${deal.assigned_asc_name}`}
                    </p>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={saveChanges} disabled={updateDeal.isPending}>
                        {updateDeal.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </SheetHeader>

              {/* Deal Info Section */}
              <div className="p-6 border-b space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Book Title</Label>
                        <Input
                          value={editForm.book_title}
                          onChange={(e) => setEditForm({ ...editForm, book_title: e.target.value })}
                          placeholder="Working title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Writing Status</Label>
                        <Select 
                          value={editForm.writing_status} 
                          onValueChange={(v) => setEditForm({ ...editForm, writing_status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {WRITING_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Book Description</Label>
                      <Textarea
                        value={editForm.book_description}
                        onChange={(e) => setEditForm({ ...editForm, book_description: e.target.value })}
                        placeholder="Brief description of the book..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Author Goals</Label>
                      <Textarea
                        value={editForm.goals}
                        onChange={(e) => setEditForm({ ...editForm, goals: e.target.value })}
                        placeholder="What does the author want to achieve?"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Internal Notes</Label>
                      <Textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Notes about this deal..."
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    {deal.writing_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Writing Status</span>
                        <span>{WRITING_STATUS_OPTIONS.find(o => o.value === deal.writing_status)?.label || deal.writing_status}</span>
                      </div>
                    )}
                    {deal.book_description && (
                      <div>
                        <span className="text-muted-foreground text-xs">Book Description</span>
                        <p className="mt-1">{deal.book_description}</p>
                      </div>
                    )}
                    {deal.goals && (
                      <div>
                        <span className="text-muted-foreground text-xs">Author Goals</span>
                        <p className="mt-1">{deal.goals}</p>
                      </div>
                    )}
                    {deal.notes && (
                      <div>
                        <span className="text-muted-foreground text-xs">Notes</span>
                        <p className="mt-1">{deal.notes}</p>
                      </div>
                    )}
                    {!deal.writing_status && !deal.book_description && !deal.goals && !deal.notes && (
                      <p className="text-muted-foreground text-center py-2">
                        No details added yet. Click Edit to add information.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="px-6 py-3 border-b flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowLogCallDialog(true)}>
                  <Phone className="h-4 w-4 mr-1" />
                  Log Call
                </Button>
              </div>

              {/* Activity Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mt-4 w-auto justify-start">
                  <TabsTrigger value="notes" className="gap-1">
                    <FileText className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-1">
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="notes" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                  <NotesSection 
                    contactId={contactId} 
                    dealId={dealId}
                    placeholder="Add a note about this deal..."
                    emptyMessage="No notes for this deal yet"
                  />
                </TabsContent>

                <TabsContent value="tasks" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                  <TasksSection 
                    contactId={contactId} 
                    dealId={dealId}
                    emptyMessage="No tasks for this deal yet"
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Deal not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LogCallDialog
        open={showLogCallDialog}
        onOpenChange={setShowLogCallDialog}
        onLogCall={handleLogCall}
        isLogging={logCall.isPending}
      />
    </>
  );
}
