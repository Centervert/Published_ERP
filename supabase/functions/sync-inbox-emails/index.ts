import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Refresh the access token using the refresh token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  const clientId = Deno.env.get('AZURE_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Missing Azure credentials');
    return null;
  }

  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'offline_access openid profile email Mail.Read Mail.Send Mail.ReadWrite',
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Token refresh error:', data.error, data.error_description);
      return null;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  from: { emailAddress: { address: string; name: string } };
  receivedDateTime: string;
  isRead: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: allow syncing for a specific user
    let specificUserId: string | null = null;
    try {
      const body = await req.json();
      specificUserId = body.user_id || null;
    } catch {
      // No body provided, will sync all users
    }

    // Get all email connections (or specific user's)
    let query = supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'outlook');
    
    if (specificUserId) {
      query = query.eq('user_id', specificUserId);
    }

    const { data: connections, error: connError } = await query;

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No email connections to sync', synced: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing inbox for ${connections.length} connection(s)`);

    let totalSynced = 0;

    for (const connection of connections) {
      try {
        let accessToken = connection.access_token;
        const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
        const now = new Date();

        // Refresh token if expired
        if (tokenExpiry && tokenExpiry <= new Date(now.getTime() + 60000)) {
          console.log(`Refreshing token for user ${connection.user_id}`);
          
          if (!connection.refresh_token) {
            console.error(`No refresh token for user ${connection.user_id}`);
            continue;
          }

          const refreshResult = await refreshAccessToken(connection.refresh_token);
          if (!refreshResult) {
            console.error(`Failed to refresh token for user ${connection.user_id}`);
            continue;
          }

          accessToken = refreshResult.access_token;
          const newExpiry = new Date(now.getTime() + (refreshResult.expires_in * 1000)).toISOString();

          await supabaseAdmin
            .from('user_email_connections')
            .update({
              access_token: accessToken,
              refresh_token: refreshResult.refresh_token || connection.refresh_token,
              token_expires_at: newExpiry,
              updated_at: new Date().toISOString(),
            })
            .eq('id', connection.id);
        }

        // Build the Graph API query
        const lastSync = connection.last_inbox_sync_at;
        let filter = '';
        if (lastSync) {
          // Only fetch emails received after last sync
          filter = `&$filter=receivedDateTime ge ${lastSync}`;
        }

        // Fetch recent inbox messages (last 50 if no previous sync, or filtered by date)
        const messagesUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead${filter}`;
        
        const graphResponse = await fetch(messagesUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!graphResponse.ok) {
          console.error(`Graph API error for user ${connection.user_id}:`, graphResponse.status);
          continue;
        }

        const messagesData = await graphResponse.json();
        const messages: GraphMessage[] = messagesData.value || [];

        console.log(`Fetched ${messages.length} messages for user ${connection.user_id}`);

        // Get all contacts for matching
        const { data: contacts } = await supabaseAdmin
          .from('contacts')
          .select('id, email');

        const contactsByEmail = new Map<string, string>();
        for (const contact of contacts || []) {
          if (contact.email) {
            contactsByEmail.set(contact.email.toLowerCase(), contact.id);
          }
        }

        // Get existing external_ids to avoid duplicates
        const messageIds = messages.map(m => m.id);
        const { data: existingComms } = await supabaseAdmin
          .from('contact_communications')
          .select('external_id')
          .in('external_id', messageIds);

        const existingIds = new Set((existingComms || []).map(c => c.external_id));

        let syncedCount = 0;

        for (const message of messages) {
          // Skip if already imported
          if (existingIds.has(message.id)) {
            continue;
          }

          const senderEmail = message.from?.emailAddress?.address?.toLowerCase();
          if (!senderEmail) continue;

          // Check if sender is a known contact
          const contactId = contactsByEmail.get(senderEmail);
          if (!contactId) {
            // Sender is not a CRM contact, skip
            continue;
          }

          // Insert the email as an inbound communication
          const { error: insertError } = await supabaseAdmin
            .from('contact_communications')
            .insert({
              contact_id: contactId,
              type: 'email',
              direction: 'inbound',
              subject: message.subject || '(No Subject)',
              body: message.body?.content || message.bodyPreview,
              status: 'delivered',
              external_id: message.id,
              created_at: message.receivedDateTime,
              created_by: connection.user_id,
            });

          if (insertError) {
            console.error(`Failed to insert message ${message.id}:`, insertError);
          } else {
            syncedCount++;
          }
        }

        // Update last sync timestamp
        await supabaseAdmin
          .from('user_email_connections')
          .update({
            last_inbox_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        console.log(`Synced ${syncedCount} new emails for user ${connection.user_id}`);
        totalSynced += syncedCount;

      } catch (userError) {
        console.error(`Error syncing user ${connection.user_id}:`, userError);
        // Continue with other users
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Inbox sync complete`,
        synced: totalSynced,
        connections_processed: connections.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-inbox-emails:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
