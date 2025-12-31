import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContact, useUpdateContact } from '@/hooks/useContacts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactSidebar } from '@/components/contacts/ContactSidebar';
import { ContactActivityFeed } from '@/components/contacts/ContactActivityFeed';
import { ContactSummaryPanel } from '@/components/contacts/ContactSummaryPanel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { contact, isLoading } = useContact(contactId || '');
  const updateContact = useUpdateContact();
  const [selectedTab, setSelectedTab] = useState('contact');
  const [summaryOpen, setSummaryOpen] = useState(false);

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
    <div className="h-[calc(100vh-56px)] flex overflow-hidden">
      {/* Left Sidebar - Contact Info */}
      <div className="w-[400px] border-r overflow-y-auto flex-shrink-0 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]">
        <ContactSidebar 
          contact={contact} 
          onBack={() => navigate('/contacts')} 
          onSelectTab={setSelectedTab}
        />
      </div>

      {/* Center - Tabs */}
      <div className="flex-1 min-w-[400px] overflow-hidden flex flex-col">
        <ContactActivityFeed 
          contactId={contact.id} 
          contactEmail={contact.email}
          contactName={`${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email}
          contactImprintId={contact.imprint_id}
          assignedAscId={contact.assigned_asc}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          summaryButton={
            <div className="2xl:hidden">
              <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <PanelRightOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Summary</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[350px] sm:w-[400px] p-0 overflow-y-auto">
                  <ContactSummaryPanel contact={contact} />
                </SheetContent>
              </Sheet>
            </div>
          }
        />
      </div>

      {/* Right Sidebar - Summary - visible on 2xl screens */}
      <div className="w-[320px] border-l overflow-y-auto flex-shrink-0 hidden 2xl:block shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.1)]">
        <ContactSummaryPanel contact={contact} />
      </div>
    </div>
  );
}