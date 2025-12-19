import { useState, useCallback } from 'react';
import { useImprints } from '@/hooks/useImprints';
import { useUsers } from '@/hooks/useUsers';
import { useImportJobs } from '@/hooks/useImportJobs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NONE_VALUE = '__none__';

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
  });
  const [submitting, setSubmitting] = useState(false);
  
  const { imprints } = useImprints();
  const { users, isLoading: usersLoading } = useUsers();
  const { createJob, startProcessing } = useImportJobs();

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
      const lowerHeaders = parsed.headers.map(h => h.toLowerCase());
      
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

      setColumnMapping({
        email: parsed.headers[lowerHeaders.findIndex(h => h.includes('email') && !h.includes('owner'))] || '',
        first_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('first') || h === 'name')] || '',
        last_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('last'))] || '',
        phone: parsed.headers[lowerHeaders.findIndex(h => h.includes('phone'))] || '',
        imprint: parsed.headers[lowerHeaders.findIndex(h => h.includes('publisher') || h.includes('imprint'))] || '',
        asc_name: findAscNameIndex >= 0 ? parsed.headers[findAscNameIndex] : '',
        asc_email: findAscEmailIndex >= 0 ? parsed.headers[findAscEmailIndex] : '',
      });
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleStartImport = async () => {
    if (!parsedData || !columnMapping.email || !file || !user) return;

    setSubmitting(true);
    
    try {
      // Upload CSV to storage first
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('import-files')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Create the import job with file path
      const job = await createJob.mutateAsync({
        fileName: file.name,
        filePath: filePath,
        columnMapping: { ...columnMapping },
        totalRows: parsedData.rows.length,
      });

      // Trigger background processing (don't await - it runs in background)
      startProcessing.mutate(job.id);

      toast.success('Import started', {
        description: 'Check the Imports tab to track progress',
      });

      handleClose();
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
    setFile(null);
    setParsedData(null);
    setColumnMapping({ email: '', first_name: '', last_name: '', phone: '', imprint: '', asc_name: '', asc_email: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file and map columns. Import runs in the background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!parsedData ? (
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
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.rows.length} rows found
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setFile(null);
                  setParsedData(null);
                }}>
                  Change
                </Button>
              </div>

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
                  Unmatched names will create placeholder profiles.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleStartImport}
            disabled={!parsedData || !columnMapping.email || submitting || ((columnMapping.asc_name || columnMapping.asc_email) && usersLoading)}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(columnMapping.asc_name || columnMapping.asc_email) && usersLoading 
              ? 'Loading team...' 
              : `Start Import (${parsedData?.rows.length || 0} rows)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
