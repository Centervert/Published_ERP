import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EmailQualityFilter = 'validated_only' | 'include_unvalidated' | 'include_risky';

export interface RecipientHealthCounts {
  // Per list/imprint
  byList: Record<string, { sendable: number; excluded: number; notValidated: number }>;
  byImprint: Record<string, { sendable: number; excluded: number; notValidated: number }>;
  
  // Totals
  total: {
    sendable: number;      // deliverable + active + has email
    notValidated: number;  // active but not validated
    excluded: number;      // bounced + unsubscribed + complained + no email + undeliverable
  };
  
  // Breakdown of exclusions
  exclusionReasons: {
    noEmail: number;
    bounced: number;
    unsubscribed: number;
    complained: number;
    undeliverable: number;
  };
}

export function useRecipientHealthCounts() {
  return useQuery({
    queryKey: ['recipient-health-counts'],
    queryFn: async (): Promise<RecipientHealthCounts> => {
      // Fetch all contacts with relevant fields
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, email, status, email_validation_result, email_validation_risk, imprint_id');
      
      if (error) throw error;
      
      // Fetch all list memberships
      const { data: contactLists, error: listError } = await supabase
        .from('contact_lists')
        .select('contact_id, list_id');
      
      if (listError) throw listError;
      
      // Create contact lookup by id
      const contactById = new Map(contacts?.map(c => [c.id, c]) || []);
      
      // Create list membership map
      const listMemberships = new Map<string, Set<string>>();
      contactLists?.forEach(cl => {
        if (!listMemberships.has(cl.list_id)) {
          listMemberships.set(cl.list_id, new Set());
        }
        listMemberships.get(cl.list_id)!.add(cl.contact_id);
      });
      
      // Initialize counts
      const result: RecipientHealthCounts = {
        byList: {},
        byImprint: {},
        total: { sendable: 0, notValidated: 0, excluded: 0 },
        exclusionReasons: { noEmail: 0, bounced: 0, unsubscribed: 0, complained: 0, undeliverable: 0 },
      };
      
      // Helper to categorize a contact
      const categorizeContact = (contact: typeof contacts[0]) => {
        // Check exclusion reasons first
        if (!contact.email || contact.email.trim() === '') {
          return { category: 'excluded', reason: 'noEmail' as const };
        }
        if (contact.status === 'bounced') {
          return { category: 'excluded', reason: 'bounced' as const };
        }
        if (contact.status === 'unsubscribed') {
          return { category: 'excluded', reason: 'unsubscribed' as const };
        }
        if (contact.status === 'complained') {
          return { category: 'excluded', reason: 'complained' as const };
        }
        if (contact.email_validation_result === 'undeliverable') {
          return { category: 'excluded', reason: 'undeliverable' as const };
        }
        
        // Active contact with email
        if (contact.status !== 'active') {
          return { category: 'excluded', reason: 'noEmail' as const }; // catch-all for non-active
        }
        
        // Check validation status
        if (contact.email_validation_result === 'deliverable') {
          return { category: 'sendable', reason: null };
        }
        
        // Not validated or risky
        return { category: 'notValidated', reason: null };
      };
      
      // Process each contact for totals
      contacts?.forEach(contact => {
        const { category, reason } = categorizeContact(contact);
        
        if (category === 'sendable') {
          result.total.sendable++;
        } else if (category === 'notValidated') {
          result.total.notValidated++;
        } else if (category === 'excluded' && reason) {
          result.total.excluded++;
          result.exclusionReasons[reason]++;
        }
      });
      
      // Process by imprint
      const imprintIds = new Set(contacts?.map(c => c.imprint_id).filter(Boolean) as string[]);
      imprintIds.forEach(imprintId => {
        const imprintContacts = contacts?.filter(c => c.imprint_id === imprintId) || [];
        let sendable = 0, excluded = 0, notValidated = 0;
        
        imprintContacts.forEach(contact => {
          const { category } = categorizeContact(contact);
          if (category === 'sendable') sendable++;
          else if (category === 'notValidated') notValidated++;
          else excluded++;
        });
        
        result.byImprint[imprintId] = { sendable, excluded, notValidated };
      });
      
      // Process by list
      listMemberships.forEach((contactIds, listId) => {
        let sendable = 0, excluded = 0, notValidated = 0;
        
        contactIds.forEach(contactId => {
          const contact = contactById.get(contactId);
          if (!contact) return;
          
          const { category } = categorizeContact(contact);
          if (category === 'sendable') sendable++;
          else if (category === 'notValidated') notValidated++;
          else excluded++;
        });
        
        result.byList[listId] = { sendable, excluded, notValidated };
      });
      
      return result;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Helper to calculate sendable count based on quality filter
export function getSendableCount(
  counts: { sendable: number; notValidated: number; excluded: number },
  filter: EmailQualityFilter
): number {
  switch (filter) {
    case 'validated_only':
      return counts.sendable;
    case 'include_unvalidated':
      return counts.sendable + counts.notValidated;
    case 'include_risky':
      return counts.sendable + counts.notValidated; // Same for now, could add risky contacts
    default:
      return counts.sendable;
  }
}
