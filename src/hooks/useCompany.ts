import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Company {
  id: string;
  name: string;
  slug: string;
  legal_address: string | null;
  phone: string | null;
  website_url: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  icon_url: string | null;
  favicon_url: string | null;
  footer_copyright_template: string | null;
  footer_reason_template: string | null;
  // Branding fields (migrated from imprints)
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  brand_voice: string | null;
  tagline: string | null;
  from_name: string | null;
  from_email: string | null;
  reply_to_email: string | null;
  header_image_url: string | null;
  footer_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyUpdate = Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>;

export function useCompany() {
  const queryClient = useQueryClient();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as Company;
    },
  });

  const updateCompany = useMutation({
    mutationFn: async (updates: CompanyUpdate) => {
      if (!company?.id) throw new Error('No company found');
      
      const { data, error } = await supabase
        .from('company')
        .update(updates)
        .eq('id', company.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Parent company updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update parent company: ${error.message}`);
    },
  });

  const uploadAsset = async (file: File, assetType: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `company/${assetType}.${fileExt}`;
    
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
    company,
    isLoading,
    error,
    updateCompany,
    uploadAsset,
  };
}
