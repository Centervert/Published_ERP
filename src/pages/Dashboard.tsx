import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { useCampaigns } from '@/hooks/useCampaigns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Send, 
  Mail, 
  Loader2, 
  Info, 
  MousePointerClick,
  Eye,
  ArrowRight,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

type TimePeriod = 7 | 30 | 60;

export default function Dashboard() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(30);
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();

  // Get accurate contact counts using count query (not limited to 1000)
  const { data: contactCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['contact-counts'],
    queryFn: async () => {
      const { count: total, error: totalError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) throw totalError;

      const { count: active, error: activeError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (activeError) throw activeError;

      const { count: unsubscribed, error: unsubError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unsubscribed');
      
      if (unsubError) throw unsubError;

      return {
        total: total || 0,
        active: active || 0,
        unsubscribed: unsubscribed || 0,
      };
    },
  });

  const { data: emailStats } = useQuery({
    queryKey: ['email-stats', timePeriod],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - timePeriod);

      const { data, error } = await supabase
        .from('email_events')
        .select('event_type, email')
        .gte('created_at', daysAgo.toISOString());

      if (error) throw error;

      const sent = data.filter(e => e.event_type === 'sent').length;
      
      // Count unique opens/clicks by email address
      const uniqueOpens = new Set(data.filter(e => e.event_type === 'opened').map(e => e.email));
      const uniqueClicks = new Set(data.filter(e => e.event_type === 'clicked').map(e => e.email));

      return {
        sent,
        opened: uniqueOpens.size,
        clicked: uniqueClicks.size,
        openRate: sent > 0 ? ((uniqueOpens.size / sent) * 100).toFixed(2) : '0.00',
        clickRate: sent > 0 ? ((uniqueClicks.size / sent) * 100).toFixed(2) : '0.00',
      };
    },
  });

  const recentCampaigns = campaigns.slice(0, 5);

  const isLoading = countsLoading || campaignsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <Badge variant="secondary" className="text-xs font-normal">
          Overview
        </Badge>
      </div>

      {/* Quick Actions Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-medium text-foreground">Quick actions</h2>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link to="/campaigns">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="flex items-center justify-center gap-2 py-3 px-4">
                <Mail className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-primary">Create email</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/contacts">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="flex items-center justify-center gap-2 py-3 px-4">
                <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-primary">Import contacts</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/templates">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="flex items-center justify-center gap-2 py-3 px-4">
                <FileText className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-primary">Create a template</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Email Performance Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-foreground">Email performance</h2>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            {/* Time Period Selector & Empty State Message */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {emailStats?.sent === 0 
                  ? "Once you send an email, data will show up here."
                  : `Performance data for the last ${timePeriod} days`
                }
              </p>
              <div className="flex bg-muted rounded-lg p-1">
                {([7, 30, 60] as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={timePeriod === period ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod(period)}
                    className={`text-xs px-3 ${
                      timePeriod === period 
                        ? 'bg-background shadow-sm' 
                        : 'hover:bg-transparent'
                    }`}
                  >
                    {period} days
                  </Button>
                ))}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Click Rate */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MousePointerClick className="h-4 w-4" />
                  <span>Click rate</span>
                </div>
                <p className="text-3xl font-light tracking-tight">
                  {emailStats?.clickRate || '0.00'}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {emailStats?.clicked || 0} clicks
                </p>
              </div>

              {/* Open Rate */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>Open rate</span>
                </div>
                <p className="text-3xl font-light tracking-tight">
                  {emailStats?.openRate || '0.00'}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {emailStats?.opened || 0} opens
                </p>
              </div>

              {/* Emails Sent */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Send className="h-4 w-4" />
                  <span>Emails sent</span>
                </div>
                <p className="text-3xl font-light tracking-tight">
                  {emailStats?.sent || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Last {timePeriod} days
                </p>
              </div>

              {/* Total Contacts */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Total contacts</span>
                </div>
                <p className="text-3xl font-light tracking-tight">
                  {contactCounts?.total?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {contactCounts?.active?.toLocaleString() || 0} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent Campaigns Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-foreground">Recent campaigns</h2>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <Link 
            to="/campaigns" 
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all campaigns
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            {recentCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No campaigns yet</p>
                <Link to="/campaigns">
                  <Button>Create your first campaign</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to="/campaigns"
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.sent_at
                            ? format(new Date(campaign.sent_at), 'MMM d, yyyy')
                            : 'Draft'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        campaign.status === 'sent'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : campaign.status === 'draft'
                          ? 'bg-muted text-muted-foreground'
                          : campaign.status === 'sending'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Audience Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-foreground">Audience</h2>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <Link 
            to="/contacts" 
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            See audience analytics
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-light mb-1">{contactCounts?.total?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Total contacts</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-light mb-1">{contactCounts?.active?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Active subscribers</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-light mb-1">
                  {contactCounts?.unsubscribed?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">Unsubscribed</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-light mb-1">
                  {campaigns.filter(c => c.status === 'sent').length}
                </p>
                <p className="text-sm text-muted-foreground">Campaigns sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
