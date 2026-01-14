import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Database, FileText, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ExportMode = 'quick' | 'standard' | 'full' | 'contacts';

const EXPORT_MODE_INFO: Record<ExportMode, { label: string; description: string }> = {
  quick: {
    label: 'Quick (Config Only)',
    description: 'Essential config tables only (imprints, staff, templates, etc.) - fastest',
  },
  standard: {
    label: 'Standard',
    description: 'All tables with 10K contact limit and 5K activity limit',
  },
  full: {
    label: 'Full Export',
    description: 'All tables with 50K contact limit - may take longer',
  },
  contacts: {
    label: 'Contacts Only',
    description: 'Just contacts table with 100K limit',
  },
};

export default function Settings() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('standard');
  const [tableCounts, setTableCounts] = useState<Record<string, number> | null>(null);

  const handleGetCounts = async () => {
    setIsLoadingCounts(true);
    try {
      const response = await supabase.functions.invoke('export-data', {
        body: { countsOnly: true },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setTableCounts(response.data.tables);
      toast.success(`Total: ${response.data.totalRows.toLocaleString()} rows across all tables`);
    } catch (error) {
      console.error('Count error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get counts');
    } finally {
      setIsLoadingCounts(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to export data');
        return;
      }

      toast.info(`Starting ${EXPORT_MODE_INFO[exportMode].label} export...`);

      const response = await supabase.functions.invoke('export-data', {
        body: { mode: exportMode },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Create a downloadable file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_export_${exportMode}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const exportedRows = response.data?.metadata?.exportedRows || 0;
      const totalRows = response.data?.metadata?.totalRows || 0;
      const truncated = response.data?.metadata?.truncatedTables?.length || 0;
      
      if (truncated > 0) {
        toast.success(`Exported ${exportedRows.toLocaleString()} of ${totalRows.toLocaleString()} rows (${truncated} tables truncated)`);
      } else {
        toast.success(`Exported ${exportedRows.toLocaleString()} rows from ${response.data?.metadata?.tableCount || 0} tables`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
            />
          </div>
          <Button disabled>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>
            Configure your default sending settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-name">Default From Name</Label>
            <Input
              id="from-name"
              placeholder="Your Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from-email">Default From Email</Label>
            <Input
              id="from-email"
              type="email"
              placeholder="hello@yourcompany.com"
            />
          </div>
          <Button disabled>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Export
          </CardTitle>
          <CardDescription>
            Export database data as JSON. Requires admin access. You have ~423K contacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleGetCounts} 
              disabled={isLoadingCounts}
              size="sm"
            >
              {isLoadingCounts ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Get Row Counts
            </Button>
            {tableCounts && (
              <span className="text-sm text-muted-foreground">
                Contacts: {tableCounts.contacts?.toLocaleString() || 0} | 
                Events: {tableCounts.email_events?.toLocaleString() || 0}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Export Mode</Label>
            <Select value={exportMode} onValueChange={(v) => setExportMode(v as ExportMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPORT_MODE_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{info.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {EXPORT_MODE_INFO[exportMode].description}
            </p>
          </div>

          <Button onClick={handleExportData} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting ({exportMode})...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Architecture Audit
          </CardTitle>
          <CardDescription>
            Download the annotated architecture discovery document with corrections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This document contains the full system architecture audit with corrections 
            to counts, missing items, and security recommendations.
          </p>
          <Button asChild>
            <a href="/discovery-architecture-annotated.md" download>
              <Download className="mr-2 h-4 w-4" />
              Download Architecture Audit
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
