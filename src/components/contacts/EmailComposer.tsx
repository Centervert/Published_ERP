import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailComposerProps {
  contactEmail: string;
  contactName: string;
  onSend: (data: { subject: string; body: string; from_email?: string }) => Promise<void>;
  isSending?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function EmailComposer({ 
  contactEmail, 
  contactName,
  onSend, 
  isSending,
  expanded,
  onToggleExpand
}: EmailComposerProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState<string>('');

  // Fetch user's connected email accounts
  const { data: emailConnections = [] } = useQuery({
    queryKey: ['user-email-connections', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_email_connections')
        .select('id, email, provider')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;

    await onSend({
      subject: subject.trim(),
      body: body.trim(),
      from_email: fromEmail || undefined,
    });

    // Reset form
    setSubject('');
    setBody('');
  };

  const hasConnectedEmail = emailConnections.length > 0;

  return (
    <div className="border-t bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">New Email</span>
          <span className="text-xs text-muted-foreground">to {contactName}</span>
        </div>
        {onToggleExpand && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <div className={`p-4 space-y-3 ${expanded ? 'min-h-[400px]' : ''}`}>
        {/* From / To Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            {hasConnectedEmail ? (
              <Select value={fromEmail} onValueChange={setFromEmail}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {emailConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.email}>
                      {conn.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-8 px-3 flex items-center text-sm text-muted-foreground bg-muted rounded-md">
                No email connected
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <div className="h-8 px-3 flex items-center text-sm bg-muted rounded-md">
              {contactEmail || 'No email'}
            </div>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="h-8 text-sm"
          />
        </div>

        {/* Body */}
        <div className="space-y-1">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message..."
            className={`resize-none text-sm ${expanded ? 'min-h-[200px]' : 'min-h-[80px]'}`}
          />
        </div>

        {/* Send Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim() || !hasConnectedEmail}
            size="sm"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Email
          </Button>
        </div>

        {!hasConnectedEmail && (
          <p className="text-xs text-muted-foreground text-center">
            Connect your email in My Profile to send emails
          </p>
        )}
      </div>
    </div>
  );
}
