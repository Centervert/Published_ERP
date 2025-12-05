import { Campaign, useCampaignStats } from '@/hooks/useCampaigns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, Eye, MousePointer, UserMinus, AlertTriangle, Loader2, Bot } from 'lucide-react';
import { format } from 'date-fns';

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function CampaignDetail({ campaign, onBack }: CampaignDetailProps) {
  const { data: stats, isLoading: statsLoading } = useCampaignStats(campaign.id);

  // Use human opens for accurate rate calculation
  const openRate = stats && stats.sent > 0 
    ? ((stats.openedHuman / stats.sent) * 100).toFixed(1) 
    : '0';
  const clickRate = stats && stats.openedHuman > 0 
    ? ((stats.clicked / stats.openedHuman) * 100).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant="secondary" className={statusColors[campaign.status]}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{campaign.subject}</p>
        </div>
      </div>

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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(campaign.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            {campaign.sent_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{format(new Date(campaign.sent_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients</span>
              <span>{campaign.total_recipients}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
            <CardDescription>
              {campaign.status === 'sent' ? 'Campaign analytics' : 'Analytics will appear after sending'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : campaign.status === 'sent' && stats ? (
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
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Send the campaign to see analytics
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {campaign.status === 'sent' && stats && (
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
                <span className="text-sm text-muted-foreground">Opened (Human)</span>
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
