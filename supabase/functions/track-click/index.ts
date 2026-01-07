import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract tracking parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  const targetUrl = url.searchParams.get("url") || url.searchParams.get("u");
  
  console.log(`[Track Click] Campaign: ${campaignId}, Contact: ${contactId}, URL: ${targetUrl}`);
  
  // Log the click event
  if (campaignId && email && targetUrl) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const decodedUrl = decodeURIComponent(targetUrl);
      
      const { error } = await supabase.from("email_events").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        email: decodeURIComponent(email),
        event_type: "clicked",
        link_url: decodedUrl,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });
      
      if (error) {
        console.error("[Track Click] Error logging event:", error);
      } else {
        console.log("[Track Click] Click event logged successfully");
      }
      
      // Redirect to original URL
      return new Response(null, {
        status: 302,
        headers: {
          "Location": decodedUrl,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (err) {
      console.error("[Track Click] Exception:", err);
      // Still redirect even if logging fails
      if (targetUrl) {
        return new Response(null, {
          status: 302,
          headers: { "Location": decodeURIComponent(targetUrl) },
        });
      }
    }
  }
  
  // Fallback if no URL provided
  return new Response("Missing parameters", { status: 400 });
});
