import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContactCommunications } from '@/hooks/useContactCommunications';
import { CommunicationTimeline } from './CommunicationTimeline';
import { LogCallDialog } from './LogCallDialog';
import { EmailComposer } from './EmailComposer';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommunicationHubProps {
  contactId: string;
  contactEmail: string;
  contactName: string;
}

export function CommunicationHub({ contactId, contactEmail, contactName }: CommunicationHubProps) {
  const { communications, isLoading, logCall, sendEmail } = useContactCommunications(contactId);
  const [showLogCallDialog, setShowLogCallDialog] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerTab, setComposerTab] = useState<'email' | 'sms' | 'internal'>('email');
  const [filterType, setFilterType] = useState<'all' | 'email' | 'call' | 'sms'>('all');

  const handleLogCall = async (data: Parameters<typeof logCall.mutateAsync>[0]) => {
    try {
      await logCall.mutateAsync(data);
      toast.success('Call logged successfully');
    } catch (error) {
      toast.error('Failed to log call');
    }
  };

  const handleSendEmail = async (data: { subject: string; body: string; from_email?: string }) => {
    try {
      await sendEmail.mutateAsync({
        to: contactEmail,
        subject: data.subject,
        body: data.body,
      });
      toast.success('Email sent successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      toast.error(message);
    }
  };

  // Filter communications
  const filteredCommunications = filterType === 'all' 
    ? communications 
    : communications.filter(c => c.type === filterType);

  return (
    <div className="h-full flex flex-col">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowLogCallDialog(true)}
          >
            <Phone className="h-4 w-4" />
            Log Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setComposerTab('email')}
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled
            title="Coming soon"
          >
            <MessageSquare className="h-4 w-4" />
            SMS
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterType('all')}>
              All Communications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('email')}>
              <Mail className="h-4 w-4 mr-2" /> Emails Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('call')}>
              <Phone className="h-4 w-4 mr-2" /> Calls Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('sms')}>
              <MessageSquare className="h-4 w-4 mr-2" /> SMS Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Communication Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <CommunicationTimeline 
          communications={filteredCommunications} 
          isLoading={isLoading} 
        />
      </div>

      {/* Bottom Composer Area */}
      <div className="mt-auto">
        <Tabs value={composerTab} onValueChange={(v) => setComposerTab(v as typeof composerTab)}>
          <div className="border-t bg-muted/30">
            <TabsList className="h-10 w-full justify-start gap-0 bg-transparent rounded-none p-0 border-b">
              <TabsTrigger 
                value="email"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger 
                value="sms"
                disabled
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </TabsTrigger>
              <TabsTrigger 
                value="internal"
                disabled
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
              >
                Internal Note
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="email" className="mt-0">
            <EmailComposer
              contactEmail={contactEmail}
              contactName={contactName}
              onSend={handleSendEmail}
              isSending={sendEmail.isPending}
              expanded={composerExpanded}
              onToggleExpand={() => setComposerExpanded(!composerExpanded)}
            />
          </TabsContent>

          <TabsContent value="sms" className="mt-0">
            <div className="p-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">SMS coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="internal" className="mt-0">
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Internal notes coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Log Call Dialog */}
      <LogCallDialog
        open={showLogCallDialog}
        onOpenChange={setShowLogCallDialog}
        onLogCall={handleLogCall}
        isLogging={logCall.isPending}
      />
    </div>
  );
}
