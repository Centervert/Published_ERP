import { useState } from 'react';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { useLists } from '@/hooks/useContacts';
import { useTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { 
  Plus, 
  Send, 
  Trash2, 
  Loader2, 
  Search, 
  Mail, 
  ChevronDown,
  BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { CampaignDetail } from '@/components/campaigns/CampaignDetail';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmailOption, setFromEmailOption] = useState('');
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState('');

  const fromEmailOptions = [
    { value: 'xulon@news.authorservices.com', label: 'Xulon' },
    { value: 'millcity@news.authorservices.com', label: 'MillCity' },
    { value: 'lhp@news.authorservices.com', label: 'LHP' },
    { value: 'deals@news.authorservices.com', label: 'Deals' },
    { value: 'custom', label: 'Custom Email' },
  ];

  const fromEmail = fromEmailOption === 'custom' ? customFromEmail : fromEmailOption;

  const handleCreate = async () => {
    const template = templates.find(t => t.id === templateId);
    await createCampaign.mutateAsync({
      name,
      subject: subject || template?.subject || 'No Subject',
      from_name: fromName,
      from_email: fromEmail,
      reply_to_email: replyToEmail || undefined,
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
    setFromEmailOption('');
    setCustomFromEmail('');
    setReplyToEmail('');
    setTemplateId('');
    setHtmlContent('');
  };

  const openSendDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedListIds([]);
    setSendDialogOpen(true);
  };

  const filteredCampaigns = campaigns
    .filter(campaign => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;
      if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return a.name.localeCompare(b.name);
    });

  if (viewingCampaign) {
    return (
      <CampaignDetail
        campaign={viewingCampaign}
        onBack={() => setViewingCampaign(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All campaigns</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />
            View analytics
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-primary">
                      {statusFilter === 'all' ? 'All' : statusFilter}
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>All</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('draft')}>Draft</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('sent')}>Sent</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('sending')}>Sending</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('failed')}>Failed</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {statusFilter !== 'all' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-primary"
                  onClick={() => setStatusFilter('all')}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-primary">
                    {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Name'}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('newest')}>Newest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('oldest')}>Oldest</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' ? 'No campaigns match your filters' : 'No campaigns yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                Create your first campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-sm text-muted-foreground">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Recipients</div>
              <div className="col-span-2">Performance</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Campaign Rows */}
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer items-center"
                onClick={() => setViewingCampaign(campaign)}
              >
                {/* Name Column */}
                <div className="col-span-5">
                  <p className="font-medium text-primary hover:underline">
                    {campaign.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>Regular email</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last edited {campaign.updated_at 
                      ? format(new Date(campaign.updated_at), 'MMM d, yyyy h:mm a')
                      : format(new Date(campaign.created_at || ''), 'MMM d, yyyy h:mm a')
                    }
                  </p>
                </div>

                {/* Status Column */}
                <div className="col-span-2">
                  <Badge variant="secondary" className={statusColors[campaign.status]}>
                    {campaign.status === 'sent' ? 'Published' : campaign.status}
                  </Badge>
                  {campaign.sent_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(campaign.sent_at), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>

                {/* Recipients Column */}
                <div className="col-span-2">
                  <p className="text-sm">
                    {campaign.total_recipients > 0 
                      ? `${campaign.total_recipients} contacts`
                      : '—'
                    }
                  </p>
                </div>

                {/* Performance Column */}
                <div className="col-span-2">
                  {campaign.status === 'sent' ? (
                    <p className="text-sm text-muted-foreground">View report</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {/* Actions Column */}
                <div className="col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        {campaign.status === 'draft' ? 'Edit' : 'View'}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingCampaign(campaign)}>
                        View Details
                      </DropdownMenuItem>
                      {campaign.status === 'draft' && (
                        <DropdownMenuItem onClick={() => openSendDialog(campaign)}>
                          <Send className="mr-2 h-4 w-4" />
                          Send Campaign
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(campaign)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
                <Label>From Email *</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-to-email">Reply-To Email (optional)</Label>
              <Input
                id="reply-to-email"
                type="email"
                placeholder="replies@example.com"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If set, replies will go to this address instead of the From Email
              </p>
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
            <div className="space-y-2">
              <Label>Select Recipients</Label>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="all-contacts"
                    checked={selectedListIds.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedListIds([]);
                      }
                    }}
                  />
                  <label
                    htmlFor="all-contacts"
                    className="text-sm font-medium leading-none"
                  >
                    All Contacts
                  </label>
                </div>
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
            <p className="text-xs text-muted-foreground">
              {selectedListIds.length === 0
                ? 'Sending to all active contacts'
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
