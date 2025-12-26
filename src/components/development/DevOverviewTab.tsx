import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';
import { useDevItems, DevItem } from '@/hooks/useDevItems';
import { AlertTriangle, CheckCircle, Clock, Users, Target, FileText } from 'lucide-react';

interface DevOverviewTabProps {
  documentId: string | undefined;
}

export function DevOverviewTab({ documentId }: DevOverviewTabProps) {
  const { items } = useDevItems(documentId);

  // Group items by type
  const decisions = items.filter(i => i.item_type === 'decision');
  const risks = items.filter(i => i.item_type === 'risk' || i.item_type === 'blocker');
  const milestones = items.filter(i => i.item_type === 'milestone');
  const scopes = items.filter(i => i.item_type === 'scope');

  // Calculate project status
  const criticalRisks = risks.filter(r => r.severity === 'critical' && r.status !== 'closed');
  const openBlockers = items.filter(i => i.item_type === 'blocker' && i.status !== 'closed');
  
  let projectStatus: 'on_track' | 'at_risk' | 'blocked' = 'on_track';
  if (openBlockers.length > 0) projectStatus = 'blocked';
  else if (criticalRisks.length > 0) projectStatus = 'at_risk';

  const recentDecisions = decisions
    .filter(d => d.status === 'accepted')
    .slice(0, 5);
  
  const openDeliberations = decisions
    .filter(d => d.status === 'proposed')
    .slice(0, 5);

  const topRisks = risks
    .filter(r => r.status !== 'closed')
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) - 
             (severityOrder[b.severity as keyof typeof severityOrder] ?? 4);
    })
    .slice(0, 5);

  // Stakeholders (hardcoded for now, could be moved to DB)
  const stakeholders = [
    { name: 'Angelica', role: 'Author Services Leadership' },
    { name: 'Tom', role: 'IT Lead / Einstein Creator' },
    { name: 'Tyler Amos', role: 'Centervert Owner' },
    { name: 'Justin', role: 'Engineering' },
    { name: 'Josh', role: 'Engineering' },
    { name: 'Brian', role: 'Engineering' },
  ];

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Project Status</p>
                <div className="mt-1">
                  <StatusBadge status={projectStatus} className="text-base px-3 py-1" />
                </div>
              </div>
              {projectStatus === 'on_track' && <CheckCircle className="h-8 w-8 text-green-500" />}
              {projectStatus === 'at_risk' && <AlertTriangle className="h-8 w-8 text-yellow-500" />}
              {projectStatus === 'blocked' && <AlertTriangle className="h-8 w-8 text-red-500" />}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[200px]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Phase Target</p>
                <p className="text-lg font-semibold mt-1">January: CRM + Marketing usable</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* What's Live Now */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-green-500" />
              What's Live Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">•</span>
                <span>CRM: Contacts management with ASC assignment</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Deals pipeline with Kanban stages</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Email campaigns with AI generation</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Campaign analytics and tracking</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Multi-imprint brand management</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Next 2 Weeks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-blue-500" />
              Next 2 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Social media campaign generation</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Office 365 / Outlook OAuth integration</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Communication logging polish</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Data migration planning sessions</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Top Risks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Top Risks ({topRisks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open risks</p>
            ) : (
              <ul className="space-y-3">
                {topRisks.map(risk => (
                  <li key={risk.id} className="flex items-start gap-2">
                    <SeverityBadge severity={risk.severity} className="shrink-0 mt-0.5" />
                    <span className="text-sm">{risk.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-purple-500" />
              Recent Decisions ({recentDecisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDecisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent decisions</p>
            ) : (
              <ul className="space-y-2">
                {recentDecisions.map(decision => (
                  <li key={decision.id} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{decision.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Open Deliberations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-yellow-500" />
              Open Deliberations ({openDeliberations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openDeliberations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open deliberations</p>
            ) : (
              <ul className="space-y-2">
                {openDeliberations.map(item => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Key Stakeholders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-teal-500" />
              Key Stakeholders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {stakeholders.map(s => (
                <div key={s.name} className="text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground ml-1">– {s.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
