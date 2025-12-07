import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContact } from '@/hooks/useContacts';
import { ContactInfoPanel } from '@/components/contacts/ContactInfoPanel';
import { CommunicationPanel } from '@/components/contacts/CommunicationPanel';
import { ActivityLogPanel } from '@/components/contacts/ActivityLogPanel';

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

  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="text-muted-foreground text-sm">{contact.email}</p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6">
        {/* Left: Contact Info */}
        <ContactInfoPanel contact={contact} />

        {/* Center: Communication */}
        <CommunicationPanel contactId={contact.id} />

        {/* Right: Activity Log */}
        <ActivityLogPanel contactId={contact.id} />
      </div>
    </div>
  );
}
