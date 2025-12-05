import { useState, useCallback } from 'react';
import { useContacts } from '@/hooks/useContacts';
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
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email();

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  email: string;
  first_name: string;
  last_name: string;
}

export function ImportCSVDialog({ open, onOpenChange }: ImportCSVDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    email: '',
    first_name: '',
    last_name: '',
  });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  
  const { bulkCreateContacts } = useContacts();

  const parseCSV = (text: string): ParsedData => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      // Handle quoted values with commas
      const matches = line.match(/("([^"]*)")|([^,]+)/g) || [];
      return matches.map(m => m.trim().replace(/^["']|["']$/g, ''));
    });
    return { headers, rows };
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);

      // Auto-detect column mapping
      const lowerHeaders = parsed.headers.map(h => h.toLowerCase());
      setColumnMapping({
        email: parsed.headers[lowerHeaders.findIndex(h => h.includes('email'))] || '',
        first_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('first') || h === 'name')] || '',
        last_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('last'))] || '',
      });
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleImport = async () => {
    if (!parsedData || !columnMapping.email) return;

    setImporting(true);
    setProgress(0);
    setErrors([]);

    const emailIndex = parsedData.headers.indexOf(columnMapping.email);
    const firstNameIndex = columnMapping.first_name ? parsedData.headers.indexOf(columnMapping.first_name) : -1;
    const lastNameIndex = columnMapping.last_name ? parsedData.headers.indexOf(columnMapping.last_name) : -1;

    const validContacts: { email: string; first_name?: string; last_name?: string }[] = [];
    const importErrors: string[] = [];

    parsedData.rows.forEach((row, index) => {
      const email = row[emailIndex]?.trim();
      
      if (!email) {
        importErrors.push(`Row ${index + 2}: Empty email`);
        return;
      }

      try {
        emailSchema.parse(email);
        validContacts.push({
          email,
          first_name: firstNameIndex >= 0 ? row[firstNameIndex]?.trim() : undefined,
          last_name: lastNameIndex >= 0 ? row[lastNameIndex]?.trim() : undefined,
        });
      } catch {
        importErrors.push(`Row ${index + 2}: Invalid email "${email}"`);
      }

      setProgress(Math.round(((index + 1) / parsedData.rows.length) * 50));
    });

    if (validContacts.length > 0) {
      // Import in batches of 100
      const batchSize = 100;
      for (let i = 0; i < validContacts.length; i += batchSize) {
        const batch = validContacts.slice(i, i + batchSize);
        await bulkCreateContacts.mutateAsync(batch);
        setProgress(50 + Math.round(((i + batchSize) / validContacts.length) * 50));
      }
    }

    setErrors(importErrors.slice(0, 10)); // Show first 10 errors
    setImporting(false);
    
    if (importErrors.length === 0) {
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setColumnMapping({ email: '', first_name: '', last_name: '' });
    setProgress(0);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your contacts. Map the columns to import.
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
                      value={columnMapping.first_name}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, first_name: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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
                      value={columnMapping.last_name}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, last_name: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {parsedData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Importing... {progress}%
                  </p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Some rows had errors:</span>
                  </div>
                  {errors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">{error}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || !columnMapping.email || importing}
          >
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {parsedData?.rows.length || 0} Contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
