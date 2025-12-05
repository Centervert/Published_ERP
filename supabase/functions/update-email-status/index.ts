import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

interface UpdateRequest {
  emailId: string;
  status: "processing" | "sent" | "failed";
  error?: string;
  logEvent?: boolean;
  campaignId?: string;
  contactId?: string;
  email?: string;
}

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

    const { emailId, status, error: errorMsg, logEvent, campaignId, contactId, email }: UpdateRequest = await req.json();

    if (!emailId || !status) {
      return new Response(
        JSON.stringify({ error: "emailId and status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email queue status
    const updateData: any = {
      status,
      processed_at: new Date().toISOString(),
    };

    if (errorMsg) {
      updateData.last_error = errorMsg;
    }

    if (status === "processing") {
      // Increment attempts when processing
      const { data: current } = await supabase
        .from("email_queue")
        .select("attempts")
        .eq("id", emailId)
        .single();
      
      updateData.attempts = (current?.attempts || 0) + 1;
      delete updateData.processed_at;
    }

    const { error: updateError } = await supabase
      .from("email_queue")
      .update(updateData)
      .eq("id", emailId);

    if (updateError) {
      console.error("Error updating email status:", updateError);
      throw updateError;
    }

    // Log the event if requested
    if (logEvent && campaignId && email) {
      const { error: eventError } = await supabase
        .from("email_events")
        .insert({
          campaign_id: campaignId,
          contact_id: contactId,
          email: email,
          event_type: status === "sent" ? "sent" : "failed",
        });

      if (eventError) {
        console.error("Error logging event:", eventError);
      }
    }

    console.log(`Updated email ${emailId} to status: ${status}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-email-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
