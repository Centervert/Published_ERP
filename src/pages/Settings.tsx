import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, Database, FileText, BarChart3, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
}

interface ExportProgress {
  currentBatch: number;
  totalBatches: number;
  currentTable: string;
  currentBatchInTable: number;
  totalBatchesInTable: number;
  downloadedFiles: string[];
  failedFiles: string[];
  totalRowsExported: number;
}

export default function Settings() {
  const { user } = useAuth();
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [exportPlan, setExportPlan] = useState<ExportPlan | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportComplete, setExportComplete] = useState(false);

  const handleGetPlan = async () => {
    setIsLoadingPlan(true);
    setExportPlan(null);
    setExportComplete(false);
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

  const handleStartExport = async () => {
    if (!exportPlan) return;

    setIsExporting(true);
    setExportComplete(false);
    
    const progress: ExportProgress = {
      currentBatch: 0,
      totalBatches: exportPlan.totalBatches,
      currentTable: '',
      currentBatchInTable: 0,
      totalBatchesInTable: 0,
      downloadedFiles: [],
      failedFiles: [],
      totalRowsExported: 0,
    };
    setExportProgress(progress);

    // Group batches by table for progress display
    const batchesByTable: Record<string, BatchInfo[]> = {};
    for (const batch of exportPlan.batches) {
      if (!batchesByTable[batch.table]) {
        batchesByTable[batch.table] = [];
      }
      batchesByTable[batch.table].push(batch);
    }

    try {
      for (let i = 0; i < exportPlan.batches.length; i++) {
        const batch = exportPlan.batches[i];
        const tableBatches = batchesByTable[batch.table];
        const batchInTable = tableBatches.findIndex(b => b.batchIndex === batch.batchIndex) + 1;
        
        // Update progress
        progress.currentBatch = i + 1;
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
          const filename = tableBatches.length > 1 
            ? `${batch.table}_batch_${batch.batchIndex + 1}.json`
            : `${batch.table}.json`;
          progress.failedFiles.push(filename);
        }
        
        setExportProgress({ ...progress });
      }

      setExportComplete(true);
      
      if (progress.failedFiles.length === 0) {
        toast.success(`Export complete! Downloaded ${progress.downloadedFiles.length} files (${progress.totalRowsExported.toLocaleString()} rows)`);
      } else {
        toast.warning(`Export finished with ${progress.failedFiles.length} failed files. ${progress.downloadedFiles.length} files downloaded successfully.`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const progressPercent = exportProgress 
    ? Math.round((exportProgress.currentBatch / exportProgress.totalBatches) * 100)
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
                disabled={isLoadingPlan || isExporting}
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

          {/* Step 2: Start Export */}
          {exportPlan && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Step 2: Download All Files</Label>
              <Button 
                onClick={handleStartExport} 
                disabled={isExporting || exportComplete}
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : exportComplete ? (
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
            </div>
          )}

          {/* Progress display */}
          {exportProgress && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {isExporting ? (
                    <>Downloading: <span className="font-mono">{exportProgress.currentTable}</span> (batch {exportProgress.currentBatchInTable}/{exportProgress.totalBatchesInTable})</>
                  ) : (
                    'Export finished'
                  )}
                </span>
                <span className="font-mono">{exportProgress.currentBatch}/{exportProgress.totalBatches}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{exportProgress.downloadedFiles.length} files downloaded</span>
                </div>
                {exportProgress.failedFiles.length > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>{exportProgress.failedFiles.length} failed</span>
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
              {exportProgress.failedFiles.length > 0 && (
                <div className="text-xs space-y-1 bg-destructive/10 rounded p-2">
                  <div className="font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Failed downloads:
                  </div>
                  {exportProgress.failedFiles.map((file, i) => (
                    <div key={i} className="text-destructive/80">{file}</div>
                  ))}
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
