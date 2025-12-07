import { useState } from 'react';
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
import { Phone, Loader2 } from 'lucide-react';

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogCall: (data: {
    direction: 'inbound' | 'outbound';
    duration_seconds?: number;
    outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message';
    notes?: string;
  }) => Promise<void>;
  isLogging?: boolean;
}

export function LogCallDialog({ open, onOpenChange, onLogCall, isLogging }: LogCallDialogProps) {
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [outcome, setOutcome] = useState<'answered' | 'voicemail' | 'no_answer' | 'busy' | 'left_message'>('answered');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [notes, setNotes] = useState('');

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

    // Reset form
    setDirection('outbound');
    setOutcome('answered');
    setDurationMinutes('');
    setDurationSeconds('');
    setNotes('');
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
