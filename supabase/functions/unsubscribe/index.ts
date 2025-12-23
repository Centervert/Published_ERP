import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The app URL where users will be redirected after unsubscribing
const APP_URL = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") 
  || "https://rifdcupojdwfsteoqtpw.lovable.app";

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  
  console.log(`[Unsubscribe] Campaign: ${campaignId}, Contact: ${contactId}, Email: ${email}`);
  
  let success = true;
  let imprintName = "Author Services";
  
  if (email) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      // Get imprint name if contact exists
      if (contactId && contactId !== "test") {
        const { data: contact } = await supabase
          .from("contacts")
          .select("imprint_id, imprints(name)")
          .eq("id", contactId)
          .single();
        
        // Handle the joined imprint data
        if (contact?.imprints) {
          const imprintData = contact.imprints as unknown as { name: string };
          if (imprintData?.name) {
            imprintName = imprintData.name;
          }
        }
      }
      
      // Log the unsubscribe event
      const { error: eventError } = await supabase.from("email_events").insert({
        campaign_id: campaignId,
        contact_id: contactId && contactId !== "test" ? contactId : null,
        email: decodeURIComponent(email),
        event_type: "unsubscribed",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });
      
      if (eventError) {
        console.error("[Unsubscribe] Event insert error:", eventError);
      }
      
      // Update contact status to unsubscribed
      if (contactId && contactId !== "test") {
        const { error: updateError } = await supabase
          .from("contacts")
          .update({ status: "unsubscribed" })
          .eq("id", contactId);
        
        if (updateError) {
          console.error("[Unsubscribe] Contact update error:", updateError);
        }
      }
      
      console.log("[Unsubscribe] Successfully processed unsubscribe");
    } catch (err) {
      console.error("[Unsubscribe] Exception:", err);
      success = false;
    }
  } else {
    success = false;
  }
  
  // Redirect to the branded confirmation page in the app
  // Supabase blocks HTML responses on GET requests, so we redirect instead
  const redirectUrl = `${APP_URL}/unsubscribed?success=${success}&brand=${encodeURIComponent(imprintName)}`;
  
  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
    },
  });
});
