import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PropertyChange {
  id: string;
  activity_type: string;
  description: string;
  metadata: {
    changes?: Record<string, { from: string; to: string; fromName?: string; toName?: string }>;
    field?: string;
    from?: string | null;
    to?: string | null;
    fromName?: string;
    toName?: string;
    source?: 'manual' | 'import' | 'webhook' | 'bulk';
  };
  created_at: string;
  created_by_name: string | null;
  source_type: 'manual' | 'import' | 'webhook' | 'bulk' | 'system';
}

// Field name mapping for user-friendly display
const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  timezone: 'Timezone',
  contact_type: 'Contact Type',
  status: 'Status',
  assigned_asc: 'A.S.C. (Profile)',
  assigned_ae: 'A.E. (Profile)',
  staff_asc_id: 'Author Success Coach',
  staff_ae_id: 'Account Executive',
  imprint_id: 'Imprint',
};

export function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function useContactHistory(contactId: string) {
  const historyQuery = useQuery({
    queryKey: ['contact-history', contactId],
    queryFn: async () => {
      // Fetch only property change activities (exclude notes, links)
      const { data: activities, error } = await supabase
        .from('contact_activity')
        .select('*, profile:profiles!contact_activity_created_by_fkey(full_name, email)')
        .eq('contact_id', contactId)
        .in('activity_type', ['contact_created', 'contact_updated', 'assignment_changed', 'status_changed', 'imprint_changed', 'staff_assignment_changed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lookup data for IDs (imprints, staff)
      const imprintIds = new Set<string>();
      const staffIds = new Set<string>();
      
      activities?.forEach((a: any) => {
        if (a.metadata?.changes?.imprint_id) {
          if (a.metadata.changes.imprint_id.from) imprintIds.add(a.metadata.changes.imprint_id.from);
          if (a.metadata.changes.imprint_id.to) imprintIds.add(a.metadata.changes.imprint_id.to);
        }
        if (a.metadata?.changes?.staff_asc_id) {
          if (a.metadata.changes.staff_asc_id.from) staffIds.add(a.metadata.changes.staff_asc_id.from);
          if (a.metadata.changes.staff_asc_id.to) staffIds.add(a.metadata.changes.staff_asc_id.to);
        }
        if (a.metadata?.changes?.staff_ae_id) {
          if (a.metadata.changes.staff_ae_id.from) staffIds.add(a.metadata.changes.staff_ae_id.from);
          if (a.metadata.changes.staff_ae_id.to) staffIds.add(a.metadata.changes.staff_ae_id.to);
        }
      });

      // Fetch imprint names
      let imprintMap = new Map<string, string>();
      if (imprintIds.size > 0) {
        const { data: imprints } = await supabase
          .from('imprints')
          .select('id, name')
          .in('id', Array.from(imprintIds));
        imprintMap = new Map(imprints?.map(i => [i.id, i.name]) || []);
      }

      // Fetch staff names
      let staffMap = new Map<string, string>();
      if (staffIds.size > 0) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, full_name')
          .in('id', Array.from(staffIds));
        staffMap = new Map(staff?.map(s => [s.id, s.full_name]) || []);
      }

      // Transform activities with resolved names
      return activities?.map((a: any) => {
        const metadata = { ...a.metadata };
        
        // Resolve imprint names
        if (metadata.changes?.imprint_id) {
          metadata.changes.imprint_id = {
            ...metadata.changes.imprint_id,
            fromName: metadata.changes.imprint_id.from ? imprintMap.get(metadata.changes.imprint_id.from) || 'Unknown' : undefined,
            toName: metadata.changes.imprint_id.to ? imprintMap.get(metadata.changes.imprint_id.to) || 'Unknown' : undefined,
          };
        }

        // Resolve staff names
        if (metadata.changes?.staff_asc_id) {
          metadata.changes.staff_asc_id = {
            ...metadata.changes.staff_asc_id,
            fromName: metadata.changes.staff_asc_id.from ? staffMap.get(metadata.changes.staff_asc_id.from) || 'Unknown' : undefined,
            toName: metadata.changes.staff_asc_id.to ? staffMap.get(metadata.changes.staff_asc_id.to) || 'Unknown' : undefined,
          };
        }
        if (metadata.changes?.staff_ae_id) {
          metadata.changes.staff_ae_id = {
            ...metadata.changes.staff_ae_id,
            fromName: metadata.changes.staff_ae_id.from ? staffMap.get(metadata.changes.staff_ae_id.from) || 'Unknown' : undefined,
            toName: metadata.changes.staff_ae_id.to ? staffMap.get(metadata.changes.staff_ae_id.to) || 'Unknown' : undefined,
          };
        }

        return {
          id: a.id,
          activity_type: a.activity_type,
          description: a.description,
          metadata,
          created_at: a.created_at,
          created_by_name: a.profile?.full_name || a.profile?.email || null,
          source_type: metadata.source || 'manual',
        } as PropertyChange;
      }) || [];
    },
    enabled: !!contactId,
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
  };
}
