import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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

interface ImportProgress {
  processed: number;
  successful: number;
  failed: number;
  total: number;
  errors: { row: number; error: string }[];
  warnings: string[];
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: { row: number; error: string }[];
  warnings: string[];
  duplicates: string[];
  invalidEmails: string[];
  unmatchedAsc: string[];
}

const BATCH_SIZE = 50;

export function useClientImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const processImport = useCallback(async (
    rows: string[][],
    headers: string[],
    columnMapping: ColumnMapping,
    fileName: string,
    options: ImportOptions = { overwriteCreatedAt: true }
  ): Promise<ImportResult | undefined> => {
    if (!user) return;

    setIsProcessing(true);
    setProgress({
      processed: 0,
      successful: 0,
      failed: 0,
      total: rows.length,
      errors: [],
      warnings: [],
    });

    // Tracking arrays for results report
    const duplicates: string[] = [];
    const invalidEmails: string[] = [];
    const unmatchedAsc: string[] = [];

    // Create job record for tracking
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert([{
        file_name: fileName,
        column_mapping: columnMapping as any,
        total_rows: rows.length,
        status: 'processing',
        created_by: user.id,
        started_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (jobError) {
      setIsProcessing(false);
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    const jobId = job.id;

    // Build column index map
    const getColIndex = (col: string) => col ? headers.indexOf(col) : -1;
    const emailIdx = getColIndex(columnMapping.email);
    const firstNameIdx = getColIndex(columnMapping.first_name);
    const lastNameIdx = getColIndex(columnMapping.last_name);
    const phoneIdx = getColIndex(columnMapping.phone);
    const imprintIdx = getColIndex(columnMapping.imprint);
    const ascNameIdx = getColIndex(columnMapping.asc_name);
    const ascEmailIdx = getColIndex(columnMapping.asc_email);
    const createdAtIdx = getColIndex(columnMapping.created_at);

    const parseCreatedAt = (raw: string | undefined): string | undefined => {
      const v = raw?.trim();
      if (!v) return undefined;

      if (/^\d+$/.test(v)) {
        const num = Number(v);
        if (!Number.isNaN(num)) {
          // epoch ms (13+) or epoch seconds (10)
          if (v.length >= 13) return new Date(num).toISOString();
          if (v.length === 10) return new Date(num * 1000).toISOString();
        }
      }

      const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (mdy) {
        const mm = Number(mdy[1]);
        const dd = Number(mdy[2]);
        const yyyy = Number(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3]);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900) {
          return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0)).toISOString();
        }
      }

      const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) {
        const yyyy = Number(ymd[1]);
        const mm = Number(ymd[2]);
        const dd = Number(ymd[3]);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0)).toISOString();
        }
      }

      const parsed = Date.parse(v);
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
      return undefined;
    };

    // Fetch imprints for matching
    const { data: imprints } = await supabase.from('imprints').select('id, name');
    const imprintMap = new Map((imprints || []).map(i => [i.name.toLowerCase(), i.id]));

    // Fetch staff members for ASC matching (preferred)
    const { data: staffMembers } = await supabase.from('staff').select('id, email, full_name');
    const staffEmailMap = new Map((staffMembers || []).map(s => [s.email.toLowerCase(), s.id]));
    const staffNameMap = new Map((staffMembers || []).map(s => [s.full_name?.toLowerCase() || '', s.id]));

    // Fetch existing users (legacy fallback)
    const { data: existingUsers } = await supabase.from('profiles').select('id, email, full_name');
    const userEmailMap = new Map((existingUsers || []).map(u => [u.email.toLowerCase(), u.id]));
    const userNameMap = new Map((existingUsers || []).map(u => [u.full_name?.toLowerCase() || '', u.id]));

    // Helper to build fallback text from name + email
    const buildFallbackText = (name?: string, email?: string): string | null => {
      const n = name?.trim() || '';
      const e = email?.trim().toLowerCase() || '';
      if (n && e && e !== 'no owner_email') return `${n} <${e}>`;
      if (n && n.toLowerCase() !== 'unassigned') return n;
      if (e && e !== 'no owner_email') return e;
      return null;
    };

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];
    const warnings: string[] = [];

    // Process in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const contacts: any[] = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 2; // +2 for 1-indexed and header row

        try {
          const email = emailIdx >= 0 ? row[emailIdx]?.trim().toLowerCase() : '';
          if (!email || !email.includes('@')) {
            errors.push({ row: rowNum, error: 'Invalid or missing email' });
            invalidEmails.push(email || `(row ${rowNum})`);
            failed++;
            continue;
          }

          // Match imprint
          let imprintId: string | null = null;
          const imprintRaw = imprintIdx >= 0 ? row[imprintIdx]?.trim() : '';
          if (imprintIdx >= 0 && imprintRaw) {
            const imprintName = imprintRaw.toLowerCase();
            imprintId = imprintMap.get(imprintName) || null;
            if (!imprintId) {
              warnings.push(`Row ${rowNum}: Imprint "${imprintRaw}" not found`);
            }
          }

          // Match ASC (hybrid: try staff first, then profile, fallback to text)
          let staffAscId: string | null = null;
          let ascId: string | null = null;
          let ascText: string | null = null;
          const ascEmail = ascEmailIdx >= 0 ? row[ascEmailIdx]?.trim().toLowerCase() : '';
          const ascName = ascNameIdx >= 0 ? row[ascNameIdx]?.trim() : '';

          // Priority 1: Match staff by email
          if (ascEmail && ascEmail !== 'no owner_email') {
            staffAscId = staffEmailMap.get(ascEmail) || null;
          }
          // Priority 2: Match staff by name
          if (!staffAscId && ascName && ascName.toLowerCase() !== 'unassigned') {
            staffAscId = staffNameMap.get(ascName.toLowerCase()) || null;
          }
          // Priority 3: Legacy profile match by email
          if (!staffAscId && ascEmail && ascEmail !== 'no owner_email') {
            ascId = userEmailMap.get(ascEmail) || null;
          }
          // Priority 4: Legacy profile match by name
          if (!staffAscId && !ascId && ascName && ascName.toLowerCase() !== 'unassigned') {
            ascId = userNameMap.get(ascName.toLowerCase()) || null;
          }
          // Priority 5: Fallback text
          if (!staffAscId && !ascId && (ascEmail || ascName)) {
            ascText = buildFallbackText(ascName, ascEmail);
            if (ascText && !unmatchedAsc.includes(ascText)) unmatchedAsc.push(ascText);
          }

          const createdAt = (options.overwriteCreatedAt && createdAtIdx >= 0) ? parseCreatedAt(row[createdAtIdx]) : undefined;

          const contact: any = {
            email,
            created_by: user.id,
          };

          if (firstNameIdx >= 0) contact.first_name = row[firstNameIdx]?.trim() || null;
          if (lastNameIdx >= 0) contact.last_name = row[lastNameIdx]?.trim() || null;
          if (phoneIdx >= 0) contact.phone = row[phoneIdx]?.trim() || null;

          if (imprintIdx >= 0 && imprintId) contact.imprint_id = imprintId;

          // Hybrid ASC: store staff_asc_id if matched, else profile id, else fallback text
          if ((ascEmailIdx >= 0 && ascEmail) || (ascNameIdx >= 0 && ascName)) {
            contact.staff_asc_id = staffAscId;
            contact.assigned_asc = staffAscId ? null : ascId;
            contact.assigned_asc_text = (staffAscId || ascId) ? null : ascText;
          }

          if (createdAt) contact.created_at = createdAt;

          contacts.push(contact);
        } catch (err: any) {
          errors.push({ row: rowNum, error: err.message });
          failed++;
        }
      }

      // Upsert contacts (dedupe within the batch to avoid ON CONFLICT errors)
      if (contacts.length > 0) {
        const byEmail = new Map<string, any>();
        for (const c of contacts) {
          if (byEmail.has(String(c.email))) {
            if (!duplicates.includes(c.email)) duplicates.push(c.email);
          }
          byEmail.set(String(c.email), c);
        }
        const dedupedContacts = Array.from(byEmail.values());

        const { error: upsertError, data: upserted } = await supabase
          .from('contacts')
          .upsert(dedupedContacts, { onConflict: 'email', ignoreDuplicates: false })
          .select('id');

        if (upsertError) {
          for (let k = 0; k < dedupedContacts.length; k++) {
            errors.push({ row: i + k + 2, error: upsertError.message });
            failed++;
          }
        } else {
          successful += upserted?.length || dedupedContacts.length;
        }
      }

      processed += batch.length;

      // Update progress
      setProgress({
        processed,
        successful,
        failed,
        total: rows.length,
        errors: errors.slice(-50), // Keep last 50 errors
        warnings: warnings.slice(-50),
      });

      // Update job record periodically
      if (i % (BATCH_SIZE * 5) === 0 || i + BATCH_SIZE >= rows.length) {
        await supabase
          .from('import_jobs')
          .update({
            processed_rows: processed,
            successful_rows: successful,
            failed_rows: failed,
            errors: errors.slice(-100),
            warnings: warnings.slice(-100),
          })
          .eq('id', jobId);
      }
    }

    // Final update
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        processed_rows: processed,
        successful_rows: successful,
        failed_rows: failed,
        errors: errors.slice(-100),
        warnings: warnings.slice(-100),
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['import-jobs'] });

    setIsProcessing(false);

    return { successful, failed, errors, warnings, duplicates, invalidEmails, unmatchedAsc };
  }, [user, queryClient]);

  const reset = useCallback(() => {
    setProgress(null);
    setIsProcessing(false);
  }, []);

  return {
    processImport,
    isProcessing,
    progress,
    reset,
  };
}
