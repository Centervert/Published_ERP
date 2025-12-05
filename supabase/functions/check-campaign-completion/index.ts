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
    // Simple API key auth for the worker
    const workerKey = req.headers.get("x-worker-key");
    const expectedKey = Deno.env.get("WORKER_API_KEY");
    
    if (!expectedKey || workerKey !== expectedKey) {
      console.error("Unauthorized: Invalid worker key");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find campaigns that are 'sending'
    const { data: campaigns, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("status", "sending");

    if (campaignError) {
      console.error("Error fetching campaigns:", campaignError);
      throw campaignError;
    }

    const completedCampaigns: string[] = [];

    for (const campaign of campaigns || []) {
      // Check if any emails are still pending or processing
      const { data: pending } = await supabase
        .from("email_queue")
        .select("id")
        .eq("campaign_id", campaign.id)
        .in("status", ["pending", "processing"])
        .limit(1);

      if (!pending || pending.length === 0) {
        // All emails processed - mark campaign as sent
        const { error: updateError } = await supabase
          .from("campaigns")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", campaign.id);

        if (!updateError) {
          completedCampaigns.push(campaign.id);
          console.log(`Campaign ${campaign.id} marked as completed`);
        }
      }
    }

    return new Response(
      JSON.stringify({ completedCampaigns }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-campaign-completion:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
