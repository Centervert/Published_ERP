import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ValidationResult {
  result: 'deliverable' | 'undeliverable' | 'do_not_send' | 'catch_all' | 'unknown';
  risk: 'low' | 'medium' | 'high' | 'unknown';
  reasons: string[];
  isDisposable: boolean;
  isRoleAddress: boolean;
  didYouMean: string | null;
  email: string;
}

export interface BatchValidationResults {
  total: number;
  validated: number;
  failed: number;
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
}

export function useValidateEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, contactId }: { email: string; contactId?: string }) => {
      const { data, error } = await supabase.functions.invoke('validate-email', {
        body: { email, contactId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.validation as ValidationResult;
    },
    onSuccess: (data, variables) => {
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }
      
      if (data.result === 'deliverable' && data.risk === 'low') {
        toast.success('Email validated successfully');
      } else if (data.result === 'undeliverable' || data.result === 'do_not_send') {
        toast.warning(`Email validation warning: ${data.result.replace('_', ' ')}`);
      } else {
        toast.info(`Email validation: ${data.result} (${data.risk} risk)`);
      }
    },
    onError: (error: Error) => {
      console.error('Validation error:', error);
      toast.error(`Validation failed: ${error.message}`);
    }
  });
}

export function useValidateEmailBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, listId }: { contactIds?: string[]; listId?: string }) => {
      const { data, error } = await supabase.functions.invoke('validate-email-batch', {
        body: { contactIds, listId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.results as BatchValidationResults;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(
        `Validated ${data.validated} of ${data.total} emails: ${data.deliverable} deliverable, ${data.undeliverable} undeliverable, ${data.risky} risky`
      );
    },
    onError: (error: Error) => {
      console.error('Batch validation error:', error);
      toast.error(`Batch validation failed: ${error.message}`);
    }
  });
}

// Helper function to get validation status color
export function getValidationStatusColor(
  result: string | null, 
  risk: string | null
): 'green' | 'yellow' | 'orange' | 'red' | 'gray' {
  if (!result) return 'gray';
  
  if (result === 'deliverable' && risk === 'low') return 'green';
  if (result === 'undeliverable' || result === 'do_not_send') return 'red';
  if (risk === 'high') return 'orange';
  if (risk === 'medium' || result === 'catch_all') return 'yellow';
  
  return 'gray';
}

// Helper function to get human-readable validation status
export function getValidationStatusLabel(
  result: string | null, 
  risk: string | null
): string {
  if (!result) return 'Not validated';
  
  if (result === 'deliverable' && risk === 'low') return 'Valid';
  if (result === 'undeliverable') return 'Undeliverable';
  if (result === 'do_not_send') return 'Do not send';
  if (result === 'catch_all') return 'Catch-all';
  if (risk === 'high') return 'High risk';
  if (risk === 'medium') return 'Medium risk';
  
  return 'Unknown';
}
