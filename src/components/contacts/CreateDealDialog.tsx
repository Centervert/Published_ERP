import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { useCreateDeal, DEAL_STAGE_LABELS, DealStage } from '@/hooks/useDeals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
}

const INITIAL_STAGES: DealStage[] = ['new', 'outreach', 'contacted'];

export function CreateDealDialog({ open, onOpenChange, contactId, contactName }: CreateDealDialogProps) {
  const createDeal = useCreateDeal();
  const [stage, setStage] = useState<DealStage>('new');
  const [assignedAsc, setAssignedAsc] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = async () => {
    await createDeal.mutateAsync({
      contact_id: contactId,
      stage,
      assigned_asc: assignedAsc || undefined,
      notes: notes || undefined,
    });
    
    // Reset and close
    setStage('new');
    setAssignedAsc('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Deal</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Contact</Label>
            <p className="text-sm font-medium">{contactName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Initial Stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INITIAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DEAL_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned">Assign to ASC</Label>
            <Select value={assignedAsc} onValueChange={setAssignedAsc}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to me" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Assign to me</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any initial notes about this deal..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createDeal.isPending}>
            {createDeal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}