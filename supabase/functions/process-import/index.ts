import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function normalizeEmail(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function normalizePhone(value: string | undefined): string | null {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  
  if (/[eE]/.test(trimmed)) {
    try {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) trimmed = String(Math.round(num));
    } catch { /* continue */ }
  }
  
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return null;
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

function normalizeName(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-'))
    .join(' ');
}

function parseCSVLine(line: string): string[] {
  const matches = line.match(/("([^"]*)")|([^,]+)/g) || [];
  return matches.map(m => m.trim().replace(/^["']|["']$/g, ''));
}

function parseCreatedAt(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;

  if (/^\d+$/.test(v)) {
    const num = Number(v);
    if (!Number.isNaN(num)) {
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
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting import job: ${jobId}`);

    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("import_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // Download and process file line by line
    console.log(`Downloading file: ${job.file_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("import-files")
      .download(job.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }

    const csvText = await fileData.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    const totalRows = lines.length - 1;

    console.log(`Processing ${totalRows} rows`);

    const columnMapping: ColumnMapping = job.column_mapping;
    
    // Get indices
    const emailIndex = headers.indexOf(columnMapping.email);
    const firstNameIndex = columnMapping.first_name ? headers.indexOf(columnMapping.first_name) : -1;
    const lastNameIndex = columnMapping.last_name ? headers.indexOf(columnMapping.last_name) : -1;
    const phoneIndex = columnMapping.phone ? headers.indexOf(columnMapping.phone) : -1;
    const imprintIndex = columnMapping.imprint ? headers.indexOf(columnMapping.imprint) : -1;
    const ascNameIndex = columnMapping.asc_name ? headers.indexOf(columnMapping.asc_name) : -1;
    const ascEmailIndex = columnMapping.asc_email ? headers.indexOf(columnMapping.asc_email) : -1;
    const createdAtIndex = columnMapping.created_at ? headers.indexOf(columnMapping.created_at) : -1;

    // Load lookups (small data)
    const { data: imprints } = await supabase.from("imprints").select("id, name");
    const { data: users } = await supabase.from("profiles").select("id, full_name, email");
    const { data: staffMembers } = await supabase.from("staff").select("id, full_name, email");

    const imprintLookup = new Map<string, string>();
    imprints?.forEach(imp => imprintLookup.set(imp.name.toLowerCase().trim(), imp.id));

    const staffEmailLookup = new Map<string, string>();
    const staffNameLookup = new Map<string, string>();
    staffMembers?.forEach(s => {
      if (s.email) staffEmailLookup.set(s.email.toLowerCase().trim(), s.id);
      if (s.full_name) staffNameLookup.set(s.full_name.toLowerCase().trim(), s.id);
    });

    const userNameLookup = new Map<string, string>();
    const userEmailLookup = new Map<string, string>();
    users?.forEach(u => {
      if (u.full_name) userNameLookup.set(u.full_name.toLowerCase().trim(), u.id);
      if (u.email) userEmailLookup.set(u.email.toLowerCase().trim(), u.id);
    });

    // Process in small batches to avoid memory issues
    const batchSize = 100;
    let processedRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    const errors: { row: number; error: string }[] = [];
    const unmatchedImprints = new Set<string>();
    const jobWarnings: string[] = [];
    // Track unmatched ASC names for warning
    const unmatchedAscNames = new Set<string>();

    // Second pass: process contacts in batches
    for (let i = 1; i < lines.length; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, lines.length);
      const validContacts: any[] = [];
      
      for (let j = i; j < batchEnd; j++) {
        const row = parseCSVLine(lines[j]);
        const rowNum = j + 1;
        const email = row[emailIndex]?.trim();
        
        if (!email || email.toLowerCase() === 'no email') {
          errors.push({ row: rowNum, error: 'Empty email' });
          failedRows++;
          continue;
        }

        if (!emailRegex.test(email)) {
          errors.push({ row: rowNum, error: `Invalid email "${email}"` });
          failedRows++;
          continue;
        }

        let imprintId: string | undefined;
        if (imprintIndex >= 0) {
          const imprintName = row[imprintIndex]?.trim();
          if (imprintName) {
            imprintId = imprintLookup.get(imprintName.toLowerCase().trim());
            if (!imprintId) {
              unmatchedImprints.add(imprintName);
              imprintId = undefined; // don't clear existing on upsert
            }
          }
        }

        // Match ASC: staff table only (no more profile fallback)
        let staffAscId: string | undefined;
        let ascTextFallback: string | undefined;
        const ascNameRaw = ascNameIndex >= 0 ? row[ascNameIndex]?.trim() : '';
        const ascEmailRaw = ascEmailIndex >= 0 ? row[ascEmailIndex]?.trim()?.toLowerCase() : '';

        // Priority 1: Staff by email
        if (ascEmailRaw && ascEmailRaw !== 'no owner_email') {
          staffAscId = staffEmailLookup.get(ascEmailRaw);
        }
        // Priority 2: Staff by name
        if (!staffAscId && ascNameRaw && ascNameRaw.toLowerCase() !== 'unassigned') {
          staffAscId = staffNameLookup.get(ascNameRaw.toLowerCase().trim());
        }
        
        // If no staff match found, store text as fallback (but don't create placeholders)
        if (!staffAscId && (ascNameRaw || ascEmailRaw)) {
          if (ascNameRaw && ascNameRaw.toLowerCase() !== 'unassigned') {
            ascTextFallback = ascEmailRaw ? `${ascNameRaw} <${ascEmailRaw}>` : ascNameRaw;
            unmatchedAscNames.add(ascNameRaw);
          } else if (ascEmailRaw && ascEmailRaw !== 'no owner_email') {
            ascTextFallback = ascEmailRaw;
            unmatchedAscNames.add(ascEmailRaw);
          }
        }

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
          errors.push({ row: rowNum, error: 'Empty email' });
          failedRows++;
          continue;
        }

        const createdAt = createdAtIndex >= 0 ? parseCreatedAt(row[createdAtIndex]) : undefined;

        const contact: Record<string, unknown> = {
          email: normalizedEmail,
          created_by: job.created_by,
        };

        if (firstNameIndex >= 0) contact.first_name = normalizeName(row[firstNameIndex]) || null;
        if (lastNameIndex >= 0) contact.last_name = normalizeName(row[lastNameIndex]) || null;
        if (phoneIndex >= 0) contact.phone = normalizePhone(row[phoneIndex]) || null;
        if (imprintIndex >= 0 && imprintId) contact.imprint_id = imprintId;

        // Only set ASC if provided in CSV - use staff_asc_id, fall back to text
        if ((ascNameIndex >= 0 && ascNameRaw) || (ascEmailIndex >= 0 && ascEmailRaw)) {
          if (staffAscId) {
            contact.staff_asc_id = staffAscId;
            // Keep assigned_asc_text as backup during migration period
            contact.assigned_asc_text = ascTextFallback || null;
          } else {
            contact.staff_asc_id = null;
            contact.assigned_asc_text = ascTextFallback || null;
          }
        }

        if (createdAt) contact.created_at = createdAt;

        validContacts.push(contact);
      }

      if (validContacts.length > 0) {
        // Dedupe within the batch to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const byEmail = new Map<string, any>();
        for (const c of validContacts) byEmail.set(String(c.email), c);
        const dedupedContacts = Array.from(byEmail.values());

        const { error: insertError, data: inserted } = await supabase
          .from('contacts')
          .upsert(dedupedContacts, { onConflict: 'email', ignoreDuplicates: false })
          .select('id, email');

        if (insertError) {
          console.error('Insert error:', insertError);
          failedRows += dedupedContacts.length;
        } else {
          successfulRows += inserted?.length || dedupedContacts.length;
          
          // Log activity for newly created contacts
          if (inserted && inserted.length > 0) {
            const activityRecords = inserted.map((contact: { id: string; email: string }) => ({
              contact_id: contact.id,
              activity_type: 'contact_created',
              description: `Contact imported from CSV`,
              metadata: { source: 'import', job_id: jobId, file_name: job.file_name },
              created_by: job.created_by,
            }));
            
            // Insert activities in batches to avoid overwhelming the DB
            const activityBatchSize = 50;
            for (let a = 0; a < activityRecords.length; a += activityBatchSize) {
              const activityBatch = activityRecords.slice(a, a + activityBatchSize);
              await supabase.from('contact_activity').insert(activityBatch);
            }
          }
        }
      }

      processedRows = batchEnd - 1;

      // Update progress every 500 rows
      if (processedRows % 500 === 0 || batchEnd >= lines.length) {
        await supabase
          .from("import_jobs")
          .update({ 
            processed_rows: processedRows,
            successful_rows: successfulRows,
            failed_rows: failedRows,
            errors: errors.slice(-50),
          })
          .eq("id", jobId);
        console.log(`Progress: ${processedRows}/${totalRows}`);
      }
    }

    if (unmatchedImprints.size > 0) {
      jobWarnings.push(`Unmatched imprints: ${Array.from(unmatchedImprints).slice(0, 5).join(', ')}${unmatchedImprints.size > 5 ? '...' : ''}`);
    }
    
    if (unmatchedAscNames.size > 0) {
      jobWarnings.push(`Unmatched ASC names (stored as text): ${Array.from(unmatchedAscNames).slice(0, 5).join(', ')}${unmatchedAscNames.size > 5 ? ` (+${unmatchedAscNames.size - 5} more)` : ''}`);
    }

    await supabase
      .from("import_jobs")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_rows: totalRows,
        successful_rows: successfulRows,
        failed_rows: failedRows,
        errors: errors.slice(-100),
        warnings: jobWarnings,
      })
      .eq("id", jobId);

    console.log(`Completed: ${successfulRows} success, ${failedRows} failed`);

    return new Response(
      JSON.stringify({ success: true, successful: successfulRows, failed: failedRows }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    
    if (jobId) {
      await supabase
        .from("import_jobs")
        .update({ 
          status: "failed", 
          completed_at: new Date().toISOString(),
          errors: [{ row: 0, error: error.message }]
        })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
