import { useState, useCallback, useEffect } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { useUsers } from '@/hooks/useUsers';
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
import { Upload, FileText, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email();
const NONE_VALUE = '__none__';

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
  phone: string;
  imprint: string;
  asc_name: string;
  asc_email: string;
}

// Normalize email to lowercase
function normalizeEmail(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

// Normalize phone numbers - handle scientific notation and clean format
function normalizePhone(value: string | undefined): string | null {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  
  // Check if it's in scientific notation (e.g., 1.26378E+12)
  if (/[eE]/.test(trimmed)) {
    try {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        trimmed = String(Math.round(num));
      }
    } catch {
      // Fall through to continue processing
    }
  }
  
  // Check if it starts with + and preserve it
  const hasPlus = trimmed.startsWith('+');
  
  // Remove all non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, '');
  
  if (!digitsOnly) return null;
  
  // Return with + prefix if original had it
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

// Normalize names to Title Case (e.g., "JOHN DOE" → "John Doe", "jane smith" → "Jane Smith")
function normalizeName(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Convert to title case: capitalize first letter of each word, lowercase the rest
  // Also handle hyphenated names like "Mary-Jane" → "Mary-Jane"
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map(word => 
      word.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-')
    )
    .join(' ');
}

export function ImportCSVDialog({ open, onOpenChange }: ImportCSVDialogProps) {
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
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  
  const { bulkCreateContacts } = useContacts();
  const { imprints } = useImprints();
  const { users } = useUsers();

  // Create lookup maps
  const imprintLookup = new Map<string, string>();
  imprints.forEach(imp => {
    imprintLookup.set(imp.name.toLowerCase().trim(), imp.id);
  });

  // ASC users lookup (only users with 'asc' role)
  const ascUsers = users.filter(u => u.role === 'asc');
  const ascNameLookup = new Map<string, string>();
  const ascEmailLookup = new Map<string, string>();
  ascUsers.forEach(u => {
    if (u.full_name) {
      ascNameLookup.set(u.full_name.toLowerCase().trim(), u.id);
    }
    if (u.email) {
      ascEmailLookup.set(u.email.toLowerCase().trim(), u.id);
    }
  });

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
    setWarnings([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);

      // Auto-detect column mapping
      const lowerHeaders = parsed.headers.map(h => h.toLowerCase());
      setColumnMapping({
        email: parsed.headers[lowerHeaders.findIndex(h => h.includes('email') && !h.includes('owner'))] || '',
        first_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('first') || h === 'name')] || '',
        last_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('last'))] || '',
        phone: parsed.headers[lowerHeaders.findIndex(h => h.includes('phone'))] || '',
        imprint: parsed.headers[lowerHeaders.findIndex(h => h.includes('publisher') || h.includes('imprint'))] || '',
        asc_name: parsed.headers[lowerHeaders.findIndex(h => h.includes('owner_name') || h.includes('asc_name'))] || '',
        asc_email: parsed.headers[lowerHeaders.findIndex(h => h.includes('owner_email') || h.includes('asc_email'))] || '',
      });
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleImport = async () => {
    if (!parsedData || !columnMapping.email) return;

    setImporting(true);
    setProgress(0);
    setErrors([]);
    setWarnings([]);
    setImportComplete(false);
    setImportedCount(0);

    const emailIndex = parsedData.headers.indexOf(columnMapping.email);
    const firstNameIndex = columnMapping.first_name ? parsedData.headers.indexOf(columnMapping.first_name) : -1;
    const lastNameIndex = columnMapping.last_name ? parsedData.headers.indexOf(columnMapping.last_name) : -1;
    const phoneIndex = columnMapping.phone ? parsedData.headers.indexOf(columnMapping.phone) : -1;
    const imprintIndex = columnMapping.imprint ? parsedData.headers.indexOf(columnMapping.imprint) : -1;
    const ascNameIndex = columnMapping.asc_name ? parsedData.headers.indexOf(columnMapping.asc_name) : -1;
    const ascEmailIndex = columnMapping.asc_email ? parsedData.headers.indexOf(columnMapping.asc_email) : -1;

    const validContacts: { 
      email: string; 
      first_name?: string; 
      last_name?: string;
      phone?: string;
      imprint_id?: string;
      assigned_asc?: string;
    }[] = [];
    const importErrors: string[] = [];
    const importWarnings: string[] = [];
    const unmatchedImprints = new Set<string>();
    const unmatchedAscs = new Set<string>();

    parsedData.rows.forEach((row, index) => {
      const email = row[emailIndex]?.trim();
      
      if (!email) {
        importErrors.push(`Row ${index + 2}: Empty email`);
        return;
      }

      try {
        emailSchema.parse(email);
        
        // Process imprint
        let imprintId: string | undefined;
        if (imprintIndex >= 0) {
          const imprintName = row[imprintIndex]?.trim();
          if (imprintName) {
            imprintId = imprintLookup.get(imprintName.toLowerCase().trim());
            if (!imprintId) {
              unmatchedImprints.add(imprintName);
            }
          }
        }

        // Process ASC assignment
        let ascId: string | undefined;
        if (ascNameIndex >= 0) {
          const ascName = row[ascNameIndex]?.trim();
          if (ascName) {
            ascId = ascNameLookup.get(ascName.toLowerCase().trim());
            if (!ascId) {
              unmatchedAscs.add(ascName);
            }
          }
        }
        // Fallback to ASC email if name didn't match
        if (!ascId && ascEmailIndex >= 0) {
          const ascEmail = row[ascEmailIndex]?.trim();
          if (ascEmail) {
            ascId = ascEmailLookup.get(ascEmail.toLowerCase().trim());
            if (!ascId && !unmatchedAscs.has(row[ascNameIndex]?.trim() || '')) {
              unmatchedAscs.add(ascEmail);
            }
          }
        }

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
          importErrors.push(`Row ${index + 2}: Empty email after normalization`);
          return;
        }

        validContacts.push({
          email: normalizedEmail,
          first_name: firstNameIndex >= 0 ? normalizeName(row[firstNameIndex]) || undefined : undefined,
          last_name: lastNameIndex >= 0 ? normalizeName(row[lastNameIndex]) || undefined : undefined,
          phone: phoneIndex >= 0 ? normalizePhone(row[phoneIndex]) || undefined : undefined,
          imprint_id: imprintId,
          assigned_asc: ascId,
        });
      } catch {
        importErrors.push(`Row ${index + 2}: Invalid email "${email}"`);
      }

      setProgress(Math.round(((index + 1) / parsedData.rows.length) * 50));
    });

    // Add warnings for unmatched values
    if (unmatchedImprints.size > 0) {
      importWarnings.push(`Unmatched imprints (${unmatchedImprints.size}): ${Array.from(unmatchedImprints).slice(0, 5).join(', ')}${unmatchedImprints.size > 5 ? '...' : ''}`);
    }
    if (unmatchedAscs.size > 0) {
      importWarnings.push(`Unmatched ASCs (${unmatchedAscs.size}): ${Array.from(unmatchedAscs).slice(0, 5).join(', ')}${unmatchedAscs.size > 5 ? '...' : ''}`);
    }

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
    setWarnings(importWarnings);
    setImporting(false);
    setImportComplete(true);
    setImportedCount(validContacts.length);
    
    // Auto-close only if no issues at all
    if (importErrors.length === 0 && importWarnings.length === 0) {
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setColumnMapping({ email: '', first_name: '', last_name: '', phone: '', imprint: '', asc_name: '', asc_email: '' });
    setProgress(0);
    setErrors([]);
    setWarnings([]);
    setImportComplete(false);
    setImportedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  Available ASCs: {ascUsers.map(u => u.full_name || u.email).join(', ') || 'None with ASC role'}
                </p>
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Importing... {progress}%
                  </p>
                </div>
              )}

              {importComplete && importedCount > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm font-medium text-green-600">
                    ✓ Successfully imported {importedCount} contact{importedCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Some values couldn't be matched:</span>
                  </div>
                  {warnings.map((warning, i) => (
                    <p key={i} className="text-xs text-yellow-600">{warning}</p>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    These contacts were still imported but without the unmatched field values.
                  </p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{errors.length} row{errors.length !== 1 ? 's' : ''} skipped due to errors:</span>
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
          {importComplete ? (
            <Button onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
