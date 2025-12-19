import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ImportJob {
  id: string;
  status: string;
  file_name: string;
  column_mapping: Record<string, string> | null;
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: { row: number; error: string }[];
  warnings: string[];
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function useImportJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['import-jobs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform JSONB fields to proper types
      return (data || []).map(job => ({
        ...job,
        errors: (job.errors as unknown as { row: number; error: string }[]) || [],
        warnings: (job.warnings as unknown as string[]) || [],
        column_mapping: job.column_mapping as Record<string, string> | null,
      })) as ImportJob[];
    },
    enabled: !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('import-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_jobs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['import-jobs', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createJob = useMutation({
    mutationFn: async (data: {
      fileName: string;
      fileData: string;
      columnMapping: Record<string, string>;
      totalRows: number;
    }) => {
      const { data: job, error } = await supabase
        .from('import_jobs')
        .insert({
          file_name: data.fileName,
          file_data: data.fileData,
          column_mapping: data.columnMapping,
          total_rows: data.totalRows,
          status: 'pending',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs', user?.id] });
    },
  });

  const startProcessing = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('process-import', {
        body: { jobId },
      });

      if (error) throw error;
      return data;
    },
  });

  const deleteJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('import_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs', user?.id] });
    },
  });

  return {
    jobs,
    isLoading,
    error,
    createJob,
    startProcessing,
    deleteJob,
  };
}
