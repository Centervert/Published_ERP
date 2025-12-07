import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContact, useUpdateContact } from '@/hooks/useContacts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactSidebar } from '@/components/contacts/ContactSidebar';
import { ContactActivityFeed } from '@/components/contacts/ContactActivityFeed';
import { ContactSummaryPanel } from '@/components/contacts/ContactSummaryPanel';

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { contact, isLoading } = useContact(contactId || '');
  const updateContact = useUpdateContact();
  const [selectedTab, setSelectedTab] = useState('contact');

  // Fetch team members for assignment dropdowns
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Get display names for assigned users
  const getAssignedName = (userId: string | null) => {
    if (!userId) return null;
    const member = teamMembers.find(m => m.id === userId);
    return member ? (member.full_name || member.email) : null;
  };

  const handleAssignmentChange = async (field: 'assigned_asc' | 'assigned_ae', value: string | null) => {
    if (!contact) return;
    
    await updateContact.mutateAsync({
      id: contact.id,
      originalData: {
        assigned_asc: contact.assigned_asc,
        assigned_ae: contact.assigned_ae,
      },
      [field]: value,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex -m-6">
      {/* Left Sidebar - Contact Info */}
      <div className="w-[300px] border-r overflow-y-auto flex-shrink-0">
        <ContactSidebar 
          contact={contact} 
          onBack={() => navigate('/contacts')} 
          onSelectTab={setSelectedTab}
        />
      </div>

      {/* Center - Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ContactActivityFeed 
          contactId={contact.id} 
          contactEmail={contact.email}
          contactName={`${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />
      </div>

      {/* Right Sidebar - Summary */}
      <div className="w-[320px] border-l overflow-y-auto flex-shrink-0 hidden xl:block">
        <ContactSummaryPanel contact={contact} />
      </div>
    </div>
  );
}
