import { useState } from 'react';
import { Campaign, useCampaignStats, useCampaigns } from '@/hooks/useCampaigns';
import { useLists } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
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
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { EmailBuilder } from './EmailBuilder';

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function CampaignDetail({ campaign, onBack }: CampaignDetailProps) {
  const { data: stats, isLoading: statsLoading } = useCampaignStats(campaign.id);
  const { lists } = useLists();
  const { imprints } = useImprints();
  const { sendCampaign, updateCampaign } = useCampaigns();
  
  // Collapsible section states
  const [toOpen, setToOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [sendTimeOpen, setSendTimeOpen] = useState(false);
  
  // Edit dialogs
  const [emailBuilderOpen, setEmailBuilderOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Form states
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedImprintId, setSelectedImprintId] = useState<string>('');
  const [fromName, setFromName] = useState(campaign.from_name);
  const [fromEmail, setFromEmail] = useState(campaign.from_email);
  const [replyToEmail, setReplyToEmail] = useState(campaign.reply_to_email || '');
  const [subject, setSubject] = useState(campaign.subject);
  const [campaignName, setCampaignName] = useState(campaign.name);
  
  // Send time state (UI only)
  const [sendTimeOption, setSendTimeOption] = useState<'now' | 'scheduled'>('now');

  // Handle imprint selection
  const handleImprintChange = (imprintId: string) => {
    setSelectedImprintId(imprintId);
    const imprint = imprints.find(i => i.id === imprintId);
    if (imprint) {
      setFromName(imprint.from_name);
      setFromEmail(imprint.from_email);
      setReplyToEmail(imprint.reply_to_email || '');
    }
  };

  // Check completion status - use local state for hasFrom so it updates immediately when selecting imprint
  const hasRecipients = true; // Always has recipients (all contacts or specific lists)
  const hasFrom = !!fromName && !!fromEmail;
  const hasSubject = !!campaign.subject || !!subject;
  const hasContent = !!campaign.html_content;
  const isReadyToSend = hasRecipients && hasFrom && hasSubject && hasContent;

  // Use human opens for accurate rate calculation
  const openRate = stats && stats.sent > 0 
    ? ((stats.openedHuman / stats.sent) * 100).toFixed(1) 
    : '0';
  const clickRate = stats && stats.openedHuman > 0 
    ? ((stats.clicked / stats.openedHuman) * 100).toFixed(1) 
    : '0';

  const handleSend = async () => {
    await sendCampaign.mutateAsync({
      campaignId: campaign.id,
      listIds: selectedListIds,
    });
    setSendDialogOpen(false);
    onBack();
  };

  const handleUpdateFrom = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      from_name: fromName,
      from_email: fromEmail,
      reply_to_email: replyToEmail || undefined,
    });
    setFromOpen(false);
  };

  const handleUpdateSubject = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      subject,
    });
  };

  const handleUpdateName = async () => {
    if (!campaignName.trim()) return;
    await updateCampaign.mutateAsync({
      id: campaign.id,
      name: campaignName.trim(),
    });
    setIsEditingName(false);
  };

  const handleSaveContent = async (html: string) => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      html_content: html,
    });
  };

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
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{openRate}%</div>
                    <div className="text-xs text-muted-foreground">Open Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{clickRate}%</div>
                    <div className="text-xs text-muted-foreground">Click Rate</div>
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
          <Button 
            onClick={() => setSendDialogOpen(true)}
            disabled={!isReadyToSend}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-name">From Name</Label>
                      <Input
                        id="from-name"
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="Your Company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-email">From Email</Label>
                      <Input
                        id="from-email"
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reply-to">Reply-To Email (optional)</Label>
                      <Input
                        id="reply-to"
                        type="email"
                        value={replyToEmail}
                        onChange={(e) => setReplyToEmail(e.target.value)}
                        placeholder="replies@example.com"
                      />
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
                    <div className="space-y-3 py-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-contacts"
                          checked={selectedListIds.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedListIds([]);
                          }}
                        />
                        <label htmlFor="all-contacts" className="text-sm font-medium">
                          All Contacts
                        </label>
                      </div>
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
                          </label>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => setToOpen(false)}>Done</Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

          {/* Subject - Inline Edit */}
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
                  <h3 className="font-semibold text-base mb-2">Subject</h3>
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
                          {sendTimeOption === 'now' ? 'Send immediately' : 'Scheduled for later'}
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
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer opacity-50 mt-2">
                          <RadioGroupItem value="scheduled" id="send-later" disabled />
                          <Label htmlFor="send-later" className="flex-1 cursor-pointer">
                            <div className="font-medium">Schedule for later</div>
                            <div className="text-sm text-muted-foreground">Coming soon</div>
                          </Label>
                        </div>
                      </RadioGroup>
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
          </div>
        </div>

        {/* Email Preview Section */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="flex items-center justify-end gap-4 mb-4">
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                Send a Test Email
              </button>
            </div>
            <Card className="overflow-hidden border-2">
              <CardContent className="p-0">
                {campaign.html_content ? (
                  <iframe
                    srcDoc={campaign.html_content}
                    className="w-full h-[500px] border-0"
                    title="Email Preview"
                  />
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
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="send-all-contacts"
                    checked={selectedListIds.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedListIds([]);
                    }}
                  />
                  <label htmlFor="send-all-contacts" className="text-sm font-medium">
                    All Contacts
                  </label>
                </div>
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
              <p className="text-xs text-muted-foreground">
                {selectedListIds.length === 0
                  ? 'Sending to all active contacts'
                  : `Sending to ${selectedListIds.length} list(s)`}
              </p>
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
    </div>
  );
}
