import { useState, useCallback, useEffect, useMemo } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useImprints } from '@/hooks/useImprints';
import { useUsers } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
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
  const [skippedRows, setSkippedRows] = useState<{ row: string[]; rowIndex: number; error: string }[]>([]);
  const [showForceImport, setShowForceImport] = useState(false);
  
  const { bulkCreateContacts } = useContacts();
  const { imprints } = useImprints();
  const { users, isLoading: usersLoading } = useUsers();

  // Create lookup maps - use useMemo to ensure they're updated when data loads
  const imprintLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    imprints.forEach(imp => {
      lookup.set(imp.name.toLowerCase().trim(), imp.id);
    });
    return lookup;
  }, [imprints]);

  // User lookup for ASC assignment - match any user by name or email
  const { userNameLookup, userEmailLookup } = useMemo(() => {
    const nameLookup = new Map<string, string>();
    const emailLookup = new Map<string, string>();
    users.forEach(u => {
      if (u.full_name) {
        nameLookup.set(u.full_name.toLowerCase().trim(), u.id);
      }
      if (u.email) {
        emailLookup.set(u.email.toLowerCase().trim(), u.id);
      }
    });
    return { userNameLookup: nameLookup, userEmailLookup: emailLookup };
  }, [users]);

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
      
      // Helper to find ASC-related columns (owner name/email patterns)
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
      
      console.log('CSV Column Detection:', {
        headers: parsed.headers,
        lowerHeaders,
        ascNameIndex: findAscNameIndex,
        ascEmailIndex: findAscEmailIndex,
      });

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

  const handleImport = async (forceImport = false) => {
    if (!parsedData || !columnMapping.email) return;

    setImporting(true);
    setProgress(1);
    setErrors([]);
    setWarnings([]);
    setImportComplete(false);
    setImportedCount(0);
    setSkippedRows([]);
    setShowForceImport(false);

    const emailIndex = parsedData.headers.indexOf(columnMapping.email);
    const firstNameIndex = columnMapping.first_name ? parsedData.headers.indexOf(columnMapping.first_name) : -1;
    const lastNameIndex = columnMapping.last_name ? parsedData.headers.indexOf(columnMapping.last_name) : -1;
    const phoneIndex = columnMapping.phone ? parsedData.headers.indexOf(columnMapping.phone) : -1;
    const imprintIndex = columnMapping.imprint ? parsedData.headers.indexOf(columnMapping.imprint) : -1;
    const ascNameIndex = columnMapping.asc_name ? parsedData.headers.indexOf(columnMapping.asc_name) : -1;
    const ascEmailIndex = columnMapping.asc_email ? parsedData.headers.indexOf(columnMapping.asc_email) : -1;

    // Debug: Log ASC column mapping and lookup status
    console.log('ASC Import Debug:', {
      ascNameColumn: columnMapping.asc_name,
      ascEmailColumn: columnMapping.asc_email,
      ascNameIndex,
      ascEmailIndex,
      usersCount: users.length,
      userNameLookupSize: userNameLookup.size,
      userEmailLookupSize: userEmailLookup.size,
      sampleUsers: users.slice(0, 3).map(u => ({ name: u.full_name, email: u.email, id: u.id })),
    });

    const importWarnings: string[] = [];
    const unmatchedImprints = new Set<string>();
    const skipped: { row: string[]; rowIndex: number; error: string }[] = [];

    // Phase 1 (1-15%): Collect and create placeholder profiles
    setProgress(5);
    const ascIdentifiersToCreate = new Map<string, { name?: string; email?: string }>();
    
    parsedData.rows.forEach((row) => {
      let ascName: string | undefined;
      let ascEmail: string | undefined;
      
      if (ascNameIndex >= 0) {
        ascName = row[ascNameIndex]?.trim();
      }
      if (ascEmailIndex >= 0) {
        ascEmail = row[ascEmailIndex]?.trim()?.toLowerCase();
      }
      
      if (ascName || ascEmail) {
        const existingByName = ascName ? userNameLookup.get(ascName.toLowerCase().trim()) : undefined;
        const existingByEmail = ascEmail ? userEmailLookup.get(ascEmail) : undefined;
        
        if (!existingByName && !existingByEmail) {
          const key = ascEmail || ascName?.toLowerCase().trim();
          if (key && !ascIdentifiersToCreate.has(key)) {
            ascIdentifiersToCreate.set(key, { name: ascName, email: ascEmail });
          }
        }
      }
    });

    setProgress(10);
    const placeholderLookup = new Map<string, string>();
    
    if (ascIdentifiersToCreate.size > 0) {
      const placeholdersToInsert = Array.from(ascIdentifiersToCreate.entries()).map(([key, data]) => ({
        id: crypto.randomUUID(),
        email: data.email || `placeholder-${key.replace(/[^a-z0-9]/gi, '-')}@placeholder.local`,
        full_name: data.name || data.email || key,
        active: false,
      }));
      
      placeholdersToInsert.forEach((p, idx) => {
        const key = Array.from(ascIdentifiersToCreate.keys())[idx];
        placeholderLookup.set(key, p.id);
        const data = ascIdentifiersToCreate.get(key);
        if (data?.name) {
          placeholderLookup.set(data.name.toLowerCase().trim(), p.id);
        }
        if (data?.email) {
          placeholderLookup.set(data.email, p.id);
        }
      });
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(placeholdersToInsert);
      
      if (insertError) {
        console.error('Error creating placeholder profiles:', insertError);
        importWarnings.push(`Could not create placeholder profiles: ${insertError.message}`);
        placeholderLookup.clear();
      } else {
        importWarnings.push(`Created ${placeholdersToInsert.length} placeholder team member(s)`);
      }
    }

    setProgress(15);

    // Phase 2 (15-50%): Process and validate rows
    const validContacts: { 
      email: string; 
      first_name?: string; 
      last_name?: string;
      phone?: string;
      imprint_id?: string;
      assigned_asc?: string;
    }[] = [];

    const totalRows = parsedData.rows.length;
    parsedData.rows.forEach((row, index) => {
      const email = row[emailIndex]?.trim();
      
      if (!email) {
        skipped.push({ row, rowIndex: index + 2, error: 'Empty email' });
        return;
      }

      try {
        emailSchema.parse(email);
        
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

        let ascId: string | undefined;
        if (ascNameIndex >= 0) {
          const ascName = row[ascNameIndex]?.trim();
          if (ascName) {
            ascId = userNameLookup.get(ascName.toLowerCase().trim()) 
                 || placeholderLookup.get(ascName.toLowerCase().trim());
            // Debug first few rows
            if (index < 3) {
              console.log(`Row ${index}: ASC name lookup for "${ascName}" -> ${ascId || 'NOT FOUND'}`);
            }
          }
        }
        if (!ascId && ascEmailIndex >= 0) {
          const ascEmail = row[ascEmailIndex]?.trim()?.toLowerCase();
          if (ascEmail) {
            ascId = userEmailLookup.get(ascEmail) || placeholderLookup.get(ascEmail);
            // Debug first few rows
            if (index < 3) {
              console.log(`Row ${index}: ASC email lookup for "${ascEmail}" -> ${ascId || 'NOT FOUND'}`);
            }
          }
        }

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
          skipped.push({ row, rowIndex: index + 2, error: 'Empty email after normalization' });
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
        skipped.push({ row, rowIndex: index + 2, error: `Invalid email "${email}"` });
      }

      // Update progress: 15% to 50%
      setProgress(15 + Math.round(((index + 1) / totalRows) * 35));
    });

    if (unmatchedImprints.size > 0) {
      importWarnings.push(`Unmatched imprints (${unmatchedImprints.size}): ${Array.from(unmatchedImprints).slice(0, 5).join(', ')}${unmatchedImprints.size > 5 ? '...' : ''}`);
    }

    // Phase 3 (50-100%): Import valid contacts
    if (validContacts.length > 0) {
      const batchSize = 100;
      const totalBatches = Math.ceil(validContacts.length / batchSize);
      
      for (let i = 0; i < validContacts.length; i += batchSize) {
        const batch = validContacts.slice(i, i + batchSize);
        await bulkCreateContacts.mutateAsync(batch);
        const batchNum = Math.floor(i / batchSize) + 1;
        // Update progress: 50% to 100%
        setProgress(50 + Math.round((batchNum / totalBatches) * 50));
      }
    }

    setProgress(100);
    setWarnings(importWarnings);
    setImporting(false);
    setImportComplete(true);
    setImportedCount(validContacts.length);
    setSkippedRows(skipped);
    
    // Show force import option if there were skipped rows
    if (skipped.length > 0) {
      setShowForceImport(true);
      setErrors(skipped.slice(0, 10).map(s => `Row ${s.rowIndex}: ${s.error}`));
    }
    
    // Auto-close only if no issues
    if (skipped.length === 0 && importWarnings.length === 0) {
      handleClose();
    }
  };

  const handleForceImport = async () => {
    if (skippedRows.length === 0) return;

    setImporting(true);
    setProgress(1);
    
    const emailIndex = parsedData?.headers.indexOf(columnMapping.email) ?? -1;
    const firstNameIndex = columnMapping.first_name ? parsedData?.headers.indexOf(columnMapping.first_name) ?? -1 : -1;
    const lastNameIndex = columnMapping.last_name ? parsedData?.headers.indexOf(columnMapping.last_name) ?? -1 : -1;
    const phoneIndex = columnMapping.phone ? parsedData?.headers.indexOf(columnMapping.phone) ?? -1 : -1;

    const contactsToForce = skippedRows
      .map(({ row }) => {
        const email = row[emailIndex]?.trim();
        if (!email) return null;
        
        return {
          email: email.toLowerCase(),
          first_name: firstNameIndex >= 0 ? normalizeName(row[firstNameIndex]) || undefined : undefined,
          last_name: lastNameIndex >= 0 ? normalizeName(row[lastNameIndex]) || undefined : undefined,
          phone: phoneIndex >= 0 ? normalizePhone(row[phoneIndex]) || undefined : undefined,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (contactsToForce.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < contactsToForce.length; i += batchSize) {
        const batch = contactsToForce.slice(i, i + batchSize);
        await bulkCreateContacts.mutateAsync(batch);
        setProgress(Math.round(((i + batchSize) / contactsToForce.length) * 100));
      }
    }

    setProgress(100);
    setImporting(false);
    setImportedCount(prev => prev + contactsToForce.length);
    setSkippedRows([]);
    setShowForceImport(false);
    setErrors([]);
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
    setSkippedRows([]);
    setShowForceImport(false);
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
                  Active team members: {users.filter(u => u.active).map(u => u.full_name || u.email).join(', ') || 'None'}. 
                  Unmatched names will create placeholder profiles for history tracking.
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
                    <span className="text-sm font-medium">{skippedRows.length} row{skippedRows.length !== 1 ? 's' : ''} skipped:</span>
                  </div>
                  {errors.map((error, i) => (
                    <p key={i} className="text-xs text-destructive">{error}</p>
                  ))}
                  {skippedRows.length > 10 && (
                    <p className="text-xs text-muted-foreground">...and {skippedRows.length - 10} more</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {importComplete ? (
            <>
              {showForceImport && skippedRows.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleForceImport}
                  disabled={importing}
                  className="w-full sm:w-auto"
                >
                  {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Force Import {skippedRows.length} Skipped Row{skippedRows.length !== 1 ? 's' : ''}
                </Button>
              )}
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => handleImport()}
                disabled={!parsedData || !columnMapping.email || importing || ((columnMapping.asc_name || columnMapping.asc_email) && usersLoading)}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(columnMapping.asc_name || columnMapping.asc_email) && usersLoading ? 'Loading team...' : `Import ${parsedData?.rows.length || 0} Contacts`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
