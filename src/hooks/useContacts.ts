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
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
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
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
    },
  });

  const bulkCreateContacts = useMutation({
    mutationFn: async (contacts: { email: string; first_name?: string; last_name?: string }[]) => {
      const contactsWithUser = contacts.map(c => ({
        email: c.email,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('contacts')
        .upsert(contactsWithUser, { onConflict: 'email', ignoreDuplicates: true })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: `Imported ${data?.length || 0} contacts` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing contacts', description: error.message, variant: 'destructive' });
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
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { imprint, contact_links, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('contacts')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity for the update
      await supabase.from('contact_activity').insert({
        contact_id: id,
        activity_type: 'contact_updated',
        description: 'Contact information updated',
        metadata: { fields: Object.keys(cleanUpdates) },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['contact-activity', variables.id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating contact', description: error.message, variant: 'destructive' });
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
      await supabase.from('contact_activity').insert({
        contact_id: contactId,
        activity_type: 'link_added',
        description: `Added ${link.link_type} link`,
        metadata: { url: link.url, label: link.label },
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
      await supabase.from('contact_activity').insert({
        contact_id: contactId,
        activity_type: 'link_removed',
        description: 'Removed a link',
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
      // Fetch CRM activities
      const { data: crmActivities, error: crmError } = await supabase
        .from('contact_activity')
        .select('*')
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
        ...(crmActivities || []).map(a => ({
          id: a.id,
          type: a.activity_type,
          description: a.description,
          metadata: a.metadata,
          created_at: a.created_at,
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
    deleteList,
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
