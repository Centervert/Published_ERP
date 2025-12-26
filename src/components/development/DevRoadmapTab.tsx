import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useDevItems } from '@/hooks/useDevItems';
import { ChevronDown, Target, CheckCircle, Circle, Plus } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DevRoadmapTabProps {
  documentId: string | undefined;
  isAdmin: boolean;
}

// Hardcoded phases for now - could be moved to DB later
const phases = [
  {
    id: 'phase_1',
    name: 'Phase 1: Foundation',
    target: 'January 2025',
    status: 'in_progress',
    goals: [
      'CRM usable for daily ASC operations',
      'Marketing campaigns reliable via Mailgun',
      'Basic communication logging (email/calls)',
      'Development documentation system live',
    ],
    definitionOfDone: [
      'ASC can manage contacts and deals daily',
      'Communication logging works (email/calls)',
      'Campaign creation and sending works reliably',
      'Unsubscribe and compliance works',
      'Analytics/logs are captured',
    ],
    dependencies: ['Mailgun integration', 'Office 365 OAuth'],
    owners: ['Tyler', 'Justin', 'Josh', 'Brian'],
  },
  {
    id: 'phase_2',
    name: 'Phase 2: Expansion',
    target: 'Q1 2025',
    status: 'planned',
    goals: [
      'Social media campaign generation',
      'Proposal generation with SKU builder',
      'Stripe payment integration',
      'Data migration from Einstein (selective)',
    ],
    definitionOfDone: [
      'Social content generation checkbox works',
      'ASC can build proposals from SKUs',
      'Stripe payments accepted',
      'Core Einstein data migrated and validated',
    ],
    dependencies: ['Phase 1 complete', 'Einstein DB access', 'Stripe account'],
    owners: ['Tyler', 'Justin', 'Angelica', 'Tom'],
  },
  {
    id: 'phase_3',
    name: 'Phase 3: Author Services Operations',
    target: 'Q2 2025',
    status: 'planned',
    goals: [
      'Book-centric operations board',
      'Departmental subtasks (copywriting, typesetting, design)',
      'Author Portal (basic)',
      'Royalties visibility',
    ],
    definitionOfDone: [
      'Author Services dept can track books and tasks',
      'Authors can view book status',
      'Royalties reporting visible',
      'Full operational workflow covered',
    ],
    dependencies: ['Phase 2 complete', 'Author Services requirements finalized'],
    owners: ['Angelica', 'Tyler', 'Author Services Team'],
  },
];

export function DevRoadmapTab({ documentId, isAdmin }: DevRoadmapTabProps) {
  const { items: milestones } = useDevItems(documentId, 'milestone');
  const [openPhases, setOpenPhases] = useState<string[]>(['phase_1']);

  const togglePhase = (phaseId: string) => {
    setOpenPhases(prev =>
      prev.includes(phaseId)
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const phaseMilestones = (phaseId: string) =>
    milestones.filter(m => m.phase === phaseId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Project Roadmap</h2>
        {isAdmin && (
          <Button size="sm" variant="outline" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {phases.map((phase, index) => (
          <Card key={phase.id}>
            <Collapsible
              open={openPhases.includes(phase.id)}
              onOpenChange={() => togglePhase(phase.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${getPhaseStatusColor(phase.status)}`} />
                      <CardTitle className="text-base">{phase.name}</CardTitle>
                      <Badge variant="outline" className="ml-2">{phase.target}</Badge>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openPhases.includes(phase.id) ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Goals */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Goals
                    </h4>
                    <ul className="space-y-1 ml-6">
                      {phase.goals.map((goal, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Circle className="h-3 w-3 mt-1.5 shrink-0" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Definition of Done */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Definition of Done
                    </h4>
                    <ul className="space-y-1 ml-6">
                      {phase.definitionOfDone.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Circle className="h-3 w-3 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Milestones from DB */}
                  {phaseMilestones(phase.id).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Milestones</h4>
                      <div className="space-y-2 ml-6">
                        {phaseMilestones(phase.id).map(m => (
                          <div key={m.id} className="flex items-center gap-2">
                            <StatusBadge status={m.status} />
                            <span className="text-sm">{m.title}</span>
                            {m.due_date && (
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(m.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    {/* Dependencies */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                      <div className="flex flex-wrap gap-1">
                        {phase.dependencies.map((dep, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Owners */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Owners</h4>
                      <div className="flex flex-wrap gap-1">
                        {phase.owners.map((owner, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {owner}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
