import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail, Phone } from 'lucide-react';

interface CommunicationPanelProps {
  contactId: string;
}

export function CommunicationPanel({ contactId }: CommunicationPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Communication</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="text-xs">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="text-xs">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Personal Email</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Coming soon - Send and receive personal emails directly with this contact via SMTP integration.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="mt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">SMS Messaging</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Coming soon - Send and receive SMS messages with this contact.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Internal Notes</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Coming soon - Add timestamped notes about conversations and interactions with this contact.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
