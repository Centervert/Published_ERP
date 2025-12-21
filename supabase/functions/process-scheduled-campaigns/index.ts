import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify worker API key
    const workerKey = req.headers.get("x-worker-key");
    const expectedKey = Deno.env.get("WORKER_API_KEY");
    
    if (!workerKey || workerKey !== expectedKey) {
      console.log("[process-scheduled-campaigns] Unauthorized request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[process-scheduled-campaigns] Checking for due scheduled campaigns...");

    // Find campaigns that are scheduled and due
    const now = new Date().toISOString();
    const { data: dueCampaigns, error: fetchError } = await supabase
      .from("campaigns")
      .select("id, name, scheduled_at, scheduled_imprint_ids, scheduled_additional_recipients, route_replies_to_asc")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled campaigns: ${fetchError.message}`);
    }

    if (!dueCampaigns || dueCampaigns.length === 0) {
      console.log("[process-scheduled-campaigns] No scheduled campaigns due");
      return new Response(
        JSON.stringify({ processed: 0, message: "No scheduled campaigns due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-scheduled-campaigns] Found ${dueCampaigns.length} due campaign(s)`);

    const results = [];

    for (const campaign of dueCampaigns) {
      console.log(`[process-scheduled-campaigns] Processing campaign: ${campaign.name} (${campaign.id})`);

      try {
        // Get the campaign's associated lists from campaign_lists junction table
        const { data: campaignLists } = await supabase
          .from("campaign_lists")
          .select("list_id")
          .eq("campaign_id", campaign.id);

        const listIds = campaignLists?.map(cl => cl.list_id) || [];

        // Update status to 'sending' before processing
        await supabase
          .from("campaigns")
          .update({ status: "sending" })
          .eq("id", campaign.id);

        // Call the send-campaign function internally with stored settings
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-campaign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            listIds: listIds,
            imprintIds: campaign.scheduled_imprint_ids || undefined,
            additionalRecipients: campaign.scheduled_additional_recipients || undefined,
            routeRepliesToAsc: campaign.route_replies_to_asc || false,
          }),
        });

        const sendResult = await sendResponse.json();

        if (!sendResponse.ok) {
          throw new Error(sendResult.error || "Failed to send campaign");
        }

        console.log(`[process-scheduled-campaigns] Campaign ${campaign.id} queued successfully:`, sendResult);
        results.push({ campaignId: campaign.id, success: true, queued: sendResult.queued });

      } catch (campaignError) {
        const errorMessage = campaignError instanceof Error ? campaignError.message : "Unknown error";
        console.error(`[process-scheduled-campaigns] Error processing campaign ${campaign.id}:`, errorMessage);
        
        // Mark campaign as failed
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);

        results.push({ campaignId: campaign.id, success: false, error: errorMessage });
      }
    }

    console.log(`[process-scheduled-campaigns] Processed ${results.length} campaigns`);

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-scheduled-campaigns] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
