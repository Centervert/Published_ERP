import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Database, FileText, BarChart3, CheckCircle2, AlertCircle, XCircle, RotateCcw, FileDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ContactExportCard } from '@/components/settings/ContactExportCard';

interface BatchInfo {
  table: string;
  batchIndex: number;
  estimatedRows: number;
}

interface ExportPlan {
  totalRows: number;
  totalBatches: number;
  batchSize: number;
  tables: Record<string, number>;
  batches: BatchInfo[];
  exportedBy?: string;
}

interface ExportProgress {
  currentBatch: number;
  totalBatches: number;
  currentTable: string;
  currentBatchInTable: number;
  totalBatchesInTable: number;
  downloadedFiles: string[];
  failedBatches: BatchInfo[];
  totalRowsExported: number;
}

// Generate markdown documentation for the export
function generateExportDocumentation(plan: ExportPlan): string {
  const now = new Date().toISOString();
  
  return `# Database Export Documentation

Generated: ${now}
Exported by: ${plan.exportedBy || 'Unknown'}

## Export Summary

- **Total Rows**: ${plan.totalRows.toLocaleString()}
- **Total Files**: ${plan.totalBatches}
- **Rows per File**: ${plan.batchSize.toLocaleString()}

## Table Overview

| Table | Row Count | Files |
|-------|-----------|-------|
${Object.entries(plan.tables)
  .filter(([_, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .map(([table, count]) => `| ${table} | ${count.toLocaleString()} | ${Math.ceil(count / plan.batchSize)} |`)
  .join('\n')}

## Data Model & Relationships

### Core Entities

#### Company & Imprints
- \`company\` - Parent organization settings (branding, email defaults)
- \`imprints\` - Sub-brands under the company, each with own branding
  - Links to: \`company.id\` via \`company_id\`

#### Users & Staff
- \`profiles\` - User accounts (login users of the system)
- \`user_roles\` - Role assignments (admin, member, asc, ae, marketing)
  - Links to: \`profiles.id\` via \`user_id\`
- \`staff\` - Staff directory (may or may not have user account)
  - Links to: \`profiles.id\` via \`user_id\` (optional)

### CRM Entities

#### Contacts
- \`contacts\` - Main contact/lead records
  - Links to: \`imprints.id\` via \`imprint_id\` (which imprint they belong to)
  - Links to: \`staff.id\` via \`staff_ae_id\`, \`staff_asc_id\` (assigned staff)
  - Key fields: email, first_name, last_name, phone, address, lead_source, status

#### Contact Extensions
- \`contact_links\` - Social/web links for contacts
  - Links to: \`contacts.id\` via \`contact_id\`
- \`contact_notes\` - Notes attached to contacts
  - Links to: \`contacts.id\` via \`contact_id\`
  - Links to: \`deals.id\` via \`deal_id\` (optional)
- \`contact_tasks\` - Tasks/to-dos for contacts
  - Links to: \`contacts.id\` via \`contact_id\`
  - Links to: \`deals.id\` via \`deal_id\` (optional)
- \`contact_activity\` - Activity log for contacts
  - Links to: \`contacts.id\` via \`contact_id\`
- \`contact_communications\` - Email/call history
  - Links to: \`contacts.id\` via \`contact_id\`
  - Links to: \`deals.id\` via \`deal_id\` (optional)

#### Lists & Tags
- \`lists\` - Contact lists/segments
- \`contact_lists\` - Many-to-many: contacts in lists
  - Links to: \`contacts.id\` via \`contact_id\`
  - Links to: \`lists.id\` via \`list_id\`
- \`tags\` - Tag definitions
- \`contact_tags\` - Many-to-many: tags on contacts
  - Links to: \`contacts.id\` via \`contact_id\`
  - Links to: \`tags.id\` via \`tag_id\`

### Sales Entities

#### Deals
- \`deals\` - Sales opportunities/pipeline
  - Links to: \`contacts.id\` via \`contact_id\`
  - Key fields: stage, total_value, book_title, commission_amount

#### Books
- \`books\` - Book projects linked to contacts
  - Links to: \`contacts.id\` via \`contact_id\`

#### Products
- \`products\` - Product/service catalog
- \`package_items\` - Products included in packages
  - Links to: \`products.id\` via \`package_id\` (the package)
  - Links to: \`products.id\` via \`item_id\` (the included product)
- \`commission_tiers\` - Sales commission tier definitions

### Marketing Entities

#### Campaigns
- \`templates\` - Email templates
- \`campaigns\` - Email campaigns
  - Links to: \`templates.id\` via \`template_id\` (optional)
  - Key fields: status, subject, html_content, scheduled_at
- \`campaign_lists\` - Many-to-many: lists targeted by campaigns
  - Links to: \`campaigns.id\` via \`campaign_id\`
  - Links to: \`lists.id\` via \`list_id\`
- \`email_events\` - Email tracking events (opens, clicks, bounces)
  - Links to: \`campaigns.id\` via \`campaign_id\`
  - Links to: \`contacts.id\` via \`contact_id\`
  - Key fields: event_type, email, is_bot

### Development/Project Entities

- \`dev_documents\` - Project documents
- \`dev_document_versions\` - Version history
  - Links to: \`dev_documents.id\` via \`document_id\`
- \`dev_items\` - Features, tickets, risks, decisions
  - Links to: \`dev_documents.id\` via \`document_id\`
- \`dev_meetings\` - Meeting notes
  - Links to: \`dev_documents.id\` via \`document_id\`
- \`dev_meeting_links\` - Links between meetings and items
  - Links to: \`dev_meetings.id\` via \`meeting_id\`
  - Links to: \`dev_items.id\` via \`item_id\`

### System Entities

- \`import_jobs\` - CSV import job history
- \`user_email_connections\` - OAuth email connections for users
  - Links to: \`profiles.id\` via \`user_id\`

## File Naming Convention

Files are named using the pattern:
- Single batch: \`{table}.json\`
- Multiple batches: \`{table}_batch_{n}.json\`

Example: \`contacts_batch_1.json\`, \`contacts_batch_2.json\`, etc.

## JSON Structure

Each exported file contains:

\`\`\`json
{
  "metadata": {
    "table": "contacts",
    "batchNumber": 1,
    "totalBatches": 17,
    "totalTableRows": 423704,
    "rowsInBatch": 25000,
    "hasMore": true,
    "offsetStart": 0,
    "offsetEnd": 25000,
    "exportedAt": "2024-01-14T...",
    "exportedBy": "user@example.com"
  },
  "data": [
    { /* row 1 */ },
    { /* row 2 */ },
    // ...
  ]
}
\`\`\`

## Restoring Data

To restore this data to a new database:

1. **Order matters** - Restore tables in dependency order:
   - First: \`company\`, \`profiles\`, \`user_roles\`
   - Then: \`imprints\`, \`staff\`, \`lists\`, \`tags\`, \`products\`
   - Then: \`contacts\`, \`templates\`, \`campaigns\`
   - Then: \`deals\`, \`books\`, \`contact_*\` tables
   - Last: \`email_events\`, \`campaign_lists\`, \`contact_lists\`, \`contact_tags\`

2. **Preserve IDs** - All records use UUIDs. Maintain these when importing to preserve relationships.

3. **Handle batches** - For tables with multiple batch files, import all batches in order.

## Key Enums

### deal_stage
\`new\` → \`outreach\` → \`contacted\` → \`qualified\` → \`nurturing\` → \`proposal_sent\` → \`won\` | \`lost\` | \`not_interested\`

### lead_source
\`website_landing_page\`, \`manual_entry\`, \`marketing_partner\`, \`import\`

### campaign_status
\`draft\` → \`scheduled\` → \`sending\` → \`sent\` | \`failed\`

### app_role
\`super_admin\`, \`admin\`, \`asc\`, \`ae\`, \`marketing\`, \`member\`

### product_category
\`format\`, \`bundle\`, \`package\`, \`service\`, \`add_on\`
`;
}

export default function Settings() {
  const { user } = useAuth();
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [exportPlan, setExportPlan] = useState<ExportPlan | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportComplete, setExportComplete] = useState(false);

  const handleGetPlan = async () => {
    setIsLoadingPlan(true);
    setExportPlan(null);
    setExportComplete(false);
    setExportProgress(null);
    try {
      const response = await supabase.functions.invoke('export-data', {
        body: { action: 'plan' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setExportPlan(response.data);
      toast.success(`Found ${response.data.totalRows.toLocaleString()} rows across ${Object.keys(response.data.tables).length} tables (${response.data.totalBatches} files to download)`);
    } catch (error) {
      console.error('Plan error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get export plan');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const downloadBatch = useCallback(async (table: string, batchIndex: number): Promise<{ success: boolean; filename: string; rows: number }> => {
    const response = await supabase.functions.invoke('export-data', {
      body: { action: 'batch', table, batchIndex },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const data = response.data;
    const metadata = data.metadata;
    
    // Create filename
    const filename = metadata.totalBatches > 1 
      ? `${table}_batch_${metadata.batchNumber}.json`
      : `${table}.json`;

    // Download the file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, filename, rows: metadata.rowsInBatch };
  }, []);

  const downloadDocumentation = useCallback(() => {
    if (!exportPlan) return;
    
    const markdown = generateExportDocumentation(exportPlan);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_documentation_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Documentation downloaded');
  }, [exportPlan]);

  const runExport = async (batches: BatchInfo[], isRetry = false) => {
    if (!exportPlan) return;

    if (isRetry) {
      setIsRetrying(true);
    } else {
      setIsExporting(true);
      setExportComplete(false);
    }
    
    const progress: ExportProgress = isRetry && exportProgress ? {
      ...exportProgress,
      currentBatch: exportProgress.downloadedFiles.length,
    } : {
      currentBatch: 0,
      totalBatches: exportPlan.totalBatches,
      currentTable: '',
      currentBatchInTable: 0,
      totalBatchesInTable: 0,
      downloadedFiles: [],
      failedBatches: [],
      totalRowsExported: 0,
    };
    
    // If retrying, keep existing successful downloads
    if (!isRetry) {
      setExportProgress(progress);
    }

    // Group batches by table for progress display
    const batchesByTable: Record<string, BatchInfo[]> = {};
    for (const batch of exportPlan.batches) {
      if (!batchesByTable[batch.table]) {
        batchesByTable[batch.table] = [];
      }
      batchesByTable[batch.table].push(batch);
    }

    const newFailedBatches: BatchInfo[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const tableBatches = batchesByTable[batch.table];
        const batchInTable = tableBatches.findIndex(b => b.batchIndex === batch.batchIndex) + 1;
        
        // Update progress
        progress.currentBatch = progress.downloadedFiles.length + i + 1;
        progress.currentTable = batch.table;
        progress.currentBatchInTable = batchInTable;
        progress.totalBatchesInTable = tableBatches.length;
        setExportProgress({ ...progress });

        try {
          const result = await downloadBatch(batch.table, batch.batchIndex);
          progress.downloadedFiles.push(result.filename);
          progress.totalRowsExported += result.rows;
          
          // Small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to download ${batch.table} batch ${batch.batchIndex}:`, error);
          newFailedBatches.push(batch);
        }
        
        progress.failedBatches = [...(isRetry ? [] : progress.failedBatches), ...newFailedBatches];
        setExportProgress({ ...progress });
      }

      // Update final failed batches
      progress.failedBatches = newFailedBatches;
      setExportProgress({ ...progress });
      setExportComplete(true);
      
      if (newFailedBatches.length === 0) {
        toast.success(`Export complete! Downloaded ${progress.downloadedFiles.length} files (${progress.totalRowsExported.toLocaleString()} rows)`);
      } else {
        toast.warning(`Export finished with ${newFailedBatches.length} failed files. ${progress.downloadedFiles.length} files downloaded successfully.`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setIsRetrying(false);
    }
  };

  const handleStartExport = () => {
    if (!exportPlan) return;
    runExport(exportPlan.batches, false);
  };

  const handleRetryFailed = () => {
    if (!exportProgress || exportProgress.failedBatches.length === 0) return;
    runExport(exportProgress.failedBatches, true);
  };

  const progressPercent = exportProgress 
    ? Math.round((exportProgress.downloadedFiles.length / exportProgress.totalBatches) * 100)
    : 0;

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

      {/* Smart Contacts Export - Background Processing */}
      <ContactExportCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Complete Database Export
          </CardTitle>
          <CardDescription>
            Export all database tables as JSON files. Each table is exported in batches of 25,000 rows.
            Files are named like <code>contacts_batch_1.json</code>, <code>contacts_batch_2.json</code>, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Get Export Plan */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Step 1: Analyze Database</Label>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleGetPlan} 
                disabled={isLoadingPlan || isExporting || isRetrying}
                size="sm"
              >
                {isLoadingPlan ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="mr-2 h-4 w-4" />
                )}
                Get Export Plan
              </Button>
            </div>
          </div>

          {/* Show export plan summary */}
          {exportPlan && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Export Summary</span>
                {exportComplete && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Rows</div>
                  <div className="font-mono font-medium">{exportPlan.totalRows.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Files to Download</div>
                  <div className="font-mono font-medium">{exportPlan.totalBatches}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Rows per File</div>
                  <div className="font-mono font-medium">{exportPlan.batchSize.toLocaleString()}</div>
                </div>
              </div>
              
              {/* Table breakdown */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Tables with data:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(exportPlan.tables)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([table, count]) => (
                      <span key={table} className="text-xs bg-background rounded px-2 py-1 border">
                        {table}: {count.toLocaleString()}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Download Documentation */}
          {exportPlan && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Step 2: Download Documentation</Label>
              <Button 
                variant="outline"
                onClick={downloadDocumentation} 
                disabled={isExporting || isRetrying}
                size="sm"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download Export Documentation (Markdown)
              </Button>
              <p className="text-xs text-muted-foreground">
                Explains the data model, table relationships, and how to restore the data.
              </p>
            </div>
          )}

          {/* Step 3: Start Export */}
          {exportPlan && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Step 3: Download All Files</Label>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleStartExport} 
                  disabled={isExporting || isRetrying || (exportComplete && (!exportProgress || exportProgress.failedBatches.length === 0))}
                  className="w-full sm:w-auto"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : exportComplete && (!exportProgress || exportProgress.failedBatches.length === 0) ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Export Complete
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Start Export ({exportPlan.totalBatches} files)
                    </>
                  )}
                </Button>

                {/* Retry Failed Button */}
                {exportProgress && exportProgress.failedBatches.length > 0 && !isExporting && (
                  <Button 
                    variant="destructive"
                    onClick={handleRetryFailed}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retry Failed ({exportProgress.failedBatches.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress display */}
          {exportProgress && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {isExporting || isRetrying ? (
                    <>Downloading: <span className="font-mono">{exportProgress.currentTable}</span> (batch {exportProgress.currentBatchInTable}/{exportProgress.totalBatchesInTable})</>
                  ) : (
                    'Export finished'
                  )}
                </span>
                <span className="font-mono">{exportProgress.downloadedFiles.length}/{exportProgress.totalBatches}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{exportProgress.downloadedFiles.length} files downloaded</span>
                </div>
                {exportProgress.failedBatches.length > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>{exportProgress.failedBatches.length} failed</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {exportProgress.totalRowsExported.toLocaleString()} rows exported so far
              </div>

              {/* Show recent downloads */}
              {exportProgress.downloadedFiles.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs space-y-1 bg-muted/50 rounded p-2">
                  {exportProgress.downloadedFiles.slice(-5).reverse().map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {file}
                    </div>
                  ))}
                  {exportProgress.downloadedFiles.length > 5 && (
                    <div className="text-muted-foreground">
                      ... and {exportProgress.downloadedFiles.length - 5} more
                    </div>
                  )}
                </div>
              )}

              {/* Show failed files if any */}
              {exportProgress.failedBatches.length > 0 && (
                <div className="text-xs space-y-1 bg-destructive/10 rounded p-2">
                  <div className="font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Failed downloads (click Retry Failed to re-attempt):
                  </div>
                  {exportProgress.failedBatches.map((batch, i) => {
                    const filename = batch.batchIndex > 0 || (exportPlan?.tables[batch.table] || 0) > (exportPlan?.batchSize || 25000)
                      ? `${batch.table}_batch_${batch.batchIndex + 1}.json`
                      : `${batch.table}.json`;
                    return (
                      <div key={i} className="text-destructive/80">{filename}</div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
