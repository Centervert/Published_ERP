import { useAggregateStats } from '@/hooks/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  Eye,
  MousePointer,
  UserMinus,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

interface CampaignAnalyticsProps {
  onBack: () => void;
}

export function CampaignAnalytics({ onBack }: CampaignAnalyticsProps) {
  const { data: stats, isLoading } = useAggregateStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.campaignCount === 0) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Campaign Analytics</h1>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No sent campaigns yet. Send your first campaign to see analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaign Analytics</h1>
          <p className="text-muted-foreground">Overview of {stats.campaignCount} sent campaigns</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-3xl font-bold">{stats.totalSent.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
                <p className="text-3xl font-bold">{stats.avgOpenRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm">
              {stats.avgOpenRate >= 20 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Good performance</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Below average</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Click Rate</p>
                <p className="text-3xl font-bold">{stats.avgClickRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MousePointer className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-sm">
              {stats.avgClickRate >= 2 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Good engagement</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Room to improve</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unsubscribes</p>
                <p className="text-3xl font-bold">{stats.totalUnsubscribed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stats.totalSent > 0 
                ? `${((stats.totalUnsubscribed / stats.totalSent) * 100).toFixed(2)}% rate`
                : '0% rate'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Total Opens</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalOpened.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Clicks</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalClicked.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Total Bounces</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalBounced.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-sm text-muted-foreground bg-muted/50">
              <div className="col-span-4">Campaign</div>
              <div className="col-span-2">Sent</div>
              <div className="col-span-2">Recipients</div>
              <div className="col-span-2">Open Rate</div>
              <div className="col-span-2">Click Rate</div>
            </div>

            {/* Campaign Rows */}
            {stats.recentCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-4">
                  <p className="font-medium truncate">{campaign.name}</p>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {format(new Date(campaign.sent_at), 'MMM d, yyyy')}
                </div>
                <div className="col-span-2 text-sm">
                  {campaign.total_recipients.toLocaleString()}
                </div>
                <div className="col-span-2">
                  <Badge 
                    variant="secondary" 
                    className={campaign.openRate >= 20 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                  >
                    {campaign.openRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Badge 
                    variant="secondary" 
                    className={campaign.clickRate >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-muted text-muted-foreground'}
                  >
                    {campaign.clickRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800 dark:text-blue-300">📈 Performance Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
          <p>• <strong>Open rates below 20%?</strong> Try A/B testing subject lines and sending at different times.</p>
          <p>• <strong>Click rates below 2%?</strong> Make your CTAs more prominent and ensure content matches subject expectations.</p>
          <p>• <strong>High unsubscribe rate?</strong> Review email frequency and ensure content is relevant to your audience.</p>
        </CardContent>
      </Card>
    </div>
  );
}