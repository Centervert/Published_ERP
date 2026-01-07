import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ContactLink {
  id?: string;
  contact_id?: string;
  link_type: string;
  url: string;
  label?: string;
}

export type LeadSource = 'website_landing_page' | 'manual_entry' | 'marketing_partner' | 'import';

export interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  timezone: string | null;
  contact_type: string | null;
  imprint_id: string | null;
  notes: string | null;
  status: string;
  assigned_asc: string | null;
  assigned_ae: string | null;
  assigned_asc_text: string | null;
  assigned_ae_text: string | null;
  staff_asc_id: string | null;
  staff_ae_id: string | null;
  lead_source: LeadSource | null;
  lead_source_detail: string | null;
  created_at: string;
  updated_at: string;
  // Email validation fields
  email_validation_result: string | null;
  email_validation_risk: string | null;
  email_validation_reasons: string[] | null;
  email_is_disposable: boolean | null;
  email_is_role_address: boolean | null;
  email_did_you_mean: string | null;
  email_validated_at: string | null;
  imprint?: {
    id: string;
    name: string;
  } | null;
  contact_links?: ContactLink[];
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          imprint:imprints(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contact[];
    },
  });

  const createContact = useMutation({
    mutationFn: async (contact: {
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      address?: string;
      timezone?: string;
      contact_type?: string;
      imprint_id?: string;
      notes?: string;
      lead_source?: LeadSource;
      lead_source_detail?: string;
      links?: { type: string; url: string; label?: string }[];
    }) => {
      const { links, ...contactData } = contact;
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          email: contactData.email,
          first_name: contactData.first_name || null,
          last_name: contactData.last_name || null,
          phone: contactData.phone || null,
          address: contactData.address || null,
          timezone: contactData.timezone || null,
          contact_type: contactData.contact_type || 'lead',
          imprint_id: contactData.imprint_id || null,
          notes: contactData.notes || null,
          lead_source: contactData.lead_source || 'manual_entry',
          lead_source_detail: contactData.lead_source_detail || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Log activity for contact creation
      if (data) {
        await supabase.from('contact_activity').insert({
          contact_id: data.id,
          activity_type: 'contact_created',
          description: `Contact created: ${contactData.email}`,
          metadata: { first_name: contactData.first_name, last_name: contactData.last_name },
          created_by: user?.id,
        });
      }

      // Insert links if provided
      if (links && links.length > 0 && data) {
        const linksToInsert = links.map(link => ({
          contact_id: data.id,
          link_type: link.type,
          url: link.url,
          label: link.label || null,
        }));

        const { error: linksError } = await supabase
          .from('contact_links')
          .insert(linksToInsert);

        if (linksError) {
          console.error('Error inserting links:', linksError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-paginated'] });
      toast({ title: 'Contact added successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast({ title: 'Contact already exists', description: 'This email is already in your contacts.', variant: 'destructive' });
      } else {
        toast({ title: 'Error adding contact', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      // Remove nested objects before update
      const { imprint, contact_links, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('contacts')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-paginated'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating contact', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-paginated'] });
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
    },
  });

  const bulkCreateContacts = useMutation({
    mutationFn: async (contacts: { 
      email: string; 
      first_name?: string; 
      last_name?: string;
      phone?: string;
      imprint_id?: string;
      assigned_asc?: string;
    }[]) => {
      const contactsWithUser = contacts.map(c => ({
        email: c.email,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        phone: c.phone || null,
        imprint_id: c.imprint_id || null,
        assigned_asc: c.assigned_asc || null,
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('contacts')
        .upsert(contactsWithUser, { onConflict: 'email', ignoreDuplicates: true })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['paginated-contacts'] });
    },
    onError: (error: Error) => {
      console.error('Bulk import error:', error);
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    createContact,
    updateContact,
    deleteContact,
    bulkCreateContacts,
  };
}

// Hook for fetching a single contact with links
export function useContact(contactId: string) {
  const contactQuery = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          imprint:imprints(id, name),
          contact_links(*)
        `)
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!contactId,
  });

  return {
    contact: contactQuery.data,
    isLoading: contactQuery.isLoading,
  };
}

// Standalone hook for updating contacts (can be used without fetching all contacts)
export function useUpdateContact() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      originalData, 
      source = 'manual',
      ...updates 
    }: Partial<Contact> & { 
      id: string; 
      originalData?: Partial<Contact>;
      source?: 'manual' | 'import' | 'webhook' | 'bulk';
    }) => {
      const { imprint, contact_links, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('contacts')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Build changes object showing from -> to for each field
      const changes: Record<string, { from: string; to: string; fromName?: string; toName?: string }> = {};
      
      // Track all relevant fields including new ones
      const fieldsToTrack = [
        'first_name', 'last_name', 'email', 'phone', 'address', 'timezone', 
        'contact_type', 'status', 'imprint_id', 'staff_asc_id', 'staff_ae_id'
      ];
      
      for (const field of fieldsToTrack) {
        if (field in cleanUpdates) {
          const oldValue = originalData?.[field as keyof Contact] ?? '';
          const newValue = cleanUpdates[field] ?? '';
          if (oldValue !== newValue) {
            changes[field] = { from: String(oldValue || ''), to: String(newValue || '') };
          }
        }
      }

      // Track ASC and AE assignment changes separately with profile names (legacy profile-based assignments)
      const assignmentChanges: { field: string; from: string | null; to: string | null; fromName?: string; toName?: string }[] = [];
      
      // Check if ASC changed (profile-based)
      if ('assigned_asc' in cleanUpdates && originalData?.assigned_asc !== cleanUpdates.assigned_asc) {
        assignmentChanges.push({
          field: 'assigned_asc',
          from: originalData?.assigned_asc || null,
          to: cleanUpdates.assigned_asc || null,
        });
      }
      
      // Check if AE changed (profile-based)
      if ('assigned_ae' in cleanUpdates && originalData?.assigned_ae !== cleanUpdates.assigned_ae) {
        assignmentChanges.push({
          field: 'assigned_ae',
          from: originalData?.assigned_ae || null,
          to: cleanUpdates.assigned_ae || null,
        });
      }

      // Fetch profile names for assignment changes
      if (assignmentChanges.length > 0) {
        const profileIds = assignmentChanges
          .flatMap(c => [c.from, c.to])
          .filter((id): id is string => !!id);
        
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', profileIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email]) || []);
          
          for (const change of assignmentChanges) {
            change.fromName = change.from ? profileMap.get(change.from) || 'Unknown' : undefined;
            change.toName = change.to ? profileMap.get(change.to) || 'Unknown' : undefined;
          }
        }
      }

      // Fetch staff names for staff-based field changes
      const staffFieldsChanged = ['staff_asc_id', 'staff_ae_id'].filter(f => f in changes);
      if (staffFieldsChanged.length > 0) {
        const staffIds = staffFieldsChanged
          .flatMap(f => [changes[f].from, changes[f].to])
          .filter((id): id is string => !!id);
        
        if (staffIds.length > 0) {
          const { data: staff } = await supabase
            .from('staff')
            .select('id, full_name')
            .in('id', staffIds);
          
          const staffMap = new Map(staff?.map(s => [s.id, s.full_name]) || []);
          
          for (const field of staffFieldsChanged) {
            if (changes[field].from) {
              changes[field].fromName = staffMap.get(changes[field].from) || 'Unknown';
            }
            if (changes[field].to) {
              changes[field].toName = staffMap.get(changes[field].to) || 'Unknown';
            }
          }
        }
      }

      // Fetch imprint names for imprint_id changes
      if ('imprint_id' in changes) {
        const imprintIds = [changes.imprint_id.from, changes.imprint_id.to].filter((id): id is string => !!id);
        if (imprintIds.length > 0) {
          const { data: imprints } = await supabase
            .from('imprints')
            .select('id, name')
            .in('id', imprintIds);
          
          const imprintMap = new Map(imprints?.map(i => [i.id, i.name]) || []);
          
          if (changes.imprint_id.from) {
            changes.imprint_id.fromName = imprintMap.get(changes.imprint_id.from) || 'Unknown';
          }
          if (changes.imprint_id.to) {
            changes.imprint_id.toName = imprintMap.get(changes.imprint_id.to) || 'Unknown';
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Log regular field changes
      if (Object.keys(changes).length > 0) {
        const changedFields = Object.keys(changes);
        const description = changedFields.length === 1 
          ? `Updated ${changedFields[0].replace(/_/g, ' ')}`
          : `Updated ${changedFields.length} fields`;

        await supabase.from('contact_activity').insert({
          contact_id: id,
          activity_type: 'contact_updated',
          description,
          metadata: { changes, source },
          created_by: user?.id,
        });
      }

      // Log assignment changes separately (legacy profile-based)
      for (const change of assignmentChanges) {
        const fieldLabel = change.field === 'assigned_asc' ? 'A.S.C.' : 'A.E.';
        let description: string;
        
        if (!change.from && change.to) {
          description = `Assigned ${fieldLabel} to ${change.toName}`;
        } else if (change.from && !change.to) {
          description = `Removed ${fieldLabel} assignment (was ${change.fromName})`;
        } else {
          description = `Changed ${fieldLabel} assignment`;
        }

        await supabase.from('contact_activity').insert({
          contact_id: id,
          activity_type: 'assignment_changed',
          description,
          metadata: {
            field: change.field,
            from: change.from,
            to: change.to,
            fromName: change.fromName,
            toName: change.toName,
            source,
          },
          created_by: user?.id,
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['contact-activity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['contact-history', variables.id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating contact', description: error.message, variant: 'destructive' });
    },
  });
}

// Standalone hook for deleting contacts (used when you don't need to fetch all contacts)
export function useDeleteContact() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-paginated'] });
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook for managing contact links
export function useContactLinks(contactId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ['contact-links', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_links')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ContactLink[];
    },
    enabled: !!contactId,
  });

  const addLink = useMutation({
    mutationFn: async (link: { contact_id: string; link_type: string; url: string; label?: string | null }) => {
      const { data, error } = await supabase
        .from('contact_links')
        .insert(link)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('contact_activity').insert({
        contact_id: contactId,
        activity_type: 'link_added',
        description: `Added ${link.link_type} link`,
        metadata: { url: link.url, label: link.label },
        created_by: user?.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-links', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-activity', contactId] });
      toast({ title: 'Link added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding link', description: error.message, variant: 'destructive' });
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('contact_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('contact_activity').insert({
        contact_id: contactId,
        activity_type: 'link_removed',
        description: 'Removed a link',
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-links', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-activity', contactId] });
      toast({ title: 'Link removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing link', description: error.message, variant: 'destructive' });
    },
  });

  return {
    links: linksQuery.data || [],
    isLoading: linksQuery.isLoading,
    addLink,
    deleteLink,
  };
}

// Combined activity from CRM activities and marketing email events
export function useContactActivity(contactId: string) {
  const activityQuery = useQuery({
    queryKey: ['contact-activity', contactId],
    queryFn: async () => {
      // Fetch CRM activities with user profile
      const { data: crmActivities, error: crmError } = await supabase
        .from('contact_activity')
        .select('*, profile:profiles!contact_activity_created_by_fkey(full_name, email)')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      
      if (crmError) throw crmError;

      // Fetch email events (marketing)
      const { data: emailEvents, error: emailError } = await supabase
        .from('email_events')
        .select('*, campaign:campaigns(name)')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      
      if (emailError) throw emailError;

      // Combine and format activities
      const activities = [
        ...(crmActivities || []).map((a: any) => ({
          id: a.id,
          type: a.activity_type,
          description: a.description,
          metadata: a.metadata,
          created_at: a.created_at,
          created_by_name: a.profile?.full_name || a.profile?.email || null,
          source: 'crm' as const,
        })),
        ...(emailEvents || []).map(e => ({
          id: e.id,
          type: e.event_type,
          description: getEmailEventDescription(e.event_type, (e as any).campaign?.name),
          metadata: { campaign_id: e.campaign_id, link_url: e.link_url },
          created_at: e.created_at,
          source: 'marketing' as const,
        })),
      ];

      // Sort by date descending
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return activities;
    },
    enabled: !!contactId,
  });

  return {
    activities: activityQuery.data || [],
    isLoading: activityQuery.isLoading,
  };
}

function getEmailEventDescription(eventType: string, campaignName?: string): string {
  const campaign = campaignName ? ` "${campaignName}"` : '';
  switch (eventType) {
    case 'sent':
      return `Campaign${campaign} was sent`;
    case 'delivered':
      return `Campaign${campaign} was delivered`;
    case 'opened':
      return `Opened campaign${campaign}`;
    case 'clicked':
      return `Clicked a link in campaign${campaign}`;
    case 'bounced':
      return `Campaign${campaign} bounced`;
    case 'unsubscribed':
      return `Unsubscribed from campaign${campaign}`;
    default:
      return `Email event: ${eventType}`;
  }
}

export function useLists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const listsQuery = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as List[];
    },
  });

  const createList = useMutation({
    mutationFn: async (list: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({
          name: list.name,
          description: list.description || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({ title: 'List created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating list', description: error.message, variant: 'destructive' });
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('lists')
        .update({ name, description: description || null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({ title: 'List updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating list', description: error.message, variant: 'destructive' });
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast({ title: 'List deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting list', description: error.message, variant: 'destructive' });
    },
  });

  return {
    lists: listsQuery.data || [],
    isLoading: listsQuery.isLoading,
    createList,
    updateList,
    deleteList,
  };
}

// Hook for managing contacts within a specific list
export function useListContacts(listId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listContactsQuery = useQuery({
    queryKey: ['list-contacts', listId],
    queryFn: async () => {
      if (!listId) return [];
      
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          contact_id,
          added_at,
          contact:contacts(id, email, first_name, last_name)
        `)
        .eq('list_id', listId)
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data.map((item: any) => ({
        ...item.contact,
        added_at: item.added_at,
      }));
    },
    enabled: !!listId,
  });

  const addContactToList = useMutation({
    mutationFn: async ({ listId, contactId }: { listId: string; contactId: string }) => {
      const { error } = await supabase
        .from('contact_lists')
        .insert({ list_id: listId, contact_id: contactId });
      
      if (error) {
        if (error.message.includes('duplicate')) {
          throw new Error('Contact already in this list');
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list-contacts', variables.listId] });
      toast({ title: 'Contact added to list' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeContactFromList = useMutation({
    mutationFn: async ({ listId, contactId }: { listId: string; contactId: string }) => {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('list_id', listId)
        .eq('contact_id', contactId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list-contacts', variables.listId] });
      toast({ title: 'Contact removed from list' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing contact', description: error.message, variant: 'destructive' });
    },
  });

  const bulkAddContactsToList = useMutation({
    mutationFn: async ({ listId, contactIds }: { listId: string; contactIds: string[] }) => {
      const entries = contactIds.map(contactId => ({ list_id: listId, contact_id: contactId }));
      const { error } = await supabase
        .from('contact_lists')
        .upsert(entries, { onConflict: 'list_id,contact_id', ignoreDuplicates: true });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list-contacts', variables.listId] });
      toast({ title: `Added ${variables.contactIds.length} contacts to list` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding contacts', description: error.message, variant: 'destructive' });
    },
  });

  return {
    contacts: listContactsQuery.data || [],
    isLoading: listContactsQuery.isLoading,
    addContactToList,
    removeContactFromList,
    bulkAddContactsToList,
  };
}

export function useTags() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Tag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (tag: { name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: tag.name,
          color: tag.color || '#6B7280',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: 'Tag created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating tag', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({ title: 'Tag deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting tag', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    createTag,
    deleteTag,
  };
}
