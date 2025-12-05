import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
]);

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract tracking parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  
  console.log(`[Track Pixel] Campaign: ${campaignId}, Contact: ${contactId}, Email: ${email}`);
  
  // Log the open event
  if (campaignId && email) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { error } = await supabase.from("email_events").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        email: decodeURIComponent(email),
        event_type: "opened",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });
      
      if (error) {
        console.error("[Track Pixel] Error logging event:", error);
      } else {
        console.log("[Track Pixel] Open event logged successfully");
      }
    } catch (err) {
      console.error("[Track Pixel] Exception:", err);
    }
  }
  
  // Return 1x1 transparent GIF
  return new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
