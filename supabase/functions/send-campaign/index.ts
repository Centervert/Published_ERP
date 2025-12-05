import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaignId: string;
  listIds: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, listIds }: SendCampaignRequest = await req.json();
    
    console.log(`[send-campaign] Starting campaign ${campaignId} to lists: ${listIds.join(", ")}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft") {
      throw new Error("Campaign has already been sent or is in progress");
    }

    // Update campaign status to sending
    await supabase
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Get contacts from selected lists (active only, not unsubscribed/bounced)
    let contactsQuery = supabase
      .from("contacts")
      .select("id, email, first_name, last_name")
      .eq("status", "active");

    if (listIds.length > 0) {
      const { data: contactListEntries } = await supabase
        .from("contact_lists")
        .select("contact_id")
        .in("list_id", listIds);

      if (contactListEntries && contactListEntries.length > 0) {
        const contactIds = contactListEntries.map(e => e.contact_id);
        contactsQuery = contactsQuery.in("id", contactIds);
      }
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      await supabase
        .from("campaigns")
        .update({ status: "failed" })
        .eq("id", campaignId);
      throw new Error("No active contacts found in selected lists");
    }

    console.log(`[send-campaign] Found ${contacts.length} contacts to send to`);

    // Update total recipients
    await supabase
      .from("campaigns")
      .update({ total_recipients: contacts.length })
      .eq("id", campaignId);

    // Add contacts to email queue
    const queueEntries = contacts.map(contact => ({
      campaign_id: campaignId,
      contact_id: contact.id,
      email: contact.email,
      status: "pending",
    }));

    await supabase.from("email_queue").insert(queueEntries);

    // Process emails in batches
    const batchSize = 10;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      for (const contact of batch) {
        try {
          // Personalize HTML content
          let personalizedHtml = campaign.html_content
            .replace(/\{\{FIRST_NAME\}\}/g, contact.first_name || "there")
            .replace(/\{\{LAST_NAME\}\}/g, contact.last_name || "")
            .replace(/\{\{EMAIL\}\}/g, contact.email);

          // Add tracking pixel
          const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-pixel?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}`;
          personalizedHtml = personalizedHtml.replace(
            "</body>",
            `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`
          );

          // Wrap links for click tracking
          const linkRegex = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;
          personalizedHtml = personalizedHtml.replace(linkRegex, (match: string, pre: string, url: string, post: string) => {
            // Skip tracking for unsubscribe links
            if (url.includes("unsubscribe")) return match;
            const trackedUrl = `${supabaseUrl}/functions/v1/track-click?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}&u=${encodeURIComponent(url)}`;
            return `<a ${pre}${trackedUrl}${post}>`;
          });

          // Add unsubscribe link placeholder if not present
          const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}`;
          personalizedHtml = personalizedHtml.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

          // Send email via Resend
          const emailResult = await resend.emails.send({
            from: `${campaign.from_name} <${campaign.from_email}>`,
            to: [contact.email],
            subject: campaign.subject,
            html: personalizedHtml,
          });

          if (emailResult.error) {
            throw new Error(emailResult.error.message);
          }

          // Log sent event
          await supabase.from("email_events").insert({
            campaign_id: campaignId,
            contact_id: contact.id,
            email: contact.email,
            event_type: "sent",
          });

          // Update queue status
          await supabase
            .from("email_queue")
            .update({ status: "sent", processed_at: new Date().toISOString() })
            .eq("campaign_id", campaignId)
            .eq("contact_id", contact.id);

          sentCount++;
          console.log(`[send-campaign] Sent to ${contact.email}`);

        } catch (emailError: unknown) {
          const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
          console.error(`[send-campaign] Failed to send to ${contact.email}:`, emailError);
          
          await supabase
            .from("email_queue")
            .update({ 
              status: "failed", 
              last_error: errorMessage,
              attempts: 1,
              processed_at: new Date().toISOString() 
            })
            .eq("campaign_id", campaignId)
            .eq("contact_id", contact.id);

          failedCount++;
        }
      }

      // Rate limiting: wait 1 second between batches
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    const finalStatus = failedCount === contacts.length ? "failed" : "sent";
    await supabase
      .from("campaigns")
      .update({ 
        status: finalStatus, 
        sent_at: new Date().toISOString() 
      })
      .eq("id", campaignId);

    console.log(`[send-campaign] Completed. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        total: contacts.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[send-campaign] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
