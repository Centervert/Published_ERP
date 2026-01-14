import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Export mode configuration type
interface ExportConfig {
  tables: string[] | null;
  contactLimit: number;
  skipLargeTables: boolean;
  largeTableLimit: number;
}

// Export modes with different table configurations
const EXPORT_CONFIGS: Record<string, ExportConfig> = {
  // Quick export - just essential tables, limited rows
  quick: {
    tables: ["company", "imprints", "staff", "profiles", "user_roles", "lists", "tags", "templates", "campaigns", "products"],
    contactLimit: 1000,
    skipLargeTables: true,
    largeTableLimit: 0,
  },
  // Standard export - main tables with reasonable limits
  standard: {
    tables: null, // all tables
    contactLimit: 10000,
    skipLargeTables: false,
    largeTableLimit: 5000,
  },
  // Full export - everything (may timeout with very large datasets)
  full: {
    tables: null,
    contactLimit: 50000,
    skipLargeTables: false,
    largeTableLimit: 20000,
  },
  // Contacts only - paginated export of contacts
  contacts: {
    tables: ["contacts"],
    contactLimit: 100000,
    skipLargeTables: true,
    largeTableLimit: 0,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportTable(
  supabase: any,
  tableName: string,
  limit: number = 5000,
  orderBy?: string
): Promise<{ data: unknown[]; count: number; truncated: boolean }> {
  try {
    const pageSize = 500;
    let allRows: unknown[] = [];
    let offset = 0;
    let hasMore = true;

    // First get total count
    const { count: totalCount } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    while (hasMore && allRows.length < limit) {
      let query = supabase.from(tableName).select("*");
      
      if (orderBy) {
        query = query.order(orderBy, { ascending: false });
      }
      
      const { data, error } = await query.range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`Error exporting ${tableName}:`, error.message);
        return { data: [], count: totalCount || 0, truncated: false };
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        offset += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const truncated = (totalCount || 0) > allRows.length;
    console.log(`Exported ${tableName}: ${allRows.length}/${totalCount || 0} rows${truncated ? ' (truncated)' : ''}`);
    
    return { data: allRows, count: totalCount || allRows.length, truncated };
  } catch (err) {
    console.error(`Error exporting ${tableName}:`, err);
    return { data: [], count: 0, truncated: false };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTableCounts(supabase: any, tables: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      counts[table] = count || 0;
    })
  );
  
  return counts;
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
    let mode = "quick"; // default to quick for safety
    let countsOnly = false;
    
    try {
      const body = await req.json();
      mode = body.mode || "quick";
      countsOnly = body.countsOnly === true;
    } catch {
      // No body, use defaults
    }

    const config = EXPORT_CONFIGS[mode as keyof typeof EXPORT_CONFIGS] || EXPORT_CONFIGS.quick;
    
    console.log(`Starting export (mode: ${mode}, countsOnly: ${countsOnly})`);

    // All available tables
    const ALL_TABLES = [
      // Core
      "company", "imprints", "staff", "profiles", "user_roles",
      // CRM
      "contacts", "contact_links", "contact_lists", "contact_tags", "contact_notes", "contact_tasks",
      // Marketing
      "lists", "tags", "templates", "campaigns", "campaign_lists",
      // Sales
      "deals", "products", "package_items", "commission_tiers", "books",
      // Activity (large)
      "contact_activity", "contact_communications", "email_events",
      // Import
      "import_jobs",
      // Dev
      "dev_documents", "dev_document_versions", "dev_items", "dev_meetings", "dev_meeting_links",
      // User
      "user_email_connections",
    ];

    const tablesToExport = config.tables || ALL_TABLES;

    // If counts only, just return the counts
    if (countsOnly) {
      const counts = await getTableCounts(supabase, ALL_TABLES);
      const totalRows = Object.values(counts).reduce((sum, c) => sum + c, 0);
      
      return new Response(
        JSON.stringify({
          mode: "counts",
          totalRows,
          tables: counts,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Large tables that need special handling
    const LARGE_TABLES = ["contact_activity", "contact_communications", "email_events"];
    
    // Export tables
    const exportData: Record<string, unknown[]> = {};
    const exportMeta: Record<string, { count: number; exported: number; truncated: boolean }> = {};

    for (const table of tablesToExport) {
      // Skip large tables if configured
      if (config.skipLargeTables && LARGE_TABLES.includes(table)) {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        exportMeta[table] = { count: count || 0, exported: 0, truncated: true };
        exportData[table] = [];
        console.log(`Skipped ${table}: ${count} rows`);
        continue;
      }

      // Determine limit based on table
      let limit = 5000;
      if (table === "contacts") {
        limit = config.contactLimit;
      } else if (LARGE_TABLES.includes(table)) {
        limit = config.largeTableLimit || 5000;
      }

      const orderBy = LARGE_TABLES.includes(table) || table === "contacts" ? "created_at" : undefined;
      
      const result = await exportTable(supabase, table, limit, orderBy);
      exportData[table] = result.data;
      exportMeta[table] = {
        count: result.count,
        exported: result.data.length,
        truncated: result.truncated,
      };
    }

    const totalRows = Object.values(exportMeta).reduce((sum, m) => sum + m.count, 0);
    const exportedRows = Object.values(exportMeta).reduce((sum, m) => sum + m.exported, 0);
    const truncatedTables = Object.entries(exportMeta)
      .filter(([_, m]) => m.truncated)
      .map(([t, m]) => `${t} (${m.exported}/${m.count})`);

    const exportPackage = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        mode,
        tableCount: Object.keys(exportMeta).length,
        totalRows,
        exportedRows,
        truncatedTables,
        tables: exportMeta,
      },
      data: exportData,
    };

    console.log(`Export complete: ${exportedRows}/${totalRows} rows from ${Object.keys(exportMeta).length} tables`);

    return new Response(
      JSON.stringify(exportPackage),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="database_export_${mode}_${new Date().toISOString().split('T')[0]}.json"`,
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