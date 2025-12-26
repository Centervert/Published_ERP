import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Imprint {
  id: string;
  name: string;
  slug: string;
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  icon_url: string | null;
  header_image_url: string | null;
  header_image_dark_url?: string | null; // Optional - only on company, not imprints table
  footer_image_url: string | null;
  brand_voice: string | null;
  tagline: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type ImprintInsert = Omit<Imprint, 'id' | 'created_at' | 'updated_at'>;
export type ImprintUpdate = Partial<ImprintInsert>;

export function useImprints() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: imprints = [], isLoading, error } = useQuery({
    queryKey: ['imprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imprints')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Imprint[];
    },
  });

  const createImprint = useMutation({
    mutationFn: async (imprint: Omit<ImprintInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('imprints')
        .insert({ ...imprint, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data as Imprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprints'] });
      toast.success('Imprint created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create imprint: ${error.message}`);
    },
  });

  const updateImprint = useMutation({
    mutationFn: async ({ id, ...updates }: ImprintUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('imprints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Imprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprints'] });
      toast.success('Imprint updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update imprint: ${error.message}`);
    },
  });

  const deleteImprint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('imprints')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprints'] });
      toast.success('Imprint deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete imprint: ${error.message}`);
    },
  });

  const uploadAsset = async (file: File, imprintSlug: string, assetType: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${imprintSlug}/${assetType}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('imprint-assets')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('imprint-assets')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  return {
    imprints,
    isLoading,
    error,
    createImprint,
    updateImprint,
    deleteImprint,
    uploadAsset,
  };
}
