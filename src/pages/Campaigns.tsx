import { useState } from 'react';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { useLists } from '@/hooks/useContacts';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Send, Trash2, Loader2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { CampaignDetail } from '@/components/campaigns/CampaignDetail';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function Campaigns() {
  const { campaigns, isLoading, createCampaign, deleteCampaign, sendCampaign } = useCampaigns();
  const { lists } = useLists();
  const { templates } = useTemplates();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState('');

  const handleCreate = async () => {
    const template = templates.find(t => t.id === templateId);
    await createCampaign.mutateAsync({
      name,
      subject: subject || template?.subject || 'No Subject',
      from_name: fromName,
      from_email: fromEmail,
      html_content: htmlContent || template?.html_content || '',
      template_id: templateId || undefined,
    });
    resetForm();
    setCreateDialogOpen(false);
  };

  const handleSend = async () => {
    if (!selectedCampaign) return;
    await sendCampaign.mutateAsync({
      campaignId: selectedCampaign.id,
      listIds: selectedListIds,
    });
    setSendDialogOpen(false);
    setSelectedCampaign(null);
    setSelectedListIds([]);
  };

  const handleDelete = async (campaign: Campaign) => {
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      await deleteCampaign.mutateAsync(campaign.id);
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setFromName('');
    setFromEmail('');
    setTemplateId('');
    setHtmlContent('');
  };

  const openSendDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedListIds([]);
    setSendDialogOpen(true);
  };

  if (viewingCampaign) {
    return (
      <CampaignDetail
        campaign={viewingCampaign}
        onBack={() => setViewingCampaign(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and send email campaigns
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No campaigns yet</p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card 
              key={campaign.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewingCampaign(campaign)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge variant="secondary" className={statusColors[campaign.status]}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardDescription>{campaign.subject}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {campaign.status === 'draft' && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSendDialog(campaign); }}>
                          <Send className="mr-2 h-4 w-4" />
                          Send Campaign
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(campaign); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>From: {campaign.from_name} &lt;{campaign.from_email}&gt;</span>
                  {campaign.sent_at && (
                    <span>Sent: {format(new Date(campaign.sent_at), 'MMM d, yyyy h:mm a')}</span>
                  )}
                  {campaign.total_recipients > 0 && (
                    <span>{campaign.total_recipients} recipients</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Set up your email campaign details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name *</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., March Newsletter"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-name">From Name *</Label>
                <Input
                  id="from-name"
                  placeholder="Your Company"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">From Email *</Label>
                <Input
                  id="from-email"
                  type="email"
                  placeholder="hello@example.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line *</Label>
              <Input
                id="subject"
                placeholder="Your email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select value={templateId} onValueChange={(v) => {
                setTemplateId(v);
                const template = templates.find(t => t.id === v);
                if (template) {
                  setHtmlContent(template.html_content);
                  if (template.subject && !subject) {
                    setSubject(template.subject);
                  }
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
              <Label htmlFor="html-content">Email Content (HTML)</Label>
              <Textarea
                id="html-content"
                className="min-h-[200px] font-mono text-sm"
                placeholder="Paste your HTML email content here..."
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setCreateDialogOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name || !fromName || !fromEmail || !subject || createCampaign.isPending}
            >
              {createCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
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
              Select which lists to send "{selectedCampaign?.name}" to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {lists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lists available. Create a list first or send to all contacts.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Select Lists</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {lists.map((list) => (
                    <div key={list.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={list.id}
                        checked={selectedListIds.includes(list.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedListIds([...selectedListIds, list.id]);
                          } else {
                            setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={list.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {list.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedListIds.length === 0
                ? 'No lists selected - will send to all active contacts'
                : `Sending to ${selectedListIds.length} list(s)`}
            </p>
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
