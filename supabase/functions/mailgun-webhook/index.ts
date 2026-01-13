import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.190.0/encoding/hex.ts";

// Circuit breaker to protect the database/auth during outages or overload.
let dbDownUntil = 0;
const DB_COOLDOWN_MS = 60_000;
const DB_TIMEOUT_MS = 3000;

const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(t));
};

// HMAC-SHA256 verification
async function verifySignature(signingKey: string, timestamp: string, token: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = encoder.encode(timestamp + token);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const expectedSignature = new TextDecoder().decode(encodeHex(new Uint8Array(signatureBuffer)));
  return signature === expectedSignature;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bot patterns for detecting automated opens
const BOT_PATTERNS = [
  'bot', 'spider', 'crawler', 'googleimageproxy', 'yahoo', 'outlook',
  'windows nt 5.1', 'windows nt 6.1', 'barracuda', 'proofpoint',
  'mimecast', 'microsoft office', 'mozilla/4.0', 'antivirus',
  'security', 'scanner', 'mailscan', 'preview'
];

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Optional kill-switch (set to "true" temporarily if you need to stop webhook DB writes).
    if ((Deno.env.get("PAUSE_EMAIL_EVENT_WEBHOOKS") ?? "").toLowerCase() === "true") {
      return new Response(JSON.stringify({ success: true, paused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const webhookSigningKey = Deno.env.get("MAILGUN_WEBHOOK_SIGNING_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { fetch: fetchWithTimeout },
    });

    // Determine content type and parse accordingly
    const contentType = req.headers.get("content-type") || "";
    let eventData: any;
    let timestamp = "";
    let token = "";
    let signature = "";

    if (contentType.includes("application/json")) {
      // New Mailgun format - JSON payload
      const jsonBody = await req.json();
      console.log("[mailgun-webhook] Received JSON payload");
      
      // Extract signature from JSON
      if (jsonBody.signature) {
        timestamp = jsonBody.signature.timestamp?.toString() || "";
        token = jsonBody.signature.token || "";
        signature = jsonBody.signature.signature || "";
      }
      
      // Event data is in the event-data field
      eventData = jsonBody["event-data"] || jsonBody;
      
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // Legacy Mailgun format - form data
      const formData = await req.formData();
      console.log("[mailgun-webhook] Received form data payload");
      
      timestamp = formData.get("timestamp")?.toString() || "";
      token = formData.get("token")?.toString() || "";
      signature = formData.get("signature")?.toString() || "";
      
      const eventDataStr = formData.get("event-data")?.toString();
      if (eventDataStr) {
        eventData = JSON.parse(eventDataStr);
      } else {
        eventData = {
          event: formData.get("event")?.toString(),
          recipient: formData.get("recipient")?.toString(),
          "user-variables": {},
          "client-info": {},
          message: { headers: {} }
        };
        
        const userVars = formData.get("user-variables");
        if (userVars) {
          try {
            eventData["user-variables"] = JSON.parse(userVars.toString());
          } catch {}
        }
      }
    } else {
      // Try JSON as fallback
      try {
        const jsonBody = await req.json();
        console.log("[mailgun-webhook] Fallback to JSON parsing");
        
        if (jsonBody.signature) {
          timestamp = jsonBody.signature.timestamp?.toString() || "";
          token = jsonBody.signature.token || "";
          signature = jsonBody.signature.signature || "";
        }
        eventData = jsonBody["event-data"] || jsonBody;
      } catch {
        console.error("[mailgun-webhook] Could not parse request body");
        return new Response(JSON.stringify({ error: "Invalid request body" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }
    
    // Verify HMAC signature
    if (webhookSigningKey && signature) {
      const isValid = await verifySignature(webhookSigningKey, timestamp, token, signature);
      if (!isValid) {
        console.error("[mailgun-webhook] Invalid signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }

    const event = eventData.event;
    const recipient = eventData.recipient;
    const campaignId = eventData["user-variables"]?.campaign_id;
    const contactId = eventData["user-variables"]?.contact_id;
    const userAgent = eventData["client-info"]?.["user-agent"] || "";
    const ip = eventData["client-info"]?.["client-ip"] || "";
    const url = eventData.url;
    
    console.log(`[mailgun-webhook] Event: ${event}, Recipient: ${recipient}, Campaign: ${campaignId}`);

    if (!event || !recipient) {
      console.log("[mailgun-webhook] Missing event or recipient");
      return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Map Mailgun events to our event types
    let eventType: string | null = null;
    let updateContactStatus: string | null = null;
    let incrementColumn: string | null = null;
    
    switch (event) {
      case "delivered":
        eventType = "delivered";
        incrementColumn = "delivered_count";
        break;
        
      case "opened":
        eventType = "opened";
        break;
        
      case "clicked":
        eventType = "clicked";
        break;
        
      case "failed":
        // Check if permanent or temporary
        const severity = eventData.severity;
        if (severity === "permanent") {
          eventType = "bounced";
          updateContactStatus = "bounced";
          incrementColumn = "bounce_count";
        } else {
          // Temporary failures are noisy and not supported by the DB constraint; ignore.
          return new Response(JSON.stringify({ success: true, ignored: "temporary_failure" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;

      case "complained":
        eventType = "complained";
        updateContactStatus = "complained";
        incrementColumn = "complaint_count";
        break;
        
      case "unsubscribed":
        eventType = "unsubscribed";
        updateContactStatus = "unsubscribed";
        break;
        
      default:
        console.log(`[mailgun-webhook] Ignoring event type: ${event}`);
        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    // If the DB is struggling, don't add more pressure (auth depends on DB health).
    if (Date.now() < dbDownUntil) {
      console.warn("[mailgun-webhook] DB cooldown active; skipping DB writes");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find contact by email if we don't have contact_id
    let resolvedContactId = contactId;
    if (!resolvedContactId && recipient) {
      const { data: contact, error: lookupError } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", recipient.toLowerCase())
        .maybeSingle();

      if (lookupError) {
        console.error("[mailgun-webhook] Contact lookup error:", lookupError);
        dbDownUntil = Date.now() + DB_COOLDOWN_MS;
      }

      if (contact) {
        resolvedContactId = contact.id;
      }
    }

    // Check for bot opens
    const isBotOpen = eventType === "opened" && isBot(userAgent);

    // Insert event into email_events
    const eventRecord: any = {
      campaign_id: campaignId || null,
      contact_id: resolvedContactId || null,
      email: recipient,
      event_type: eventType,
      user_agent: userAgent || null,
      ip_address: ip || null,
      is_bot: isBotOpen,
    };
    
    if (eventType === "clicked" && url) {
      eventRecord.link_url = url;
    }

    const { error: insertError } = await supabase
      .from("email_events")
      .insert(eventRecord);

    if (insertError) {
      console.error("[mailgun-webhook] Error inserting event:", insertError);
      dbDownUntil = Date.now() + DB_COOLDOWN_MS;
    } else {
      console.log(`[mailgun-webhook] Inserted ${eventType} event for ${recipient}`);
    }

    // Update contact status if needed and log activity
    if (updateContactStatus && resolvedContactId) {
      // First get the current status for the activity log
      const { data: currentContact } = await supabase
        .from("contacts")
        .select("status")
        .eq("id", resolvedContactId)
        .single();
      
      const oldStatus = currentContact?.status || 'active';
      
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ status: updateContactStatus })
        .eq("id", resolvedContactId);
      
      if (updateError) {
        console.error("[mailgun-webhook] Error updating contact status:", updateError);
      } else {
        console.log(`[mailgun-webhook] Updated contact ${resolvedContactId} status to ${updateContactStatus}`);
        
        // Log activity for the status change
        await supabase.from("contact_activity").insert({
          contact_id: resolvedContactId,
          activity_type: 'contact_updated',
          description: `Status changed to ${updateContactStatus}`,
          metadata: {
            changes: {
              status: { from: oldStatus, to: updateContactStatus }
            },
            source: 'webhook',
            event_type: eventType,
            campaign_id: campaignId || null,
          },
          created_by: null, // System action, no user
        });
        console.log(`[mailgun-webhook] Logged activity for status change on contact ${resolvedContactId}`);
      }
    }

    // Increment campaign counter if needed
    if (incrementColumn && campaignId) {
      // Use raw SQL to increment atomically
      const { error: incrementError } = await supabase.rpc("increment_campaign_count", {
        p_campaign_id: campaignId,
        p_column: incrementColumn,
      });
      
      // If RPC doesn't exist, do it manually
      if (incrementError) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select(incrementColumn)
          .eq("id", campaignId)
          .single();
        
        if (campaign) {
          const currentValue = (campaign as any)[incrementColumn] || 0;
          await supabase
            .from("campaigns")
            .update({ [incrementColumn]: currentValue + 1 })
            .eq("id", campaignId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[mailgun-webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
