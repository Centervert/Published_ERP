import { useState, useCallback } from 'react';
import { useImprints } from '@/hooks/useImprints';
import { useUsers } from '@/hooks/useUsers';
import { useImportJobs } from '@/hooks/useImportJobs';
import { useClientImport } from '@/hooks/useClientImport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Loader2, Monitor, Cloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const NONE_VALUE = '__none__';
const LARGE_FILE_THRESHOLD = 5000; // Switch to client-side for files > 5000 rows

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  rawContent: string;
}

interface ColumnMapping {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  imprint: string;
  asc_name: string;
  asc_email: string;
  created_at: string;
}

interface ImportOptions {
  overwriteCreatedAt: boolean;
}

export function ImportCSVDialog({ open, onOpenChange }: ImportCSVDialogProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    imprint: '',
    asc_name: '',
    asc_email: '',
    created_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [importMode, setImportMode] = useState<'auto' | 'client' | 'server'>('auto');
  const [importOptions, setImportOptions] = useState<ImportOptions>({ overwriteCreatedAt: true });
  const [importResults, setImportResults] = useState<{ duplicates: string[]; invalidEmails: string[]; unmatchedAsc: string[]; warnings: string[] } | null>(null);
  
  const { imprints } = useImprints();
  const { users, isLoading: usersLoading } = useUsers();
  const { createJob, startProcessing } = useImportJobs();
  const { processImport, isProcessing, progress, reset: resetClientImport } = useClientImport();

  const isLargeFile = parsedData && parsedData.rows.length > LARGE_FILE_THRESHOLD;
  const useClientMode = importMode === 'client' || (importMode === 'auto' && isLargeFile);

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const matches = line.match(/("([^"]*)")|([^,]+)/g) || [];
      return matches.map(m => m.trim().replace(/^["']|["']$/g, ''));
    });
    return { headers, rows };
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData({ ...parsed, rawContent: text });

      // Auto-detect column mapping
      const lowerHeaders = parsed.headers.map(h => h.toLowerCase().trim());

      const findAscNameIndex = lowerHeaders.findIndex(h => 
        h.includes('owner_name') || h.includes('asc_name') ||
        (h.includes('owner') && h.includes('name')) ||
        h === 'owner name' || h === 'asc name'
      );
      const findAscEmailIndex = lowerHeaders.findIndex(h => 
        h.includes('owner_email') || h.includes('asc_email') ||
        (h.includes('owner') && h.includes('email')) ||
        h === 'owner email' || h === 'asc email'
      );
      const findAscGenericIndex = lowerHeaders.findIndex(h =>
        h === 'asc' || h === 'author success coach' || h === 'owner' ||
        (h.includes('asc') && !h.includes('email') && !h.includes('name'))
      );

      const findCreatedAtIndex = lowerHeaders.findIndex((h) =>
        h === 'created_at' ||
        h === 'created at' ||
        h === 'create_date' ||
        h === 'create date' ||
        h === 'date created' ||
        h === 'creation date' ||
        (h.includes('create') && h.includes('date')) ||
        (h.includes('created') && h.includes('date'))
      );

      let ascNameHeader = findAscNameIndex >= 0 ? parsed.headers[findAscNameIndex] : '';
      let ascEmailHeader = findAscEmailIndex >= 0 ? parsed.headers[findAscEmailIndex] : '';

      // If there's a single ASC column, guess whether it's name or email by sampling values
      if (!ascNameHeader && !ascEmailHeader && findAscGenericIndex >= 0) {
        const colHeader = parsed.headers[findAscGenericIndex];
        const sample = parsed.rows.slice(0, 20).map(r => (r[findAscGenericIndex] || '').trim());
        const emailHits = sample.filter(v => v.includes('@')).length;
        if (emailHits >= Math.max(1, Math.floor(sample.length / 2))) {
          ascEmailHeader = colHeader;
        } else {
          ascNameHeader = colHeader;
        }
      }

      setColumnMapping({
        email: parsed.headers[lowerHeaders.findIndex(h => h.includes('email') && !h.includes('owner'))] || '',
        first_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('first') || h === 'name')] || '',
        last_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('last'))] || '',
        phone: parsed.headers[lowerHeaders.findIndex(h => h.includes('phone'))] || '',
        imprint: parsed.headers[lowerHeaders.findIndex(h => h.includes('publisher') || h.includes('imprint'))] || '',
        asc_name: ascNameHeader,
        asc_email: ascEmailHeader,
        created_at: findCreatedAtIndex >= 0 ? parsed.headers[findCreatedAtIndex] : '',
      });
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleStartImport = async () => {
    if (!parsedData || !columnMapping.email || !file || !user) return;

    setSubmitting(true);
    setImportResults(null);
    
    try {
      if (useClientMode) {
        // Client-side processing for large files
        const result = await processImport(
          parsedData.rows,
          parsedData.headers,
          columnMapping,
          file.name,
          importOptions
        );

        // Set import results for display
        setImportResults({
          duplicates: result?.duplicates || [],
          invalidEmails: result?.invalidEmails || [],
          unmatchedAsc: result?.unmatchedAsc || [],
          warnings: result?.warnings || [],
        });

        toast.success('Import completed', {
          description: `${result?.successful || 0} contacts imported, ${result?.failed || 0} failed`,
        });
      } else {
        // Server-side processing for smaller files (options not yet supported)
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('import-files')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const job = await createJob.mutateAsync({
          fileName: file.name,
          filePath: filePath,
          columnMapping: { ...columnMapping },
          totalRows: parsedData.rows.length,
        });

        startProcessing.mutate(job.id);

        toast.success('Import started', {
          description: 'Check the Imports tab to track progress',
        });

        handleClose();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to start import', {
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return; // Don't close while processing
    setFile(null);
    setParsedData(null);
    setColumnMapping({ email: '', first_name: '', last_name: '', phone: '', imprint: '', asc_name: '', asc_email: '', created_at: '' });
    setImportMode('auto');
    setImportOptions({ overwriteCreatedAt: true });
    setImportResults(null);
    resetClientImport();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file and map columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress display during client-side processing */}
          {isProcessing && progress && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Processing...</span>
                <span>{progress.processed} / {progress.total}</span>
              </div>
              <Progress value={(progress.processed / progress.total) * 100} />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="text-green-600">{progress.successful} successful</span>
                <span className="text-red-600">{progress.failed} failed</span>
              </div>
            </div>
          )}

          {!parsedData && !isProcessing ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">CSV files only</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
            </label>
          ) : parsedData && !isProcessing ? (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.rows.length.toLocaleString()} rows found
                    {isLargeFile && <span className="text-amber-600 ml-1">(large file)</span>}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setFile(null);
                  setParsedData(null);
                }}>
                  Change
                </Button>
              </div>

              {/* Import mode selector for large files */}
              {isLargeFile && (
                <div className="space-y-2">
                  <Label>Processing Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={useClientMode ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setImportMode('client')}
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Browser (recommended)
                    </Button>
                    <Button
                      type="button"
                      variant={!useClientMode ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start"
                      onClick={() => setImportMode('server')}
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      Server
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {useClientMode 
                      ? 'Processes in your browser. Keep this tab open until complete.'
                      : 'Processes on server. May fail for very large files.'}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Email Column *</Label>
                  <Select
                    value={columnMapping.email}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, email: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select email column" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>First Name Column</Label>
                    <Select
                      value={columnMapping.first_name || NONE_VALUE}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, first_name: v === NONE_VALUE ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {parsedData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name Column</Label>
                    <Select
                      value={columnMapping.last_name || NONE_VALUE}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, last_name: v === NONE_VALUE ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {parsedData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Column</Label>
                  <Select
                      value={columnMapping.phone || NONE_VALUE}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, phone: v === NONE_VALUE ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {parsedData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Imprint/Publisher Column</Label>
                  <Select
                      value={columnMapping.imprint || NONE_VALUE}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, imprint: v === NONE_VALUE ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional - will match by name" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {parsedData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Available imprints: {imprints.map(i => i.name).join(', ') || 'None created yet'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Date Created Column</Label>
                  <Select
                    value={columnMapping.created_at || NONE_VALUE}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, created_at: v === NONE_VALUE ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {parsedData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If provided, contacts will use this date instead of today.
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="overwriteCreatedAt"
                      checked={importOptions.overwriteCreatedAt}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, overwriteCreatedAt: e.target.checked }))}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="overwriteCreatedAt" className="text-xs font-normal text-muted-foreground cursor-pointer">
                      Overwrite existing contact's created date
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>ASC Name Column</Label>
                    <Select
                      value={columnMapping.asc_name || NONE_VALUE}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, asc_name: v === NONE_VALUE ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {parsedData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ASC Email Column</Label>
                    <Select
                      value={columnMapping.asc_email || NONE_VALUE}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, asc_email: v === NONE_VALUE ? '' : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                        {parsedData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Active team members: {users.filter(u => u.active).map(u => u.full_name || u.email).join(', ') || 'None'}. 
                  Unmatched ASC info will be stored as text.
                </p>
              </div>
            </>
          ) : null}

          {/* Import Results Report */}
          {importResults && (
            <div className="space-y-3 p-4 bg-muted rounded-lg border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Import Complete</span>
              </div>
              
              {importResults.duplicates.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{importResults.duplicates.length} duplicate email(s) in file (last occurrence used)</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {importResults.duplicates.slice(0, 5).join(', ')}
                    {importResults.duplicates.length > 5 && ` +${importResults.duplicates.length - 5} more`}
                  </p>
                </div>
              )}

              {importResults.invalidEmails.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{importResults.invalidEmails.length} invalid email(s) skipped</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {importResults.invalidEmails.slice(0, 5).join(', ')}
                    {importResults.invalidEmails.length > 5 && ` +${importResults.invalidEmails.length - 5} more`}
                  </p>
                </div>
              )}

              {importResults.unmatchedAsc.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{importResults.unmatchedAsc.length} unmatched ASC(s) - placeholders created</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {importResults.unmatchedAsc.slice(0, 5).join(', ')}
                    {importResults.unmatchedAsc.length > 5 && ` +${importResults.unmatchedAsc.length - 5} more`}
                  </p>
                </div>
              )}

              {importResults.warnings.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{importResults.warnings.length} warning(s)</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {importResults.warnings.slice(0, 3).join('; ')}
                    {importResults.warnings.length > 3 && ` +${importResults.warnings.length - 3} more`}
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        <DialogFooter>
          {importResults ? (
            <>
              <Button variant="outline" onClick={() => {
                setImportResults(null);
                setFile(null);
                setParsedData(null);
                setColumnMapping({ email: '', first_name: '', last_name: '', phone: '', imprint: '', asc_name: '', asc_email: '', created_at: '' });
              }}>
                Import Another File
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Cancel'}
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={!parsedData || !columnMapping.email || submitting || isProcessing || ((columnMapping.asc_name || columnMapping.asc_email) && usersLoading)}
              >
                {(submitting || isProcessing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(columnMapping.asc_name || columnMapping.asc_email) && usersLoading 
                  ? 'Loading team...' 
                  : isProcessing 
                    ? `Processing ${progress?.processed || 0}/${progress?.total || 0}`
                    : `Start Import (${parsedData?.rows.length.toLocaleString() || 0} rows)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
