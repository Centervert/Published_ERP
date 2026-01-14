import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All tables to export in dependency order
const TABLES_TO_EXPORT = [
  // Core tables (no dependencies)
  "profiles",
  "user_roles",
  "company",
  "commission_tiers",
  "tags",
  "lists",
  
  // Company/Brands
  "imprints",
  "staff",
  "user_email_connections",
  
  // CRM
  "contacts",
  "contact_links",
  "contact_activity",
  "contact_lists",
  "contact_tags",
  
  // Sales
  "deals",
  "books",
  "products",
  "package_items",
  
  // CRM continued (depends on deals)
  "contact_communications",
  "contact_notes",
  "contact_tasks",
  
  // Marketing
  "templates",
  "campaigns",
  "campaign_lists",
  "email_events",
  
  // Import
  "import_jobs",
  
  // Development
  "dev_documents",
  "dev_document_versions",
  "dev_items",
  "dev_meetings",
  "dev_meeting_links",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth token
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

    // Check if user is admin or super_admin
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

    // Parse request body for options
    let options = { tables: TABLES_TO_EXPORT, format: "json" };
    try {
      const body = await req.json();
      if (body.tables && Array.isArray(body.tables)) {
        options.tables = body.tables;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`Exporting ${options.tables.length} tables...`);

    // Export each table
    const exportData: Record<string, unknown[]> = {};
    const exportMeta: Record<string, { count: number; exportedAt: string }> = {};
    
    for (const tableName of options.tables) {
      try {
        // Fetch all data from the table (paginated for large tables)
        let allRows: unknown[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .range(offset, offset + pageSize - 1);

          if (error) {
            console.error(`Error exporting ${tableName}:`, error);
            exportData[tableName] = [];
            exportMeta[tableName] = { count: 0, exportedAt: new Date().toISOString() };
            break;
          }

          if (data && data.length > 0) {
            allRows = allRows.concat(data);
            offset += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        exportData[tableName] = allRows;
        exportMeta[tableName] = { 
          count: allRows.length, 
          exportedAt: new Date().toISOString() 
        };
        
        console.log(`Exported ${tableName}: ${allRows.length} rows`);
      } catch (err) {
        console.error(`Error exporting ${tableName}:`, err);
        exportData[tableName] = [];
        exportMeta[tableName] = { count: 0, exportedAt: new Date().toISOString() };
      }
    }

    // Build the export package
    const exportPackage = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        tableCount: options.tables.length,
        totalRows: Object.values(exportMeta).reduce((sum, m) => sum + m.count, 0),
        tables: exportMeta,
      },
      data: exportData,
    };

    // Return as downloadable JSON
    return new Response(
      JSON.stringify(exportPackage, null, 2),
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
