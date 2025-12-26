import { useState, useEffect } from 'react';
import { Campaign, useCampaignStats, useCampaigns } from '@/hooks/useCampaigns';
import { useLists } from '@/hooks/useContacts';
import type { EmailBlock } from '@/types/email-blocks';
import { useImprints } from '@/hooks/useImprints';
import { useRecipientCounts } from '@/hooks/useRecipientCounts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Send, 
  Eye, 
  MousePointer, 
  UserMinus, 
  AlertTriangle, 
  Loader2, 
  Bot,
  CheckCircle2,
  Circle,
  Mail,
  Clock,
  ExternalLink,
  Check,
  ChevronDown,
  Plus,
  X as XIcon,
  Wand2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EmailBuilder } from './EmailBuilder';

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
  onCancelScheduled?: (campaign: Campaign) => Promise<void>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function CampaignDetail({ campaign, onBack, onCancelScheduled }: CampaignDetailProps) {
  const { data: stats, isLoading: statsLoading } = useCampaignStats(campaign.id);
  const { lists } = useLists();
  const { imprints } = useImprints();
  const { imprintCounts, listCounts, totalCount } = useRecipientCounts();
  const { sendCampaign, updateCampaign, scheduleCampaign } = useCampaigns();
  
  // Collapsible section states
  const [toOpen, setToOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [sendTimeOpen, setSendTimeOpen] = useState(false);
  
  // Edit dialogs
  const [emailBuilderOpen, setEmailBuilderOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  
  // Form states
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedImprintIds, setSelectedImprintIds] = useState<string[]>([]);
  // Initialize selectedImprintId from imprints list once loaded
  const [selectedImprintId, setSelectedImprintId] = useState<string>('');
  const [fromName, setFromName] = useState(campaign.from_name);
  const [fromEmail, setFromEmail] = useState(campaign.from_email);
  // Reply-to is disabled until mail forwarding is set up
  // const [replyToEmail, setReplyToEmail] = useState(campaign.reply_to_email || '');
  // const [routeRepliesToAsc, setRouteRepliesToAsc] = useState(false);
  const [subject, setSubject] = useState(campaign.subject);
  
  // Auto-select first imprint if none selected
  useEffect(() => {
    if (!selectedImprintId && imprints.length > 0) {
      // Try to find imprint matching campaign's from_email, otherwise use first
      const matchingImprint = imprints.find(i => i.from_email === campaign.from_email);
      setSelectedImprintId(matchingImprint?.id || imprints[0].id);
    }
  }, [imprints, selectedImprintId, campaign.from_email]);
  const [campaignName, setCampaignName] = useState(campaign.name);
  
  // Send time state
  const [sendTimeOption, setSendTimeOption] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  
  // AI subject generation state
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  // Additional recipients state
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [showAdditionalRecipients, setShowAdditionalRecipients] = useState(false);
  // Handle imprint selection
  const handleImprintChange = (imprintId: string) => {
    setSelectedImprintId(imprintId);
    const imprint = imprints.find(i => i.id === imprintId);
    if (imprint) {
      setFromName(imprint.from_name);
      setFromEmail(imprint.from_email);
      // Reply-to is disabled until mail forwarding is set up
    }
  };

  // Check completion status - use local state for hasFrom so it updates immediately when selecting imprint
  const hasRecipients = true; // Always has recipients (all contacts or specific lists)
  const hasFrom = !!fromName && !!fromEmail;
  const hasSubject = !!campaign.subject || !!subject;
  const hasContent = !!campaign.html_content || (campaign.blocks_json && campaign.blocks_json.length > 0);
  
  // Validate scheduled time is in the future
  const isScheduledTimeValid = () => {
    if (sendTimeOption === 'now') return true;
    if (!scheduledDate || !scheduledTime) return false;
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    return scheduledAt > new Date();
  };
  
  const hasScheduleTime = sendTimeOption === 'now' || (scheduledDate && scheduledTime && isScheduledTimeValid());
  const isReadyToSend = hasRecipients && hasFrom && hasSubject && hasContent && hasScheduleTime;

  // Use human opens for accurate rate calculation
  const openRate = stats && stats.sent > 0 
    ? ((stats.openedHuman / stats.sent) * 100).toFixed(1) 
    : '0';
  const clickRate = stats && stats.openedHuman > 0 
    ? ((stats.clicked / stats.openedHuman) * 100).toFixed(1) 
    : '0';
  const unsubscribeRate = stats && stats.sent > 0 
    ? ((stats.unsubscribed / stats.sent) * 100).toFixed(2) 
    : '0';

  const handleSend = async () => {
    if (sendTimeOption === 'scheduled' && scheduledDate && scheduledTime) {
      // Schedule for later - validate the time is in the future
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      
      if (scheduledAt <= now) {
        toast.error('Scheduled time must be in the future');
        return;
      }
      
      await scheduleCampaign.mutateAsync({
        campaignId: campaign.id,
        listIds: selectedListIds,
        imprintIds: selectedImprintIds.length > 0 ? selectedImprintIds : undefined,
        additionalRecipients: additionalRecipients.length > 0 ? additionalRecipients : undefined,
        scheduledAt,
      });
    } else {
      // Send now
      await sendCampaign.mutateAsync({
        campaignId: campaign.id,
        listIds: selectedListIds,
        imprintIds: selectedImprintIds.length > 0 ? selectedImprintIds : undefined,
        additionalRecipients: additionalRecipients.length > 0 ? additionalRecipients : undefined,
        // routeRepliesToAsc is disabled until mail forwarding is set up
      });
    }
    setSendDialogOpen(false);
    onBack();
  };

  const handleAddRecipient = () => {
    const email = newRecipientEmail.trim().toLowerCase();
    if (email && email.includes('@') && !additionalRecipients.includes(email)) {
      setAdditionalRecipients([...additionalRecipients, email]);
      setNewRecipientEmail('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setAdditionalRecipients(additionalRecipients.filter(e => e !== email));
  };

  const handleUpdateFrom = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      from_name: fromName,
      from_email: fromEmail,
      // Reply-to is disabled until mail forwarding is set up
      reply_to_email: undefined,
    });
    setFromOpen(false);
  };

  const handleUpdateSubject = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      subject,
    });
  };

  const handleGenerateSubject = async () => {
    // Get description from existing content (blocks or HTML)
    let contentDescription = '';
    if (campaign.blocks_json && Array.isArray(campaign.blocks_json)) {
      contentDescription = (campaign.blocks_json as EmailBlock[])
        .filter((block): block is EmailBlock & { content?: string } => 
          'content' in block && typeof block.content === 'string'
        )
        .map(block => block.content)
        .join(' ')
        .slice(0, 500);
    }
    
    if (!contentDescription && campaign.html_content) {
      // Extract text from HTML
      contentDescription = campaign.html_content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
    }
    
    if (!contentDescription) {
      toast.error('Generate email content first to create a subject line');
      return;
    }
    
    setIsGeneratingSubject(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-subject', {
        body: { 
          emailType: 'general',
          description: contentDescription, 
          tone: 'professional' 
        }
      });
      
      if (error) throw error;
      
      if (data?.subject) {
        setSubject(data.subject);
        // Auto-save the subject
        await updateCampaign.mutateAsync({
          id: campaign.id,
          subject: data.subject,
        });
        toast.success('Subject generated!');
      }
    } catch (error) {
      console.error('Error generating subject:', error);
      toast.error('Failed to generate subject. Please try again.');
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  const handleUpdateName = async () => {
    if (!campaignName.trim()) return;
    await updateCampaign.mutateAsync({
      id: campaign.id,
      name: campaignName.trim(),
    });
    setIsEditingName(false);
  };

  const handleSaveContent = async (html: string, blocks: EmailBlock[]) => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      html_content: html,
      blocks_json: blocks.length > 0 ? blocks : undefined,
    });
    
    // Auto-generate subject if empty after first content creation
    if (!subject.trim() && !campaign.subject) {
      // Extract content description from blocks
      let contentDescription = '';
      if (blocks.length > 0) {
        contentDescription = blocks
          .filter((block): block is EmailBlock & { content?: string } => 
            'content' in block && typeof block.content === 'string'
          )
          .map(block => block.content)
          .join(' ')
          .slice(0, 500);
      }
      
      if (!contentDescription && html) {
        contentDescription = html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500);
      }
      
      if (contentDescription) {
        setIsGeneratingSubject(true);
        try {
          const { data, error } = await supabase.functions.invoke('generate-subject', {
            body: { 
              emailType: 'general',
              description: contentDescription, 
              tone: 'professional' 
            }
          });
          
          if (!error && data?.subject) {
            setSubject(data.subject);
            await updateCampaign.mutateAsync({
              id: campaign.id,
              subject: data.subject,
            });
            toast.success('Subject line auto-generated!');
          }
        } catch (error) {
          console.error('Error auto-generating subject:', error);
        } finally {
          setIsGeneratingSubject(false);
        }
      }
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim() || !campaign.html_content) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingTestEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to: testEmailAddress.trim(),
          subject: subject || campaign.subject || 'Test Email',
          html_content: campaign.html_content,
          from_name: fromName || campaign.from_name,
          from_email: fromEmail || campaign.from_email,
        },
      });

      if (error) throw error;

      toast.success(`Test email sent to ${testEmailAddress}`);
      setTestEmailOpen(false);
      setTestEmailAddress('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // For scheduled campaigns, show countdown view with cancel option
  if (campaign.status === 'scheduled' && campaign.scheduled_at) {
    const scheduledTime = new Date(campaign.scheduled_at);
    const now = new Date();
    const timeUntilSend = scheduledTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilSend / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntilSend % (1000 * 60 * 60)) / (1000 * 60));
    const isPast = timeUntilSend <= 0;

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
              <Badge variant="secondary" className={statusColors[campaign.status]}>
                Scheduled
              </Badge>
            </div>
            <p className="text-muted-foreground">{campaign.subject}</p>
          </div>
          {onCancelScheduled && (
            <Button 
              variant="destructive" 
              onClick={() => onCancelScheduled(campaign)}
            >
              <XIcon className="mr-2 h-4 w-4" />
              Cancel Schedule
            </Button>
          )}
        </div>

        {/* Countdown Card */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                    {isPast ? 'Sending soon...' : `Sending in ${hoursUntil}h ${minutesUntil}m`}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400">
                    Scheduled for {format(scheduledTime, 'EEEE, MMMM d, yyyy')} at {format(scheduledTime, 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span>{campaign.from_name} &lt;{campaign.from_email}&gt;</span>
              </div>
              {campaign.reply_to_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reply-To</span>
                  <span>{campaign.reply_to_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject</span>
                <span className="text-right max-w-[250px] truncate">{campaign.subject}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className={statusColors['scheduled']}>
                  Waiting to send
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled</span>
                <span>{format(scheduledTime, 'MMM d, yyyy h:mm a')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Preview */}
        {campaign.html_content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={campaign.html_content}
                  className="w-full h-[500px] border-0"
                  title="Email Preview"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel Info */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Need to make changes?</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Click "Cancel Schedule" above to return this campaign to draft status. You can then edit and reschedule it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For sent campaigns, show analytics view
  if (campaign.status === 'sent') {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
              <Badge variant="secondary" className={statusColors[campaign.status]}>
                Published
              </Badge>
            </div>
            <p className="text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span>{campaign.from_name} &lt;{campaign.from_email}&gt;</span>
              </div>
              {campaign.reply_to_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reply-To</span>
                  <span>{campaign.reply_to_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{campaign.sent_at ? format(new Date(campaign.sent_at), 'MMM d, yyyy h:mm a') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients</span>
                <span>{campaign.total_recipients}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{openRate}%</div>
                    <div className="text-xs text-muted-foreground">Open Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{clickRate}%</div>
                    <div className="text-xs text-muted-foreground">Click Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{unsubscribeRate}%</div>
                    <div className="text-xs text-muted-foreground">Unsub Rate</div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sent</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.sent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Delivered</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.delivered}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Opened</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.openedHuman}</div>
                {stats.opened !== stats.openedHuman && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    <span>+{stats.opened - stats.openedHuman} bot</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Clicked</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.clicked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Bounced</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.bounced}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Unsubscribed</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.unsubscribed}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Preview */}
        {campaign.html_content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={campaign.html_content}
                  className="w-full h-[500px] border-0"
                  title="Email Preview"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // For draft campaigns, show builder/checklist view
  return (
    <div className="max-w-6xl">
      {/* Status Banner */}
      <div className={`rounded-lg p-4 mb-6 ${isReadyToSend ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'}`}>
        <div className="flex items-center gap-2">
          {isReadyToSend ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-800 dark:text-emerald-300">It's go time! Your email is ready to send.</span>
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-amber-800 dark:text-amber-300">Complete all items below to send your campaign.</span>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          {/* Campaign Name as Hero - Clickable to Edit */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="text-3xl font-semibold h-12 px-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateName();
                  if (e.key === 'Escape') {
                    setCampaignName(campaign.name);
                    setIsEditingName(false);
                  }
                }}
                onBlur={handleUpdateName}
              />
            </div>
          ) : (
            <h1 
              className="text-3xl font-semibold tracking-tight mb-2 cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => setIsEditingName(true)}
              title="Click to edit name"
            >
              {campaign.name || 'Untitled Campaign'}
            </h1>
          )}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Draft
            </Badge>
            <span className="text-sm text-muted-foreground">
              {campaign.subject || 'No subject set'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            Finish later
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                disabled={!isReadyToSend}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                Schedule
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSendDialogOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAdditionalRecipients(!showAdditionalRecipients)}>
                <Plus className="mr-2 h-4 w-4" />
                {showAdditionalRecipients ? 'Hide' : 'Add'} Test Recipients
                {additionalRecipients.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{additionalRecipients.length}</Badge>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Additional Recipients Panel */}
      {showAdditionalRecipients && (
        <Card className="mb-6 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">Test Recipients</h4>
                <p className="text-xs text-muted-foreground">
                  Add test emails or additional recipients who will also receive this campaign.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setShowAdditionalRecipients(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mb-3">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRecipient();
                  }
                }}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleAddRecipient}
                disabled={!newRecipientEmail.includes('@')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {additionalRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {additionalRecipients.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Checklist Section */}
        <div className="lg:col-span-3 space-y-2">
          {/* From - FIRST (required before other sections) */}
          <Collapsible open={fromOpen} onOpenChange={setFromOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-start justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex gap-4">
                    <div className="mt-0.5">
                      {hasFrom ? (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">From</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.from_name ? `${campaign.from_name} ` : ''}&lt;{campaign.from_email}&gt;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Edit from</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${fromOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-5 pt-0 border-t">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Imprint</Label>
                      <Select value={selectedImprintId} onValueChange={handleImprintChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an imprint" />
                        </SelectTrigger>
                        <SelectContent>
                          {imprints.map((imprint) => (
                            <SelectItem key={imprint.id} value={imprint.id}>
                              <div className="flex items-center gap-2">
                                {imprint.logo_url ? (
                                  <img src={imprint.logo_url} alt="" className="h-4 w-4 object-contain" />
                                ) : (
                                  <div 
                                    className="h-4 w-4 rounded text-[8px] text-white flex items-center justify-center font-bold"
                                    style={{ backgroundColor: imprint.primary_color }}
                                  >
                                    {imprint.name.charAt(0)}
                                  </div>
                                )}
                                {imprint.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select an imprint to apply its branding to this campaign.
                      </p>
                    </div>
                    
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground">Sender Configuration</Label>
                        <Badge variant="secondary" className="text-xs">Dynamic</Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">From Name:</span>
                            <span className="font-medium text-primary">Personalized per recipient</span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                            <p className="font-medium">Priority order:</p>
                            <ol className="list-decimal list-inside space-y-0.5">
                              <li>Assigned ASC's full name (if contact has an ASC)</li>
                              <li>Contact's imprint name (if assigned to an imprint)</li>
                              <li>Default: "Author Services"</li>
                            </ol>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">From Email:</span>
                          <span className="font-medium">noreply@newauthor.authorservices.com</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reply-To:</span>
                          <span className="font-medium">noreply@newauthor.authorservices.com</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        Custom reply-to addresses will be available once mail forwarding is configured.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleUpdateFrom} disabled={updateCampaign.isPending}>
                    {updateCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Remaining sections - blurred until From is complete */}
          <div className={!hasFrom ? 'opacity-50 blur-[1px] pointer-events-none select-none' : ''}>
            {/* To (Recipients) */}
            <Collapsible open={toOpen} onOpenChange={hasFrom ? setToOpen : undefined}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="flex items-start justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="mt-0.5">
                        {hasRecipients ? (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">To</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          {selectedListIds.length === 0 ? 'All contacts' : `${selectedListIds.length} list(s) selected`}
                          <ExternalLink className="h-3 w-3" />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Edit recipients</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${toOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 pt-0 border-t">
                    <div className="space-y-4 py-4">
                      {/* All Contacts */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-contacts"
                          checked={selectedListIds.length === 0 && selectedImprintIds.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedListIds([]);
                              setSelectedImprintIds([]);
                            }
                          }}
                        />
                        <label htmlFor="all-contacts" className="text-sm font-medium">
                          All Contacts
                          <span className="ml-2 text-muted-foreground">({totalCount.toLocaleString()})</span>
                        </label>
                      </div>

                      {/* By Imprint */}
                      {imprints.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By Imprint</p>
                          {imprints.map((imprint) => (
                            <div key={imprint.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`imprint-${imprint.id}`}
                                checked={selectedImprintIds.includes(imprint.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedImprintIds([...selectedImprintIds, imprint.id]);
                                  } else {
                                    setSelectedImprintIds(selectedImprintIds.filter(id => id !== imprint.id));
                                  }
                                }}
                              />
                              <label htmlFor={`imprint-${imprint.id}`} className="text-sm">
                                {imprint.name}
                                <span className="ml-2 text-muted-foreground">({(imprintCounts[imprint.id] || 0).toLocaleString()})</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* By List */}
                      {lists.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By List</p>
                          {lists.map((list) => (
                            <div key={list.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`list-${list.id}`}
                                checked={selectedListIds.includes(list.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedListIds([...selectedListIds, list.id]);
                                  } else {
                                    setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                                  }
                                }}
                              />
                              <label htmlFor={`list-${list.id}`} className="text-sm">
                                {list.name}
                                <span className="ml-2 text-muted-foreground">({(listCounts[list.id] || 0).toLocaleString()})</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => setToOpen(false)}>Done</Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Send Time */}
            <Collapsible open={sendTimeOpen} onOpenChange={hasFrom ? setSendTimeOpen : undefined}>
              <Card className="overflow-hidden mt-2">
                <CollapsibleTrigger asChild>
                  <div className="flex items-start justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="mt-0.5">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">Send time</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {sendTimeOption === 'now' 
                            ? 'Send immediately' 
                            : scheduledDate && scheduledTime
                              ? `Scheduled for ${format(new Date(`${scheduledDate}T${scheduledTime}`), 'MMM d, yyyy')} at ${format(new Date(`${scheduledDate}T${scheduledTime}`), 'h:mm a')}`
                              : 'Select a date and time'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Edit send time</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${sendTimeOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 pt-0 border-t">
                    <div className="py-4">
                      <RadioGroup value={sendTimeOption} onValueChange={(v) => setSendTimeOption(v as 'now' | 'scheduled')}>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="now" id="send-now" />
                          <Label htmlFor="send-now" className="flex-1 cursor-pointer">
                            <div className="font-medium">Send now</div>
                            <div className="text-sm text-muted-foreground">Send immediately when you click Schedule</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer mt-2">
                          <RadioGroupItem value="scheduled" id="send-later" />
                          <Label htmlFor="send-later" className="flex-1 cursor-pointer">
                            <div className="font-medium">Schedule for later</div>
                            <div className="text-sm text-muted-foreground">Choose a date and time to send</div>
                          </Label>
                        </div>
                      </RadioGroup>
                      
                      {sendTimeOption === 'scheduled' && (
                        <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="schedule-date" className="text-sm font-medium">Date</Label>
                              <Input
                                id="schedule-date"
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="schedule-time" className="text-sm font-medium">Time</Label>
                              <Input
                                id="schedule-time"
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          {scheduledDate && scheduledTime && (
                            <>
                              {new Date(`${scheduledDate}T${scheduledTime}`) <= new Date() ? (
                                <p className="text-sm text-destructive font-medium">
                                  ⚠️ Scheduled time must be in the future
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Will send on {format(new Date(`${scheduledDate}T${scheduledTime}`), 'MMMM d, yyyy')} at {format(new Date(`${scheduledDate}T${scheduledTime}`), 'h:mm a')}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => setSendTimeOpen(false)}>Done</Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Content */}
            <Card className="overflow-hidden mt-2">
              <div className="flex items-start justify-between p-5">
                <div className="flex gap-4">
                  <div className="mt-0.5">
                    {hasContent ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Content</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasContent ? 'Email content ready' : 'No content added yet'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A plain-text version will be automatically included. <button className="text-primary hover:underline">Edit</button>
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => hasFrom && setEmailBuilderOpen(true)}
                  disabled={!hasFrom}
                >
                  Edit design
                </Button>
              </div>
            </Card>

            {/* Subject - After Content */}
            <Card className="overflow-hidden mt-2">
              <div className="flex items-start gap-4 p-5">
                <div className="mt-0.5">
                  {hasSubject ? (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base">Subject</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSubject}
                      disabled={isGeneratingSubject || !hasContent}
                      className="h-7 text-xs"
                    >
                      {isGeneratingSubject ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-1 h-3 w-3" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter your email subject"
                    className="max-w-lg"
                    onBlur={() => {
                      if (subject !== campaign.subject) {
                        handleUpdateSubject();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateSubject();
                      }
                    }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Email Preview Section */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="flex items-center justify-end gap-4 mb-4">
              <button 
                onClick={() => setPreviewOpen(true)}
                disabled={!campaign.html_content}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button 
                onClick={() => setTestEmailOpen(true)}
                disabled={!campaign.html_content}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4" />
                Send a Test Email
              </button>
            </div>
            <Card className="overflow-hidden border-2">
              <CardContent className="p-0">
                {campaign.html_content ? (
                  <div className="overflow-hidden" style={{ height: '500px' }}>
                    <iframe
                      srcDoc={campaign.html_content}
                      className="border-0 origin-top-left"
                      title="Email Preview"
                      style={{
                        width: '600px',
                        height: '833px',
                        transform: 'scale(0.6)',
                        transformOrigin: 'top left',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center p-6 bg-muted/30">
                    <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      Add content to preview your email
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Email Builder Sheet */}
      <EmailBuilder
        open={emailBuilderOpen}
        onOpenChange={setEmailBuilderOpen}
        imprint={imprints.find(i => i.id === selectedImprintId) || null}
        initialHtml={campaign.html_content}
        initialBlocks={campaign.blocks_json || undefined}
        onSave={handleSaveContent}
      />

      {/* Send Campaign Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Campaign</DialogTitle>
            <DialogDescription>
              Ready to send "{campaign.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Confirm Recipients</Label>
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="send-all-contacts"
                    checked={selectedListIds.length === 0 && selectedImprintIds.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedListIds([]);
                        setSelectedImprintIds([]);
                      }
                    }}
                  />
                  <label htmlFor="send-all-contacts" className="text-sm font-medium">
                    All Contacts
                  </label>
                </div>

                {/* By Imprint */}
                {imprints.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By Imprint</p>
                    {imprints.map((imprint) => (
                      <div key={imprint.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`send-imprint-${imprint.id}`}
                          checked={selectedImprintIds.includes(imprint.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedImprintIds([...selectedImprintIds, imprint.id]);
                            } else {
                              setSelectedImprintIds(selectedImprintIds.filter(id => id !== imprint.id));
                            }
                          }}
                        />
                        <label htmlFor={`send-imprint-${imprint.id}`} className="text-sm font-medium">
                          {imprint.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* By List */}
                {lists.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By List</p>
                    {lists.map((list) => (
                      <div key={list.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`send-list-${list.id}`}
                          checked={selectedListIds.includes(list.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedListIds([...selectedListIds, list.id]);
                            } else {
                              setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                            }
                          }}
                        />
                        <label htmlFor={`send-list-${list.id}`} className="text-sm font-medium">
                          {list.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedListIds.length === 0 && selectedImprintIds.length === 0
                  ? 'Sending to all active contacts'
                  : `Sending to ${selectedImprintIds.length > 0 ? `${selectedImprintIds.length} imprint(s)` : ''}${selectedImprintIds.length > 0 && selectedListIds.length > 0 ? ' and ' : ''}${selectedListIds.length > 0 ? `${selectedListIds.length} list(s)` : ''}`}
                {additionalRecipients.length > 0 && ` + ${additionalRecipients.length} additional recipient(s)`}
              </p>
            </div>

            {/* Test Recipients Section */}
            <div className="space-y-2 border-t pt-4">
              <Label>Test Recipients (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Add test emails who will also receive this campaign.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={handleAddRecipient}
                  disabled={!newRecipientEmail.includes('@')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {additionalRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {additionalRecipients.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sendCampaign.isPending}>
              {sendCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            {campaign.html_content && (
              <iframe
                srcDoc={campaign.html_content}
                className="w-full border-0"
                style={{ minHeight: '600px', height: 'auto' }}
                title="Full Email Preview"
                onLoad={(e) => {
                  const iframe = e.target as HTMLIFrameElement;
                  if (iframe.contentDocument) {
                    const height = iframe.contentDocument.body.scrollHeight;
                    iframe.style.height = `${Math.max(height, 600)}px`;
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this email to verify how it looks in an inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="Enter email address"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendTestEmail();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                The subject line will be prefixed with [TEST]
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendTestEmail} 
              disabled={isSendingTestEmail || !testEmailAddress.trim()}
            >
              {isSendingTestEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
