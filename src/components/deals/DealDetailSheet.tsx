import { useState, useEffect } from 'react';
import { useDealDetail, WRITING_STATUS_OPTIONS } from '@/hooks/useDealDetail';
import { useContactCommunications } from '@/hooks/useContactCommunications';
import { DEAL_STAGE_LABELS, DealStage } from '@/hooks/useDeals';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2, 
  FileText, 
  CheckSquare,
  DollarSign,
  Calendar,
  User,
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
  new: 'bg-slate-400',
  outreach: 'bg-blue-400',
  contacted: 'bg-cyan-400',
  qualified: 'bg-violet-400',
  nurturing: 'bg-purple-400',
  proposal_sent: 'bg-amber-400',
  won: 'bg-green-400',
  lost: 'bg-red-400',
  not_interested: 'bg-gray-400',
};

export function DealDetailSheet({ dealId, contactId, open, onOpenChange }: DealDetailSheetProps) {
  const { deal, isLoading, updateDeal } = useDealDetail(dealId);
  const { logCall } = useContactCommunications(contactId);
  const [showLogCallDialog, setShowLogCallDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  // Inline edit state - tracks individual field changes
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  // Save on blur or enter
  const saveField = async (field: string, value: string) => {
    if (!deal) return;
    
    const currentValue = deal[field as keyof typeof deal];
    if (value === (currentValue || '')) {
      setEditingField(null);
      return;
    }
    
    await updateDeal.mutateAsync({
      [field]: value || null,
    });
    setEditingField(null);
  };

  const startEditing = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setFieldValue(currentValue || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveField(field, fieldValue);
    }
    if (e.key === 'Escape') {
      setEditingField(null);
    }
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
        <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col" hideCloseButton>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deal ? (
            <>
              {/* Header */}
              <SheetHeader className="p-6 pb-4 border-b space-y-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${STAGE_COLORS[deal.stage]}`} />
                    <Select
                      value={deal.stage}
                      onValueChange={(value) => updateDeal.mutate({ stage: value as DealStage })}
                    >
                      <SelectTrigger className="h-auto py-1 px-2 text-sm font-medium border-0 bg-transparent hover:bg-muted focus:ring-0 w-auto gap-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${STAGE_COLORS[value as DealStage]}`} />
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                </div>
                
                {/* Editable Title */}
                {editingField === 'book_title' ? (
                  <Input
                    autoFocus
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onBlur={() => saveField('book_title', fieldValue)}
                    onKeyDown={(e) => handleKeyDown(e, 'book_title')}
                    className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="Deal title"
                  />
                ) : (
                  <SheetTitle 
                    className="text-lg cursor-pointer hover:text-primary transition-colors"
                    onClick={() => startEditing('book_title', deal.book_title)}
                  >
                    {deal.book_title || deal.name || 'Click to add title'}
                  </SheetTitle>
                )}
                
                {/* Meta info row */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(deal.created_at), 'MMM d, yyyy')}
                  </div>
                  {deal.assigned_asc_name && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {deal.assigned_asc_name}
                    </div>
                  )}
                  {deal.total_value && deal.total_value > 0 && (
                    <div className="flex items-center gap-1 text-foreground font-medium">
                      <DollarSign className="h-3 w-3" />
                      {deal.total_value.toLocaleString()}
                    </div>
                  )}
                </div>
              </SheetHeader>

              {/* Deal Info Section - Inline Editable */}
              <div className="p-6 border-b space-y-4">
                {/* Writing Status */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Writing Status</span>
                  <Select
                    value={deal.writing_status || ''}
                    onValueChange={(value) => updateDeal.mutate({ writing_status: value || null })}
                  >
                    <SelectTrigger className="h-9 border-dashed hover:border-solid">
                      <SelectValue placeholder="Select writing status" />
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

                {/* Book Description */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Book Description</span>
                  {editingField === 'book_description' ? (
                    <Textarea
                      autoFocus
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('book_description', fieldValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="resize-none min-h-[60px]"
                      placeholder="Brief description of the book..."
                    />
                  ) : (
                    <p 
                      className="text-sm p-2 rounded border border-dashed border-transparent hover:border-border cursor-pointer min-h-[40px]"
                      onClick={() => startEditing('book_description', deal.book_description)}
                    >
                      {deal.book_description || <span className="text-muted-foreground">Click to add description</span>}
                    </p>
                  )}
                </div>

                {/* Author Goals */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Author Goals</span>
                  {editingField === 'goals' ? (
                    <Textarea
                      autoFocus
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('goals', fieldValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="resize-none min-h-[60px]"
                      placeholder="What does the author want to achieve?"
                    />
                  ) : (
                    <p 
                      className="text-sm p-2 rounded border border-dashed border-transparent hover:border-border cursor-pointer min-h-[40px]"
                      onClick={() => startEditing('goals', deal.goals)}
                    >
                      {deal.goals || <span className="text-muted-foreground">Click to add goals</span>}
                    </p>
                  )}
                </div>

                {/* Internal Notes */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Internal Notes</span>
                  {editingField === 'notes' ? (
                    <Textarea
                      autoFocus
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      onBlur={() => saveField('notes', fieldValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                      className="resize-none min-h-[60px]"
                      placeholder="Notes about this deal..."
                    />
                  ) : (
                    <p 
                      className="text-sm p-2 rounded border border-dashed border-transparent hover:border-border cursor-pointer min-h-[40px]"
                      onClick={() => startEditing('notes', deal.notes)}
                    >
                      {deal.notes || <span className="text-muted-foreground">Click to add notes</span>}
                    </p>
                  )}
                </div>
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
