import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContact } from '@/hooks/useContacts';
import { ContactSidebar } from '@/components/contacts/ContactSidebar';
import { ContactActivityFeed } from '@/components/contacts/ContactActivityFeed';
import { ContactSummaryPanel } from '@/components/contacts/ContactSummaryPanel';

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { contact, isLoading } = useContact(contactId || '');

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
    <div className="h-[calc(100vh-120px)] flex">
      {/* Left Sidebar - Contact Info */}
      <div className="w-[300px] border-r overflow-y-auto flex-shrink-0">
        <ContactSidebar contact={contact} onBack={() => navigate('/contacts')} />
      </div>

      {/* Center - Activity Feed */}
      <div className="flex-1 overflow-y-auto">
        <ContactActivityFeed 
          contactId={contact.id} 
          assignedAsc={contact.assigned_asc}
          assignedAe={contact.assigned_ae}
        />
      </div>

      {/* Right Sidebar - Summary */}
      <div className="w-[320px] border-l overflow-y-auto flex-shrink-0 hidden xl:block">
        <ContactSummaryPanel contact={contact} />
      </div>
    </div>
  );
}
