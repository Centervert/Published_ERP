import { useState } from 'react';
import { useDealDetail, WRITING_STATUS_OPTIONS } from '@/hooks/useDealDetail';
import { useContactCommunications } from '@/hooks/useContactCommunications';
import { useDealCommunications } from '@/hooks/useDealCommunications';
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
  Sparkles,
  MessageSquare,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
} from 'lucide-react';
import { NotesSection } from '@/components/contacts/NotesSection';
import { TasksSection } from '@/components/contacts/TasksSection';
import { LogCallDialog } from '@/components/contacts/LogCallDialog';
import { useQueryClient } from '@tanstack/react-query';

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

const OUTCOME_LABELS: Record<string, string> = {
  answered: 'Answered',
  voicemail: 'Voicemail',
  no_answer: 'No Answer',
  busy: 'Busy',
  left_message: 'Left Message',
};

export function DealDetailSheet({ dealId, contactId, open, onOpenChange }: DealDetailSheetProps) {
  const { deal, isLoading, updateDeal } = useDealDetail(dealId);
  const { logCall } = useContactCommunications(contactId);
  const { communications: dealCommunications, isLoading: isLoadingComms } = useDealCommunications(dealId);
  const queryClient = useQueryClient();
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
    try {
      await logCall.mutateAsync({
        ...data,
        deal_id: dealId,
      });
      // Also invalidate deal communications
      queryClient.invalidateQueries({ queryKey: ['deal-communications', dealId] });
    } catch (error) {
      console.error('Failed to log call:', error);
    }
  };

  if (!dealId) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col overflow-hidden" hideCloseButton>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deal ? (
            <>
              {/* Fixed Header */}
              <SheetHeader className="p-6 pb-4 border-b space-y-0 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Stage:</span>
                    <Select
                      value={deal.stage}
                      onValueChange={(value) => updateDeal.mutate({ stage: value as DealStage })}
                    >
                      <SelectTrigger className="h-8 px-3 text-sm font-medium border rounded-md w-auto gap-2 bg-background">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${STAGE_COLORS[deal.stage]}`} />
                          <span>{DEAL_STAGE_LABELS[deal.stage]}</span>
                        </div>
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
                    placeholder="Book or deal title"
                  />
                ) : (
                  <SheetTitle 
                    className={`text-lg cursor-pointer hover:text-primary transition-colors ${!deal.book_title && !deal.name ? 'text-muted-foreground' : ''}`}
                    onClick={() => startEditing('book_title', deal.book_title)}
                  >
                    {deal.book_title || deal.name || 'Click to add book or deal title'}
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

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Deal Info Section - Inline Editable */}
                <div className="p-6 pt-4 border-b space-y-4">
                  {/* AI Summary - Coming Soon */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      AI Summary
                    </div>
                    <div className="py-2 px-3 rounded-md border border-dashed bg-muted/30 text-center">
                      <span className="text-sm text-muted-foreground">Coming Soon</span>
                    </div>
                  </div>

                  {/* Writing Status */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Writing Status</span>
                    <Select
                      value={deal.writing_status || ''}
                      onValueChange={(value) => updateDeal.mutate({ writing_status: value || null })}
                    >
                      <SelectTrigger className="h-9 border-dashed hover:border-solid bg-muted/50">
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
                        className="resize-none min-h-[60px] bg-muted/50"
                        placeholder="Brief description of the book..."
                      />
                    ) : (
                      <div 
                        className="text-sm p-2 rounded border border-dashed hover:border-solid cursor-pointer min-h-[40px] bg-muted/50"
                        onClick={() => startEditing('book_description', deal.book_description)}
                      >
                        {deal.book_description || <span className="text-muted-foreground">Click to add description</span>}
                      </div>
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
                        className="resize-none min-h-[60px] bg-muted/50"
                        placeholder="What does the author want to achieve?"
                      />
                    ) : (
                      <div 
                        className="text-sm p-2 rounded border border-dashed hover:border-solid cursor-pointer min-h-[40px] bg-muted/50"
                        onClick={() => startEditing('goals', deal.goals)}
                      >
                        {deal.goals || <span className="text-muted-foreground">Click to add goals</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                  <TabsList className="mx-6 mt-4 w-auto justify-start">
                    <TabsTrigger value="notes" className="gap-1">
                      <FileText className="h-4 w-4" />
                      Notes
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-1">
                      <CheckSquare className="h-4 w-4" />
                      Tasks
                    </TabsTrigger>
                    <TabsTrigger value="communication" className="gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Communication
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="notes" className="px-6 py-4 mt-0">
                    <NotesSection 
                      contactId={contactId} 
                      dealId={dealId}
                      placeholder="Add a note about this deal..."
                      emptyMessage="No notes for this deal yet"
                    />
                  </TabsContent>

                  <TabsContent value="tasks" className="px-6 py-4 mt-0">
                    <TasksSection 
                      contactId={contactId} 
                      dealId={dealId}
                      emptyMessage="No tasks for this deal yet"
                    />
                  </TabsContent>

                  <TabsContent value="communication" className="px-6 py-4 mt-0">
                    <div className="space-y-4">
                      {/* Log Call Button */}
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowLogCallDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Log Call
                        </Button>
                      </div>

                      {/* Communications List */}
                      {isLoadingComms ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : dealCommunications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">No communication logged yet</p>
                          <p className="text-xs text-muted-foreground">Log calls and emails related to this deal</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dealCommunications.map((comm) => (
                            <div 
                              key={comm.id} 
                              className="p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-full bg-muted">
                                  {comm.direction === 'inbound' ? (
                                    <PhoneIncoming className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">
                                      {comm.direction === 'inbound' ? 'Inbound' : 'Outbound'} Call
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(parseISO(comm.created_at), 'MMM d, h:mm a')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    {comm.outcome && (
                                      <span className="px-1.5 py-0.5 rounded bg-muted">
                                        {OUTCOME_LABELS[comm.outcome] || comm.outcome}
                                      </span>
                                    )}
                                    {comm.duration_seconds && comm.duration_seconds > 0 && (
                                      <span>
                                        {Math.floor(comm.duration_seconds / 60)}:{(comm.duration_seconds % 60).toString().padStart(2, '0')} min
                                      </span>
                                    )}
                                  </div>
                                  {comm.notes && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {comm.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
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
