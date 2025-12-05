import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 { color: #333; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You've been unsubscribed</h1>
    <p>You will no longer receive emails from this list. If this was a mistake, please contact us to re-subscribe.</p>
  </div>
</body>
</html>
`;

serve(async (req) => {
  const url = new URL(req.url);
  
  // Extract parameters
  const campaignId = url.searchParams.get("c");
  const contactId = url.searchParams.get("t");
  const email = url.searchParams.get("e");
  
  console.log(`[Unsubscribe] Campaign: ${campaignId}, Contact: ${contactId}, Email: ${email}`);
  
  if (email) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      // Log the unsubscribe event
      await supabase.from("email_events").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        email: decodeURIComponent(email),
        event_type: "unsubscribed",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });
      
      // Update contact status to unsubscribed (will work once contacts table exists)
      if (contactId) {
        await supabase
          .from("contacts")
          .update({ status: "unsubscribed" })
          .eq("id", contactId);
      }
      
      console.log("[Unsubscribe] Successfully processed unsubscribe");
    } catch (err) {
      console.error("[Unsubscribe] Exception:", err);
    }
  }
  
  // Return confirmation page
  return new Response(HTML_TEMPLATE, {
    headers: { "Content-Type": "text/html" },
  });
});
