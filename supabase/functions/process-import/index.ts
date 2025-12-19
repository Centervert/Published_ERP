import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

// Normalize email to lowercase
function normalizeEmail(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

// Normalize phone numbers
function normalizePhone(value: string | undefined): string | null {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  
  if (/[eE]/.test(trimmed)) {
    try {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        trimmed = String(Math.round(num));
      }
    } catch { /* continue */ }
  }
  
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return null;
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

// Normalize names to Title Case
function normalizeName(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  
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

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map(line => {
    const matches = line.match(/("([^"]*)")|([^,]+)/g) || [];
    return matches.map(m => m.trim().replace(/^["']|["']$/g, ''));
  });
  return { headers, rows };
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

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting import job: ${jobId}`);

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as processing
    await supabase
      .from("import_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    const columnMapping: ColumnMapping = job.column_mapping;
    const parsed = parseCSV(job.file_data);
    const totalRows = parsed.rows.length;
    
    // Get indices
    const emailIndex = parsed.headers.indexOf(columnMapping.email);
    const firstNameIndex = columnMapping.first_name ? parsed.headers.indexOf(columnMapping.first_name) : -1;
    const lastNameIndex = columnMapping.last_name ? parsed.headers.indexOf(columnMapping.last_name) : -1;
    const phoneIndex = columnMapping.phone ? parsed.headers.indexOf(columnMapping.phone) : -1;
    const imprintIndex = columnMapping.imprint ? parsed.headers.indexOf(columnMapping.imprint) : -1;
    const ascNameIndex = columnMapping.asc_name ? parsed.headers.indexOf(columnMapping.asc_name) : -1;
    const ascEmailIndex = columnMapping.asc_email ? parsed.headers.indexOf(columnMapping.asc_email) : -1;

    // Load lookups
    const { data: imprints } = await supabase.from("imprints").select("id, name");
    const { data: users } = await supabase.from("profiles").select("id, full_name, email");

    const imprintLookup = new Map<string, string>();
    imprints?.forEach(imp => {
      imprintLookup.set(imp.name.toLowerCase().trim(), imp.id);
    });

    const userNameLookup = new Map<string, string>();
    const userEmailLookup = new Map<string, string>();
    users?.forEach(u => {
      if (u.full_name) userNameLookup.set(u.full_name.toLowerCase().trim(), u.id);
      if (u.email) userEmailLookup.set(u.email.toLowerCase().trim(), u.id);
    });

    // Phase 1: Create placeholder ASC profiles
    const ascIdentifiersToCreate = new Map<string, { name?: string; email?: string }>();
    
    parsed.rows.forEach((row) => {
      let ascName: string | undefined;
      let ascEmail: string | undefined;
      
      if (ascNameIndex >= 0) ascName = row[ascNameIndex]?.trim();
      if (ascEmailIndex >= 0) ascEmail = row[ascEmailIndex]?.trim()?.toLowerCase();
      
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

    const placeholderLookup = new Map<string, string>();
    const jobWarnings: string[] = [];
    
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
        if (data?.name) placeholderLookup.set(data.name.toLowerCase().trim(), p.id);
        if (data?.email) placeholderLookup.set(data.email, p.id);
      });
      
      const { error: insertError } = await supabase.from('profiles').insert(placeholdersToInsert);
      
      if (insertError) {
        console.error('Error creating placeholder profiles:', insertError);
        jobWarnings.push(`Could not create placeholder profiles: ${insertError.message}`);
        placeholderLookup.clear();
      } else {
        jobWarnings.push(`Created ${placeholdersToInsert.length} placeholder team member(s)`);
      }
    }

    // Phase 2: Process rows in batches
    const batchSize = 50;
    let processedRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    const errors: { row: number; error: string }[] = [];
    const unmatchedImprints = new Set<string>();

    for (let i = 0; i < parsed.rows.length; i += batchSize) {
      const batch = parsed.rows.slice(i, Math.min(i + batchSize, parsed.rows.length));
      const validContacts: any[] = [];
      
      batch.forEach((row, batchIndex) => {
        const rowNum = i + batchIndex + 2; // +2 for header and 1-indexing
        const email = row[emailIndex]?.trim();
        
        if (!email) {
          errors.push({ row: rowNum, error: 'Empty email' });
          failedRows++;
          return;
        }

        if (!emailRegex.test(email)) {
          errors.push({ row: rowNum, error: `Invalid email "${email}"` });
          failedRows++;
          return;
        }

        let imprintId: string | undefined;
        if (imprintIndex >= 0) {
          const imprintName = row[imprintIndex]?.trim();
          if (imprintName) {
            imprintId = imprintLookup.get(imprintName.toLowerCase().trim());
            if (!imprintId) unmatchedImprints.add(imprintName);
          }
        }

        let ascId: string | undefined;
        if (ascNameIndex >= 0) {
          const ascName = row[ascNameIndex]?.trim();
          if (ascName) {
            ascId = userNameLookup.get(ascName.toLowerCase().trim()) 
                 || placeholderLookup.get(ascName.toLowerCase().trim());
          }
        }
        if (!ascId && ascEmailIndex >= 0) {
          const ascEmail = row[ascEmailIndex]?.trim()?.toLowerCase();
          if (ascEmail) {
            ascId = userEmailLookup.get(ascEmail) || placeholderLookup.get(ascEmail);
          }
        }

        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
          errors.push({ row: rowNum, error: 'Empty email after normalization' });
          failedRows++;
          return;
        }

        validContacts.push({
          email: normalizedEmail,
          first_name: firstNameIndex >= 0 ? normalizeName(row[firstNameIndex]) || null : null,
          last_name: lastNameIndex >= 0 ? normalizeName(row[lastNameIndex]) || null : null,
          phone: phoneIndex >= 0 ? normalizePhone(row[phoneIndex]) || null : null,
          imprint_id: imprintId || null,
          assigned_asc: ascId || null,
          created_by: job.created_by,
        });
      });

      // Insert valid contacts
      if (validContacts.length > 0) {
        const { error: insertError, data: insertedData } = await supabase
          .from('contacts')
          .upsert(validContacts, { onConflict: 'email', ignoreDuplicates: true })
          .select();

        if (insertError) {
          console.error('Batch insert error:', insertError);
          validContacts.forEach((_, idx) => {
            errors.push({ row: i + idx + 2, error: insertError.message });
            failedRows++;
          });
        } else {
          successfulRows += insertedData?.length || validContacts.length;
        }
      }

      processedRows += batch.length;

      // Update progress every batch
      await supabase
        .from("import_jobs")
        .update({ 
          processed_rows: processedRows,
          successful_rows: successfulRows,
          failed_rows: failedRows,
          errors: errors.slice(0, 100), // Limit stored errors
        })
        .eq("id", jobId);
    }

    // Add unmatched imprints warning
    if (unmatchedImprints.size > 0) {
      jobWarnings.push(`Unmatched imprints (${unmatchedImprints.size}): ${Array.from(unmatchedImprints).slice(0, 5).join(', ')}${unmatchedImprints.size > 5 ? '...' : ''}`);
    }

    // Mark as completed
    await supabase
      .from("import_jobs")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_rows: totalRows,
        successful_rows: successfulRows,
        failed_rows: failedRows,
        errors: errors.slice(0, 100),
        warnings: jobWarnings,
      })
      .eq("id", jobId);

    console.log(`Import job ${jobId} completed: ${successfulRows} successful, ${failedRows} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        successful: successfulRows, 
        failed: failedRows 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in process-import:", error);
    
    // Try to mark job as failed
    try {
      const { jobId } = await req.clone().json();
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
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
