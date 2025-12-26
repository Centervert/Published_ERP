import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DevDocument {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content_md: string;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
  is_published: boolean;
}

export function useDevDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['dev-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DevDocument[];
    },
  });

  const createDocument = useMutation({
    mutationFn: async (doc: { slug: string; title: string; summary?: string }) => {
      const { data, error } = await supabase
        .from('dev_documents')
        .insert({ ...doc, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-documents'] });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DevDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from('dev_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-documents'] });
    },
  });

  return {
    documents: documentsQuery.data ?? [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    createDocument,
    updateDocument,
  };
}

export function useDevDocument(slug: string) {
  return useQuery({
    queryKey: ['dev-document', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_documents')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as DevDocument | null;
    },
    enabled: !!slug,
  });
}

export function useDevDocumentVersions(documentId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['dev-document-versions', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from('dev_document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as DevDocumentVersion[];
    },
    enabled: !!documentId,
  });

  const createVersion = useMutation({
    mutationFn: async ({ documentId, content_md, change_summary }: { 
      documentId: string; 
      content_md: string; 
      change_summary?: string;
    }) => {
      // Get current max version number
      const { data: existing } = await supabase
        .from('dev_document_versions')
        .select('version_number')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(1);
      
      const nextVersion = (existing?.[0]?.version_number ?? 0) + 1;

      const { data, error } = await supabase
        .from('dev_document_versions')
        .insert({
          document_id: documentId,
          version_number: nextVersion,
          content_md,
          change_summary,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-document-versions', documentId] });
    },
  });

  const latestVersion = versionsQuery.data?.[0] ?? null;

  return {
    versions: versionsQuery.data ?? [],
    latestVersion,
    isLoading: versionsQuery.isLoading,
    createVersion,
  };
}
