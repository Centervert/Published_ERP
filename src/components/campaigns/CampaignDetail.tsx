import { useState } from 'react';
import { Campaign, useCampaignStats, useCampaigns } from '@/hooks/useCampaigns';
import { useLists } from '@/hooks/useContacts';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  Search,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

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
  const { templates } = useTemplates();
  const { sendCampaign, updateCampaign } = useCampaigns();
  
  // Edit dialogs
  const [editRecipientsOpen, setEditRecipientsOpen] = useState(false);
  const [editFromOpen, setEditFromOpen] = useState(false);
  const [editSubjectOpen, setEditSubjectOpen] = useState(false);
  const [editContentOpen, setEditContentOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  
  // Form states
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [fromName, setFromName] = useState(campaign.from_name);
  const [fromEmailOption, setFromEmailOption] = useState(campaign.from_email);
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [replyToEmail, setReplyToEmail] = useState(campaign.reply_to_email || '');
  const [subject, setSubject] = useState(campaign.subject);
  const [htmlContent, setHtmlContent] = useState(campaign.html_content);
  const [templateId, setTemplateId] = useState<string>('');

  const fromEmailOptions = [
    { value: 'xulon@news.authorservices.com', label: 'Xulon' },
    { value: 'millcity@news.authorservices.com', label: 'MillCity' },
    { value: 'lhp@news.authorservices.com', label: 'LHP' },
    { value: 'deals@news.authorservices.com', label: 'Deals' },
    { value: 'custom', label: 'Custom Email' },
  ];

  const fromEmail = fromEmailOption === 'custom' ? customFromEmail : fromEmailOption;

  // Check completion status
  const hasRecipients = true; // Always has recipients (all contacts or specific lists)
  const hasFrom = !!campaign.from_name && !!campaign.from_email;
  const hasSubject = !!campaign.subject;
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
    setEditFromOpen(false);
  };

  const handleUpdateSubject = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      subject,
    });
    setEditSubjectOpen(false);
  };

  const handleUpdateContent = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      html_content: htmlContent,
    });
    setEditContentOpen(false);
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
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <button className="text-sm text-primary hover:underline">Edit name</button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button 
            size="sm" 
            onClick={() => setSendDialogOpen(true)}
            disabled={!isReadyToSend}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Checklist Section */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="divide-y p-0">
              {/* To (Recipients) */}
              <div className="flex items-start justify-between p-6">
                <div className="flex gap-4">
                  <div className="mt-0.5">
                    {hasRecipients ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">To</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      All active contacts
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your 'To' field is personalized with *|FNAME|*.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditRecipientsOpen(true)}
                >
                  Edit recipients
                </Button>
              </div>

              {/* From */}
              <div className="flex items-start justify-between p-6">
                <div className="flex gap-4">
                  <div className="mt-0.5">
                    {hasFrom ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">From</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {campaign.from_name} • {campaign.from_email}
                    </p>
                    {campaign.reply_to_email && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Replies go to: {campaign.reply_to_email}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditFromOpen(true)}
                >
                  Edit from
                </Button>
              </div>

              {/* Subject */}
              <div className="flex items-start justify-between p-6">
                <div className="flex gap-4">
                  <div className="mt-0.5">
                    {hasSubject ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Subject</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {campaign.subject || 'No subject set'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditSubjectOpen(true)}
                >
                  Edit subject
                </Button>
              </div>

              {/* Content */}
              <div className="flex items-start justify-between p-6">
                <div className="flex gap-4">
                  <div className="mt-0.5">
                    {hasContent ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Content</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasContent ? 'Email content ready' : 'No content added yet'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditContentOpen(true)}
                >
                  Edit design
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Preview Section */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="flex items-center justify-end gap-4 mb-4">
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Search className="h-4 w-4" />
                Preview
              </button>
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Send a Test Email
              </button>
            </div>
            <Card className="overflow-hidden">
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

      {/* Edit Recipients Dialog */}
      <Dialog open={editRecipientsOpen} onOpenChange={setEditRecipientsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recipients</DialogTitle>
            <DialogDescription>
              Choose who will receive this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="all-contacts-edit"
                  checked={selectedListIds.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedListIds([]);
                  }}
                />
                <label htmlFor="all-contacts-edit" className="text-sm font-medium">
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
                  <label htmlFor={`list-${list.id}`} className="text-sm font-medium">
                    {list.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecipientsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setEditRecipientsOpen(false)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit From Dialog */}
      <Dialog open={editFromOpen} onOpenChange={setEditFromOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit From</DialogTitle>
            <DialogDescription>
              Set the sender name and email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="from-name-edit">From Name</Label>
              <Input
                id="from-name-edit"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Your Company"
              />
            </div>
            <div className="space-y-2">
              <Label>From Email</Label>
              <Select value={fromEmailOption} onValueChange={setFromEmailOption}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender email" />
                </SelectTrigger>
                <SelectContent>
                  {fromEmailOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} {option.value !== 'custom' && `(${option.value})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromEmailOption === 'custom' && (
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={customFromEmail}
                  onChange={(e) => setCustomFromEmail(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-to-edit">Reply-To Email (optional)</Label>
              <Input
                id="reply-to-edit"
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                placeholder="replies@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFromOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFrom} disabled={updateCampaign.isPending}>
              {updateCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={editSubjectOpen} onOpenChange={setEditSubjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Set the email subject line.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-edit">Subject Line</Label>
              <Input
                id="subject-edit"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your email subject"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubject} disabled={updateCampaign.isPending}>
              {updateCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={editContentOpen} onOpenChange={setEditContentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Edit your email content or select a template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select value={templateId} onValueChange={(v) => {
                setTemplateId(v);
                const template = templates.find(t => t.id === v);
                if (template) {
                  setHtmlContent(template.html_content);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="html-content-edit">Email Content (HTML)</Label>
              <Textarea
                id="html-content-edit"
                className="min-h-[300px] font-mono text-sm"
                placeholder="Paste your HTML email content here..."
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContent} disabled={updateCampaign.isPending}>
              {updateCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
