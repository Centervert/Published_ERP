import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

// Resend webhook event types we care about
type ResendEventType = 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked';

interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    tags?: Record<string, string>;
    bounce?: {
      message: string;
      type?: string; // hard, soft, etc.
    };
    click?: {
      link: string;
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
    open?: {
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
  };
}

// Map Resend event types to our internal event types
function mapEventType(resendType: ResendEventType): string {
  switch (resendType) {
    case 'email.sent': return 'sent';
    case 'email.delivered': return 'delivered';
    case 'email.bounced': return 'bounced';
    case 'email.complained': return 'complained';
    case 'email.opened': return 'opened';
    case 'email.clicked': return 'clicked';
    default: return resendType;
  }
}

// Verify the webhook signature from Resend (using Svix)
async function verifyWebhookSignature(
  payload: string,
  headers: { svixId: string; svixTimestamp: string; svixSignature: string },
  secret: string
): Promise<boolean> {
  try {
    // Resend uses Svix for webhook signing
    // The secret is base64 encoded and starts with "whsec_"
    const secretBytes = Uint8Array.from(atob(secret.replace('whsec_', '')), c => c.charCodeAt(0));
    
    // Create the signed content: "svix_id.svix_timestamp.payload"
    const signedContent = `${headers.svixId}.${headers.svixTimestamp}.${payload}`;
    const encoder = new TextEncoder();
    
    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Compute the HMAC
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    // The signature header contains multiple signatures separated by spaces, 
    // each prefixed with "v1,"
    const signatures = headers.svixSignature.split(' ');
    for (const sig of signatures) {
      const [version, hash] = sig.split(',');
      if (version === 'v1' && hash === expectedSignature) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[resend-webhook] Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw payload for signature verification
    const payload = await req.text();
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const svixId = req.headers.get('svix-id') || '';
      const svixTimestamp = req.headers.get('svix-timestamp') || '';
      const svixSignature = req.headers.get('svix-signature') || '';

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('[resend-webhook] Missing Svix headers');
        return new Response(JSON.stringify({ error: 'Missing webhook signature headers' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isValid = await verifyWebhookSignature(payload, { svixId, svixTimestamp, svixSignature }, webhookSecret);
      
      if (!isValid) {
        console.error('[resend-webhook] Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('[resend-webhook] Signature verified successfully');
    } else {
      console.warn('[resend-webhook] No webhook secret configured, skipping signature verification');
    }

    // Parse the webhook event
    const event: ResendWebhookEvent = JSON.parse(payload);
    console.log(`[resend-webhook] Received event: ${event.type} for email_id: ${event.data.email_id}`);

    // Extract campaign_id and contact_id from tags
    const campaignId = event.data.tags?.campaign_id;
    const contactId = event.data.tags?.contact_id;
    const recipientEmail = event.data.to[0];

    // Map the event type
    const eventType = mapEventType(event.type);

    // Log the event to email_events table
    const eventData: Record<string, unknown> = {
      campaign_id: campaignId || null,
      contact_id: contactId || null,
      email: recipientEmail,
      event_type: eventType,
      created_at: event.created_at,
    };

    // Add additional metadata for specific event types
    if (event.type === 'email.bounced' && event.data.bounce) {
      eventData.link_url = event.data.bounce.type || 'unknown'; // Store bounce type in link_url field
    }
    
    if (event.type === 'email.clicked' && event.data.click) {
      eventData.link_url = event.data.click.link;
      eventData.ip_address = event.data.click.ipAddress;
      eventData.user_agent = event.data.click.userAgent;
    }
    
    if (event.type === 'email.opened' && event.data.open) {
      eventData.ip_address = event.data.open.ipAddress;
      eventData.user_agent = event.data.open.userAgent;
    }

    // Insert the event
    const { error: eventError } = await supabase.from('email_events').insert(eventData);

    if (eventError) {
      console.error('[resend-webhook] Failed to insert email event:', eventError);
      // Don't throw - we want to acknowledge receipt even if logging fails
    } else {
      console.log(`[resend-webhook] Logged ${eventType} event for ${recipientEmail}`);
    }

    // For bounces and complaints, update contact status to protect sender reputation
    if ((event.type === 'email.bounced' || event.type === 'email.complained') && recipientEmail) {
      const newStatus = event.type === 'email.bounced' ? 'bounced' : 'complained';
      
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ status: newStatus })
        .eq('email', recipientEmail.toLowerCase());

      if (contactError) {
        console.error(`[resend-webhook] Failed to update contact status for ${recipientEmail}:`, contactError);
      } else {
        console.log(`[resend-webhook] Updated contact status to '${newStatus}' for ${recipientEmail}`);
      }
    }

    return new Response(JSON.stringify({ success: true, event_type: eventType }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[resend-webhook] Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
