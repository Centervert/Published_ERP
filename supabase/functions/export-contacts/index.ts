import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 25000;

interface ExportJob {
  id: string;
  table_name: string;
  status: string;
  total_rows: number;
  total_batches: number;
  completed_batches: number;
  batch_size: number;
  file_paths: string[];
  error: string | null;
  created_by: string;
}

async function processExportInBackground(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  userId: string
) {
  console.log(`[Export ${jobId}] Starting background export for user ${userId}`);
  
  try {
    // Update job to processing
    await (supabase as any)
      .from("export_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // Get total count
    const { count: totalRows } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true });

    if (!totalRows) {
      throw new Error("No contacts found to export");
    }

    const totalBatches = Math.ceil(totalRows / BATCH_SIZE);
    console.log(`[Export ${jobId}] Total rows: ${totalRows}, batches: ${totalBatches}`);

    // Update job with totals
    await (supabase as any)
      .from("export_jobs")
      .update({ total_rows: totalRows, total_batches: totalBatches })
      .eq("id", jobId);

    const filePaths: string[] = [];

    // Process each batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * BATCH_SIZE;
      console.log(`[Export ${jobId}] Processing batch ${batchIndex + 1}/${totalBatches} (offset: ${offset})`);

      // Fetch batch with pagination (1000 at a time due to Supabase limits)
      let batchData: unknown[] = [];
      let currentOffset = offset;
      const maxOffset = offset + BATCH_SIZE;

      while (batchData.length < BATCH_SIZE && currentOffset < totalRows) {
        const fetchSize = Math.min(1000, maxOffset - currentOffset);
        
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .order("created_at", { ascending: true, nullsFirst: true })
          .range(currentOffset, currentOffset + fetchSize - 1);

        if (error) {
          console.error(`[Export ${jobId}] Error fetching batch:`, error.message);
          throw error;
        }

        if (data && data.length > 0) {
          batchData = batchData.concat(data);
          currentOffset += data.length;
        } else {
          break;
        }
      }

      console.log(`[Export ${jobId}] Batch ${batchIndex + 1} fetched ${batchData.length} rows`);

      // Create export file content
      const exportData = {
        metadata: {
          table: "contacts",
          batchNumber: batchIndex + 1,
          totalBatches,
          totalTableRows: totalRows,
          rowsInBatch: batchData.length,
          offsetStart: offset,
          offsetEnd: offset + batchData.length,
          exportedAt: new Date().toISOString(),
          exportedBy: userId,
        },
        data: batchData,
      };

      // Generate filename
      const filename = totalBatches > 1
        ? `${userId}/contacts_batch_${batchIndex + 1}.json`
        : `${userId}/contacts.json`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("exports")
        .upload(filename, JSON.stringify(exportData, null, 2), {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error(`[Export ${jobId}] Upload error:`, uploadError.message);
        throw uploadError;
      }

      filePaths.push(filename);
      console.log(`[Export ${jobId}] Uploaded ${filename}`);

      // Update progress
      await (supabase as any)
        .from("export_jobs")
        .update({ 
          completed_batches: batchIndex + 1,
          file_paths: filePaths 
        })
        .eq("id", jobId);
    }

    // Mark as completed
    await (supabase as any)
      .from("export_jobs")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString(),
        file_paths: filePaths 
      })
      .eq("id", jobId);

    console.log(`[Export ${jobId}] Completed successfully with ${filePaths.length} files`);

  } catch (error) {
    console.error(`[Export ${jobId}] Failed:`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    await (supabase as any)
      .from("export_jobs")
      .update({ 
        status: "failed", 
        error: message,
        completed_at: new Date().toISOString() 
      })
      .eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    let action = "status";
    let jobId = "";
    
    try {
      const body = await req.json();
      action = body.action || "status";
      jobId = body.jobId || "";
    } catch {
      // No body
    }

    console.log(`[Export] Action: ${action}, User: ${user.id}`);

    // Action: Start a new export job
    if (action === "start") {
      // Check for existing pending/processing jobs
      const { data: existingJobs } = await supabase
        .from("export_jobs")
        .select("id, status")
        .eq("created_by", user.id)
        .eq("table_name", "contacts")
        .in("status", ["pending", "processing"])
        .limit(1);

      if (existingJobs && existingJobs.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: "Export already in progress", 
            jobId: existingJobs[0].id 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new job record
      const { data: newJob, error: insertError } = await supabase
        .from("export_jobs")
        .insert({
          table_name: "contacts",
          status: "pending",
          batch_size: BATCH_SIZE,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError || !newJob) {
        throw insertError || new Error("Failed to create export job");
      }

      console.log(`[Export] Created job ${newJob.id}`);

      // Start background processing using waitUntil
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(processExportInBackground(supabase, newJob.id, user.id));

      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: newJob.id,
          message: "Export started. Check status for progress." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Get status of a job or list all jobs
    if (action === "status") {
      if (jobId) {
        const { data: job, error } = await supabase
          .from("export_jobs")
          .select("*")
          .eq("id", jobId)
          .eq("created_by", user.id)
          .single();

        if (error || !job) {
          return new Response(
            JSON.stringify({ error: "Job not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(job),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List recent jobs
      const { data: jobs } = await supabase
        .from("export_jobs")
        .select("*")
        .eq("created_by", user.id)
        .eq("table_name", "contacts")
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({ jobs: jobs || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Get download URLs for completed job
    if (action === "download") {
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: "jobId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: job, error } = await supabase
        .from("export_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("created_by", user.id)
        .single();

      if (error || !job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (job.status !== "completed") {
        return new Response(
          JSON.stringify({ error: "Job not completed", status: job.status }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate signed URLs for each file
      const downloadUrls: { filename: string; url: string }[] = [];
      
      for (const filePath of job.file_paths) {
        const { data: signedUrl } = await supabase.storage
          .from("exports")
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (signedUrl) {
          downloadUrls.push({
            filename: filePath.split("/").pop() || filePath,
            url: signedUrl.signedUrl,
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          jobId: job.id,
          totalRows: job.total_rows,
          totalBatches: job.total_batches,
          downloads: downloadUrls 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'start', 'status', or 'download'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Export error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
