import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDevDocument, useDevDocuments } from '@/hooks/useDevDocuments';
import { useCurrentUserRole } from '@/hooks/useUsers';
import { DevOverviewTab } from '@/components/development/DevOverviewTab';
import { DevRoadmapTab } from '@/components/development/DevRoadmapTab';
import { DevDecisionsTab } from '@/components/development/DevDecisionsTab';
import { DevRisksTab } from '@/components/development/DevRisksTab';
import { DevMeetingsTab } from '@/components/development/DevMeetingsTab';
import { DevReleasesTab } from '@/components/development/DevReleasesTab';
import { DevDocsTab } from '@/components/development/DevDocsTab';
import { LayoutDashboard, Map, FileCheck, AlertTriangle, Users, Rocket, FileText } from 'lucide-react';

export default function Development() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: mainDoc } = useDevDocument('development-notes');
  const { data: userRole } = useCurrentUserRole();
  
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const documentId = mainDoc?.id;

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Development</h1>
        <p className="text-muted-foreground">
          Internal documentation, roadmap, and project tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-2">
            <Map className="h-4 w-4" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Decisions
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risks
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-2">
            <Users className="h-4 w-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2">
            <Rocket className="h-4 w-4" />
            Releases
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="h-4 w-4" />
            Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DevOverviewTab documentId={documentId} />
        </TabsContent>
        <TabsContent value="roadmap">
          <DevRoadmapTab documentId={documentId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="decisions">
          <DevDecisionsTab documentId={documentId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="risks">
          <DevRisksTab documentId={documentId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="meetings">
          <DevMeetingsTab documentId={documentId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="releases">
          <DevReleasesTab documentId={documentId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="docs">
          <DevDocsTab documentId={documentId} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
