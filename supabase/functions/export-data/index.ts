import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All available tables in order of export priority
const ALL_TABLES = [
  // Core config (small)
  "company", "imprints", "staff", "profiles", "user_roles",
  // CRM structure (small)
  "lists", "tags", "templates", "campaigns", "campaign_lists",
  // Products (small)
  "products", "package_items", "commission_tiers",
  // Dev (small)
  "dev_documents", "dev_document_versions", "dev_items", "dev_meetings", "dev_meeting_links",
  // User connections (small)
  "user_email_connections", "import_jobs",
  // CRM data (medium-large)
  "contacts", "contact_links", "contact_lists", "contact_tags", "contact_notes", "contact_tasks",
  "deals", "books",
  // Activity (large)
  "contact_activity", "contact_communications", "email_events",
];

const BATCH_SIZE = 25000; // Rows per batch/file

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTableCounts(supabase: any, tables: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  await Promise.all(
    tables.map(async (table) => {
      try {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        counts[table] = count || 0;
      } catch {
        counts[table] = 0;
      }
    })
  );
  
  return counts;
}

// Tables that have created_at column for ordering
const TABLES_WITH_CREATED_AT = [
  "company", "imprints", "staff", "profiles", "user_roles",
  "lists", "tags", "templates", "campaigns",
  "products", "commission_tiers",
  "dev_documents", "dev_document_versions", "dev_items", "dev_meetings", "dev_meeting_links",
  "user_email_connections", "import_jobs",
  "contacts", "contact_links", "contact_notes", "contact_tasks", "contact_activity", "contact_communications",
  "deals", "books", "email_events"
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportTableBatch(
  supabase: any,
  tableName: string,
  batchIndex: number,
  batchSize: number = BATCH_SIZE
): Promise<{ data: unknown[]; hasMore: boolean; totalCount: number }> {
  const offset = batchIndex * batchSize;
  
  try {
    // Get total count first
    const { count: totalCount } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    // Fetch batch with pagination
    const pageSize = 1000;
    let allRows: unknown[] = [];
    let currentOffset = offset;
    const maxRows = offset + batchSize;
    const hasCreatedAt = TABLES_WITH_CREATED_AT.includes(tableName);

    while (allRows.length < batchSize && currentOffset < (totalCount || 0)) {
      const fetchSize = Math.min(pageSize, maxRows - currentOffset);
      
      let query = supabase
        .from(tableName)
        .select("*");
      
      // Only order by created_at if the table has that column
      if (hasCreatedAt) {
        query = query.order("created_at", { ascending: true, nullsFirst: true });
      }
      
      const { data, error } = await query.range(currentOffset, currentOffset + fetchSize - 1);

      if (error) {
        console.error(`Error fetching ${tableName} at offset ${currentOffset}:`, error.message);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        currentOffset += data.length;
      } else {
        break;
      }
    }

    const hasMore = (offset + allRows.length) < (totalCount || 0);
    
    console.log(`Batch ${batchIndex + 1} of ${tableName}: ${allRows.length} rows (offset: ${offset}, total: ${totalCount})`);
    
    return { data: allRows, hasMore, totalCount: totalCount || 0 };
  } catch (err) {
    console.error(`Error exporting batch from ${tableName}:`, err);
    return { data: [], hasMore: false, totalCount: 0 };
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

    // Verify user is admin
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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let action = "counts";
    let table = "";
    let batchIndex = 0;
    
    try {
      const body = await req.json();
      action = body.action || "counts";
      table = body.table || "";
      batchIndex = typeof body.batchIndex === "number" ? body.batchIndex : 0;
    } catch {
      // No body, default to counts
    }

    console.log(`Export action: ${action}, table: ${table}, batch: ${batchIndex}`);

    // Action: Get all table counts and calculate batches needed
    if (action === "counts" || action === "plan") {
      const counts = await getTableCounts(supabase, ALL_TABLES);
      const totalRows = Object.values(counts).reduce((sum, c) => sum + c, 0);
      
      // Calculate batches needed per table
      const batches: Array<{ table: string; batchIndex: number; estimatedRows: number }> = [];
      
      for (const tableName of ALL_TABLES) {
        const count = counts[tableName] || 0;
        if (count === 0) continue;
        
        const numBatches = Math.ceil(count / BATCH_SIZE);
        for (let i = 0; i < numBatches; i++) {
          const estimatedRows = Math.min(BATCH_SIZE, count - (i * BATCH_SIZE));
          batches.push({ table: tableName, batchIndex: i, estimatedRows });
        }
      }
      
      return new Response(
        JSON.stringify({
          action: "plan",
          totalRows,
          totalBatches: batches.length,
          batchSize: BATCH_SIZE,
          tables: counts,
          batches,
          exportedBy: user.email,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Export a single batch of a single table
    if (action === "batch") {
      if (!table || !ALL_TABLES.includes(table)) {
        return new Response(
          JSON.stringify({ error: `Invalid table: ${table}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await exportTableBatch(supabase, table, batchIndex);
      
      const batchNumber = batchIndex + 1;
      const totalBatches = Math.ceil(result.totalCount / BATCH_SIZE);
      
      const exportPackage = {
        metadata: {
          table,
          batchNumber,
          totalBatches,
          totalTableRows: result.totalCount,
          rowsInBatch: result.data.length,
          hasMore: result.hasMore,
          offsetStart: batchIndex * BATCH_SIZE,
          offsetEnd: (batchIndex * BATCH_SIZE) + result.data.length,
          exportedAt: new Date().toISOString(),
          exportedBy: user.email,
        },
        data: result.data,
      };

      const filename = totalBatches > 1 
        ? `${table}_batch_${batchNumber}.json`
        : `${table}.json`;

      return new Response(
        JSON.stringify(exportPackage),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'counts', 'plan', or 'batch'" }),
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
