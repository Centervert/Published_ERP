import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface BulkValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
}

interface ValidationResults {
  total: number;
  validated: number;
  failed: number;
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
}

export function BulkValidationDialog({
  open,
  onOpenChange,
  contactIds,
}: BulkValidationDialogProps) {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setResults(null);
      setError(null);
      setIsValidating(false);
    }
  }, [open]);

  const handleValidate = async () => {
    if (contactIds.length === 0) {
      toast.error('No contacts selected');
      return;
    }

    setIsValidating(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-email-batch', {
        body: { contactIds },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResults(data.results);
      
      // Invalidate contacts queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-paginated'] });
      
      toast.success(`Validated ${data.results.validated} of ${data.results.total} emails`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsValidating(false);
    }
  };

  const progress = results 
    ? Math.round(((results.validated + results.failed) / results.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Bulk Email Validation
          </DialogTitle>
          <DialogDescription>
            Validate {contactIds.length} email{contactIds.length !== 1 ? 's' : ''} using Mailgun
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isValidating && !results && !error && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                This will validate all selected contacts and update their email status.
                Invalid emails will be flagged for review.
              </p>
              <Button onClick={handleValidate} className="w-full">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Start Validation
              </Button>
            </div>
          )}

          {isValidating && (
            <div className="space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Validating emails... This may take a moment.
              </p>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Validation Failed</span>
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={handleValidate} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Validation Complete</span>
              </div>
              
              <Progress value={progress} className="w-full" />
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{results.total}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-muted-foreground">Validated:</span>
                  <span className="font-medium">{results.validated}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">Deliverable:</span>
                  <span className="font-medium text-green-600">{results.deliverable}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/20 rounded-md">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-muted-foreground">Undeliverable:</span>
                  <span className="font-medium text-red-600">{results.undeliverable}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-muted-foreground">Risky:</span>
                  <span className="font-medium text-yellow-600">{results.risky}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium">{results.failed}</span>
                </div>
              </div>

              <Button onClick={() => onOpenChange(false)} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}