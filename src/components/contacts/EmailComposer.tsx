import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RichTextEditor } from './RichTextEditor';
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
  contactImprintId?: string | null;
  assignedAscId?: string | null;
  onSend: (data: { subject: string; body: string; from_email?: string; reply_to?: string }) => Promise<void>;
  isSending?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function EmailComposer({
  contactEmail, 
  contactName,
  contactImprintId,
  assignedAscId,
  onSend, 
  isSending,
  expanded,
  onToggleExpand
}: EmailComposerProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState<string>('');
  const [routeRepliesToAsc, setRouteRepliesToAsc] = useState(false);
  const [initialized, setInitialized] = useState(false);

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

  // Fetch user's profile for signature
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-full', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, title, phone')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch contact's imprint for signature
  const { data: contactImprint } = useQuery({
    queryKey: ['contact-imprint', contactImprintId],
    queryFn: async () => {
      if (!contactImprintId) return null;
      const { data, error } = await supabase
        .from('imprints')
        .select('name, logo_url, website_url')
        .eq('id', contactImprintId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contactImprintId,
  });

  // Fetch assigned ASC's profile for reply-to option
  const { data: ascProfile } = useQuery({
    queryKey: ['asc-profile', assignedAscId],
    queryFn: async () => {
      if (!assignedAscId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignedAscId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!assignedAscId,
  });

  // Auto-select the first connected email or user's profile email
  useEffect(() => {
    if (!fromEmail) {
      if (emailConnections.length > 0) {
        setFromEmail(emailConnections[0].email);
      } else if (userProfile?.email) {
        setFromEmail(userProfile.email);
      }
    }
  }, [emailConnections, userProfile, fromEmail]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get contact's first name
  const getContactFirstName = () => {
    const firstName = contactName.split(' ')[0];
    return firstName || '';
  };

  // Initialize body with greeting and signature when data is loaded
  useEffect(() => {
    if (!initialized && userProfile) {
      const greeting = getGreeting();
      const firstName = getContactFirstName();
      const greetingLine = firstName ? `${greeting} ${firstName},` : `${greeting},`;
      const signature = buildSignature();
      
      setBody(`<p>${greetingLine}</p><p><br></p><p><br></p>${signature}`);
      setInitialized(true);
    }
  }, [userProfile, contactImprint, initialized, contactName]);

  // Build email signature
  const buildSignature = () => {
    const parts: string[] = [];
    
    // Add separator
    parts.push('<br><br>--<br>');
    
    // Logo (if imprint has one)
    if (contactImprint?.logo_url) {
      parts.push(`<img src="${contactImprint.logo_url}" alt="${contactImprint.name || 'Logo'}" style="max-height: 60px; max-width: 200px; margin-bottom: 8px;"><br>`);
    }
    
    // User's name
    if (userProfile?.full_name) {
      parts.push(`<strong>${userProfile.full_name}</strong><br>`);
    }
    
    // User's title
    if (userProfile?.title) {
      parts.push(`${userProfile.title}<br>`);
    }
    
    // Imprint website
    if (contactImprint?.website_url) {
      parts.push(`<a href="${contactImprint.website_url}">${contactImprint.website_url}</a><br>`);
    }
    
    // User's phone
    if (userProfile?.phone) {
      parts.push(`${userProfile.phone}<br>`);
    }
    
    return parts.join('');
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;

    // Determine the reply-to email
    let replyTo: string | undefined;
    if (routeRepliesToAsc && ascProfile?.email) {
      replyTo = ascProfile.email;
    }
    // If not routing to ASC, don't set reply-to (sender is default)

    await onSend({
      subject: subject.trim(),
      body: body.trim(),
      from_email: fromEmail || undefined,
      reply_to: replyTo,
    });

    // Reset form with new greeting and signature
    const greeting = getGreeting();
    const firstName = getContactFirstName();
    const greetingLine = firstName ? `${greeting} ${firstName},` : `${greeting},`;
    const signature = buildSignature();
    
    setSubject('');
    setBody(`<p>${greetingLine}</p><p><br></p><p><br></p>${signature}`);
  };

  const hasConnectedEmail = emailConnections.length > 0;
  const displayFromEmail = fromEmail || userProfile?.email || user?.email || '';

  // Build email options list
  const emailOptions = [
    ...emailConnections.map((conn) => ({ 
      value: conn.email, 
      label: conn.email,
      connected: true 
    })),
  ];

  // Add user's profile email if not already in connections (case-insensitive check)
  if (userProfile?.email && !emailConnections.some(c => c.email.toLowerCase() === userProfile.email.toLowerCase())) {
    emailOptions.push({ 
      value: userProfile.email, 
      label: `${userProfile.email} (Profile)`,
      connected: false 
    });
  }

  return (
    <div className="border-t">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
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

      <div className={`p-4 pb-8 space-y-3 ${expanded ? 'min-h-[400px]' : ''}`}>
        {/* From / To Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            {emailOptions.length > 0 ? (
              <Select value={fromEmail} onValueChange={setFromEmail}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={displayFromEmail || "Select account..."} />
                </SelectTrigger>
                <SelectContent>
                  {emailOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-8 px-3 flex items-center text-sm bg-muted rounded-md">
                {displayFromEmail || 'No email available'}
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

        {/* Route replies to ASC checkbox - only show if ASC is assigned */}
        {ascProfile?.email && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="route-to-asc" 
              checked={routeRepliesToAsc}
              onCheckedChange={(checked) => setRouteRepliesToAsc(checked === true)}
            />
            <label 
              htmlFor="route-to-asc" 
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Route replies to assigned ASC ({ascProfile.full_name || ascProfile.email})
            </label>
          </div>
        )}

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

        {/* Rich Text Body */}
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Type your message..."
          minHeight={expanded ? '200px' : '100px'}
        />

        {/* Send Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim() || !displayFromEmail}
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

        {!hasConnectedEmail && !userProfile?.email && (
          <p className="text-xs text-muted-foreground text-center">
            Connect your email in My Profile to send emails
          </p>
        )}
      </div>
    </div>
  );
}
