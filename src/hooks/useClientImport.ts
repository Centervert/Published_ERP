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
}

interface ImportProgress {
  processed: number;
  successful: number;
  failed: number;
  total: number;
  errors: { row: number; error: string }[];
  warnings: string[];
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
    fileName: string
  ) => {
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

    // Fetch imprints for matching
    const { data: imprints } = await supabase.from('imprints').select('id, name');
    const imprintMap = new Map((imprints || []).map(i => [i.name.toLowerCase(), i.id]));

    // Fetch existing users
    const { data: existingUsers } = await supabase.from('profiles').select('id, email, full_name');
    const userEmailMap = new Map((existingUsers || []).map(u => [u.email.toLowerCase(), u.id]));
    const userNameMap = new Map((existingUsers || []).map(u => [u.full_name?.toLowerCase() || '', u.id]));

    // Collect unique ASC identifiers first
    const ascIdentifiers = new Set<string>();
    if (ascNameIdx >= 0 || ascEmailIdx >= 0) {
      for (const row of rows) {
        const ascName = ascNameIdx >= 0 ? row[ascNameIdx]?.trim() : '';
        const ascEmail = ascEmailIdx >= 0 ? row[ascEmailIdx]?.trim().toLowerCase() : '';
        if (ascEmail) ascIdentifiers.add(`email:${ascEmail}`);
        else if (ascName) ascIdentifiers.add(`name:${ascName}`);
      }
    }

    // Create placeholder profiles for unknown ASCs
    const placeholderMap = new Map<string, string>();
    for (const identifier of ascIdentifiers) {
      const [type, value] = identifier.split(':');
      if (type === 'email' && !userEmailMap.has(value)) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            email: value,
            full_name: `Placeholder (${value})`,
            active: false,
          })
          .select()
          .single();
        if (newProfile) {
          placeholderMap.set(identifier, newProfile.id);
          userEmailMap.set(value, newProfile.id);
        }
      } else if (type === 'name' && !userNameMap.has(value.toLowerCase())) {
        const placeholderEmail = `placeholder-${Date.now()}-${Math.random().toString(36).slice(2)}@placeholder.local`;
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            email: placeholderEmail,
            full_name: value,
            active: false,
          })
          .select()
          .single();
        if (newProfile) {
          placeholderMap.set(identifier, newProfile.id);
          userNameMap.set(value.toLowerCase(), newProfile.id);
        }
      }
    }

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
            failed++;
            continue;
          }

          // Match imprint
          let imprintId = null;
          if (imprintIdx >= 0 && row[imprintIdx]) {
            const imprintName = row[imprintIdx].trim().toLowerCase();
            imprintId = imprintMap.get(imprintName) || null;
            if (!imprintId && row[imprintIdx].trim()) {
              warnings.push(`Row ${rowNum}: Imprint "${row[imprintIdx]}" not found`);
            }
          }

          // Match ASC
          let ascId = null;
          const ascEmail = ascEmailIdx >= 0 ? row[ascEmailIdx]?.trim().toLowerCase() : '';
          const ascName = ascNameIdx >= 0 ? row[ascNameIdx]?.trim() : '';
          
          if (ascEmail) {
            ascId = userEmailMap.get(ascEmail) || placeholderMap.get(`email:${ascEmail}`) || null;
          } else if (ascName) {
            ascId = userNameMap.get(ascName.toLowerCase()) || placeholderMap.get(`name:${ascName}`) || null;
          }

          contacts.push({
            email,
            first_name: firstNameIdx >= 0 ? row[firstNameIdx]?.trim() || null : null,
            last_name: lastNameIdx >= 0 ? row[lastNameIdx]?.trim() || null : null,
            phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || null : null,
            imprint_id: imprintId,
            assigned_asc: ascId,
            created_by: user.id,
          });
        } catch (err: any) {
          errors.push({ row: rowNum, error: err.message });
          failed++;
        }
      }

      // Upsert contacts
      if (contacts.length > 0) {
        const { error: upsertError, data: upserted } = await supabase
          .from('contacts')
          .upsert(contacts, { onConflict: 'email', ignoreDuplicates: false })
          .select('id');

        if (upsertError) {
          for (let k = 0; k < contacts.length; k++) {
            errors.push({ row: i + k + 2, error: upsertError.message });
            failed++;
          }
        } else {
          successful += upserted?.length || contacts.length;
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

    return { successful, failed, errors, warnings };
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
