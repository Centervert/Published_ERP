import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables grouped by expected size for parallel processing
const SMALL_TABLES = [
  "profiles", "user_roles", "company", "commission_tiers", "tags", "lists",
  "imprints", "staff", "user_email_connections", "templates", "campaigns",
  "campaign_lists", "products", "package_items", "books", "deals",
  "dev_documents", "dev_document_versions", "dev_items", "dev_meetings", "dev_meeting_links",
];

const MEDIUM_TABLES = [
  "contacts", "contact_links", "contact_lists", "contact_tags",
  "contact_notes", "contact_tasks", "import_jobs",
];

// Large tables - limit rows to avoid timeout
const LARGE_TABLES_CONFIG: Record<string, { limit: number; orderBy: string }> = {
  "contact_activity": { limit: 10000, orderBy: "created_at" },
  "contact_communications": { limit: 10000, orderBy: "created_at" },
  "email_events": { limit: 50000, orderBy: "created_at" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportTable(
  supabase: any,
  tableName: string,
  config?: { limit: number; orderBy: string }
): Promise<{ data: unknown[]; count: number; truncated: boolean }> {
  try {
    const pageSize = 1000;
    let allRows: unknown[] = [];
    let offset = 0;
    let hasMore = true;
    const maxRows = config?.limit || 100000;

    while (hasMore && allRows.length < maxRows) {
      let query = supabase.from(tableName).select("*");
      
      if (config?.orderBy) {
        query = query.order(config.orderBy, { ascending: false });
      }
      
      const { data, error } = await query.range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`Error exporting ${tableName}:`, error.message);
        return { data: [], count: 0, truncated: false };
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        offset += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const truncated = hasMore && allRows.length >= maxRows;
    console.log(`Exported ${tableName}: ${allRows.length} rows${truncated ? ' (truncated)' : ''}`);
    
    return { data: allRows, count: allRows.length, truncated };
  } catch (err) {
    console.error(`Error exporting ${tableName}:`, err);
    return { data: [], count: 0, truncated: false };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportTablesBatch(
  supabase: any,
  tables: string[],
  batchSize: number = 5
): Promise<Record<string, { data: unknown[]; count: number; truncated: boolean }>> {
  const results: Record<string, { data: unknown[]; count: number; truncated: boolean }> = {};
  
  for (let i = 0; i < tables.length; i += batchSize) {
    const batch = tables.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(table => exportTable(supabase, table))
    );
    
    batch.forEach((table, idx) => {
      results[table] = batchResults[idx];
    });
  }
  
  return results;
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

    // Parse options
    let skipLargeTables = false;
    try {
      const body = await req.json();
      skipLargeTables = body.skipLargeTables === true;
    } catch {
      // No body, use defaults
    }

    console.log(`Starting export (skipLargeTables: ${skipLargeTables})`);

    // Export small tables in parallel batches of 5
    const smallResults = await exportTablesBatch(supabase, SMALL_TABLES, 5);
    
    // Export medium tables in parallel batches of 3
    const mediumResults = await exportTablesBatch(supabase, MEDIUM_TABLES, 3);

    // Export large tables one at a time with limits
    const largeResults: Record<string, { data: unknown[]; count: number; truncated: boolean }> = {};
    
    if (!skipLargeTables) {
      for (const [table, config] of Object.entries(LARGE_TABLES_CONFIG)) {
        largeResults[table] = await exportTable(supabase, table, config);
      }
    } else {
      // Just get counts for large tables
      for (const table of Object.keys(LARGE_TABLES_CONFIG)) {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        largeResults[table] = { data: [], count: count || 0, truncated: true };
        console.log(`Skipped ${table}: ${count} rows (counts only)`);
      }
    }

    // Combine all results
    const allResults = { ...smallResults, ...mediumResults, ...largeResults };

    // Build export package
    const exportData: Record<string, unknown[]> = {};
    const exportMeta: Record<string, { count: number; truncated: boolean; exportedAt: string }> = {};
    
    for (const [table, result] of Object.entries(allResults)) {
      exportData[table] = result.data;
      exportMeta[table] = {
        count: result.count,
        truncated: result.truncated,
        exportedAt: new Date().toISOString(),
      };
    }

    const totalRows = Object.values(exportMeta).reduce((sum, m) => sum + m.count, 0);
    const truncatedTables = Object.entries(exportMeta)
      .filter(([_, m]) => m.truncated)
      .map(([t]) => t);

    const exportPackage = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        tableCount: Object.keys(exportMeta).length,
        totalRows,
        truncatedTables,
        tables: exportMeta,
      },
      data: exportData,
    };

    console.log(`Export complete: ${totalRows} rows from ${Object.keys(exportMeta).length} tables`);

    return new Response(
      JSON.stringify(exportPackage),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="database_export_${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
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
