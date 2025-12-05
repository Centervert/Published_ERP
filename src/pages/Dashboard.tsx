import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContacts } from '@/hooks/useContacts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Send, Mail, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();

  const { data: emailStats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('email_events')
        .select('event_type, email')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const sent = data.filter(e => e.event_type === 'sent').length;
      
      // Count unique opens/clicks by email address
      const uniqueOpens = new Set(data.filter(e => e.event_type === 'opened').map(e => e.email));
      const uniqueClicks = new Set(data.filter(e => e.event_type === 'clicked').map(e => e.email));

      return {
        sent,
        opened: uniqueOpens.size,
        clicked: uniqueClicks.size,
        openRate: sent > 0 ? ((uniqueOpens.size / sent) * 100).toFixed(1) : '0',
      };
    },
  });

  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
  const recentCampaigns = campaigns.slice(0, 5);

  const isLoading = contactsLoading || campaignsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your email marketing performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeContacts} active subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter(c => c.status === 'draft').length} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.openRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {emailStats?.opened || 0} opens / {emailStats?.sent || 0} sent
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>
              Your latest email campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No campaigns yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to="/campaigns"
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.sent_at
                          ? format(new Date(campaign.sent_at), 'MMM d, yyyy')
                          : 'Draft'}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        campaign.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with these actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/contacts"
              className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Import your contact list</span>
            </Link>
            <Link
              to="/templates"
              className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>Create an email template</span>
            </Link>
            <Link
              to="/campaigns"
              className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <Send className="h-4 w-4 text-muted-foreground" />
              <span>Launch your first campaign</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
