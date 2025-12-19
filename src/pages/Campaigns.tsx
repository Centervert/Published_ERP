import { useState } from 'react';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { useLists } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { imprints } = useImprints();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedImprintIds, setSelectedImprintIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  const handleQuickCreate = async () => {
    // Create a draft campaign with defaults and immediately open builder
    const newCampaign = await createCampaign.mutateAsync({
      name: `Campaign ${format(new Date(), 'MMM d, yyyy')}`,
      subject: '',
      from_name: '',
      from_email: 'xulon@news.authorservices.com',
      html_content: '',
    });
    if (newCampaign) {
      setViewingCampaign(newCampaign);
    }
  };

  const handleSend = async () => {
    if (!selectedCampaign) return;
    await sendCampaign.mutateAsync({
      campaignId: selectedCampaign.id,
      listIds: selectedListIds,
      imprintIds: selectedImprintIds.length > 0 ? selectedImprintIds : undefined,
    });
    setSendDialogOpen(false);
    setSelectedCampaign(null);
    setSelectedListIds([]);
    setSelectedImprintIds([]);
  };

  const handleDelete = async (campaign: Campaign) => {
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      await deleteCampaign.mutateAsync(campaign.id);
    }
  };

  const openSendDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedListIds([]);
    setSelectedImprintIds([]);
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

  // Get the latest campaign data from the query for the viewing campaign
  const currentCampaign = viewingCampaign 
    ? campaigns.find(c => c.id === viewingCampaign.id) || viewingCampaign
    : null;

  if (currentCampaign) {
    return (
      <CampaignDetail
        campaign={currentCampaign}
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
          <Button onClick={handleQuickCreate} size="sm" disabled={createCampaign.isPending}>
            {createCampaign.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
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
              <Button onClick={handleQuickCreate} disabled={createCampaign.isPending}>
                {createCampaign.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
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
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                <div className="flex items-center space-x-2 pb-2 border-b">
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
                  <label
                    htmlFor="all-contacts"
                    className="text-sm font-medium leading-none"
                  >
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
                        <label
                          htmlFor={`send-imprint-${imprint.id}`}
                          className="text-sm font-medium leading-none"
                        >
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
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedListIds.length === 0 && selectedImprintIds.length === 0
                ? 'Sending to all active contacts'
                : `Sending to ${selectedImprintIds.length > 0 ? `${selectedImprintIds.length} imprint(s)` : ''}${selectedImprintIds.length > 0 && selectedListIds.length > 0 ? ' and ' : ''}${selectedListIds.length > 0 ? `${selectedListIds.length} list(s)` : ''}`}
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
