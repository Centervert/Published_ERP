import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Phone, Loader2, PhoneCall } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, addDays } from 'date-fns';

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogCall: (data: {
    direction: 'inbound' | 'outbound';
    duration_seconds?: number;
    outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message';
    notes?: string;
  }) => Promise<void>;
  onCreateCallback?: (data: {
    title: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
  }) => Promise<void>;
  isLogging?: boolean;
}

export function LogCallDialog({ open, onOpenChange, onLogCall, onCreateCallback, isLogging }: LogCallDialogProps) {
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [outcome, setOutcome] = useState<'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message'>('answered');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [notes, setNotes] = useState('');
  
  // Callback reminder state
  const [createCallback, setCreateCallback] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackPriority, setCallbackPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Show callback section for voicemail/left_message/no_answer outcomes
  const showCallbackSection = outcome === 'voicemail' || outcome === 'left_message' || outcome === 'no_answer';

  // Auto-enable callback checkbox when outcome is voicemail-related
  useEffect(() => {
    if (showCallbackSection) {
      setCreateCallback(true);
      // Default to tomorrow
      if (!callbackDate) {
        setCallbackDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      }
    } else {
      setCreateCallback(false);
    }
  }, [outcome, showCallbackSection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalSeconds = 
      (parseInt(durationMinutes) || 0) * 60 + 
      (parseInt(durationSeconds) || 0);

    await onLogCall({
      direction,
      duration_seconds: totalSeconds > 0 ? totalSeconds : undefined,
      outcome,
      notes: notes.trim() || undefined,
    });

    // Create callback reminder if requested
    if (createCallback && onCreateCallback && callbackDate) {
      const outcomeLabel = outcome === 'voicemail' ? 'Voicemail' : 
                          outcome === 'left_message' ? 'Left Message' : 
                          'No Answer';
      await onCreateCallback({
        title: `Return call - ${outcomeLabel}`,
        description: notes.trim() || undefined,
        due_date: callbackDate,
        priority: callbackPriority,
      });
    }

    // Reset form
    setDirection('outbound');
    setOutcome('answered');
    setDurationMinutes('');
    setDurationSeconds('');
    setNotes('');
    setCreateCallback(false);
    setCallbackDate('');
    setCallbackPriority('medium');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Log Call
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'inbound' | 'outbound')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as typeof outcome)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="left_message">Left Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">min</span>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add notes about this call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Callback Reminder Section */}
          {showCallbackSection && onCreateCallback && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Callback Reminder</span>
              </div>
              
              <div className="flex items-start gap-3">
                <Checkbox
                  id="create-callback"
                  checked={createCallback}
                  onCheckedChange={(checked) => setCreateCallback(checked === true)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="create-callback" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Create a callback reminder for this contact
                </label>
              </div>

              {createCallback && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-1">
                    <Label className="text-xs">Callback Date</Label>
                    <Input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={callbackPriority} onValueChange={(v) => setCallbackPriority(v as typeof callbackPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLogging}>
              {isLogging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Call
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
