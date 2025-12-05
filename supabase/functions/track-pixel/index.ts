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

// Known bot and prefetch user-agent patterns
const BOT_PATTERNS = [
  // Apple Mail Privacy Protection
  /mozilla\/5\.0 \(macintosh;.*applewebkit.*\) applewebkit/i,
  
  // Common prefetch/proxy patterns
  /googleimageproxy/i,
  /google favicon/i,
  /feedfetcher/i,
  /yahoo.*slurp/i,
  /bingpreview/i,
  
  // Generic bots
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /wget/i,
  /curl/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  
  // Email security scanners
  /barracuda/i,
  /proofpoint/i,
  /mimecast/i,
  /fireeye/i,
  /messagelabs/i,
  /forcepoint/i,
  /symantec/i,
];

// Known prefetch request headers
function isPrefetchRequest(req: Request): boolean {
  const purpose = req.headers.get("purpose") || req.headers.get("x-purpose");
  const fetchMode = req.headers.get("sec-fetch-mode");
  const fetchDest = req.headers.get("sec-fetch-dest");
  
  // Check for prefetch purpose header
  if (purpose === "prefetch" || purpose === "preview") {
    return true;
  }
  
  // Check for prefetch-like fetch modes
  if (fetchMode === "no-cors" && fetchDest === "image") {
    // This alone isn't definitive, but combined with user-agent it helps
    return false;
  }
  
  return false;
}

function isBot(userAgent: string | null, req: Request): boolean {
  // No user agent is suspicious
  if (!userAgent || userAgent.trim() === "") {
    return true;
  }
  
  // Check for prefetch headers
  if (isPrefetchRequest(req)) {
    return true;
  }
  
  // Check against bot patterns
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract tracking parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  
  const userAgent = req.headers.get("user-agent");
  const isBotRequest = isBot(userAgent, req);
  
  console.log(`[Track Pixel] Campaign: ${campaignId}, Contact: ${contactId}, Email: ${email}, IsBot: ${isBotRequest}`);
  
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
        user_agent: userAgent,
        is_bot: isBotRequest,
      });
      
      if (error) {
        console.error("[Track Pixel] Error logging event:", error);
      } else {
        console.log(`[Track Pixel] Open event logged successfully (is_bot: ${isBotRequest})`);
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
