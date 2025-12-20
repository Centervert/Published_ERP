import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  contact_id: string;
  reply_to?: string;
}

// Refresh the access token using the refresh token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
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
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with user's token to verify auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { to, subject, body, contact_id, reply_to }: SendEmailRequest = await req.json();

    if (!to || !subject || !body || !contact_id) {
      throw new Error('Missing required fields: to, subject, body, contact_id');
    }

    console.log(`Sending email to ${to} for contact ${contact_id}${reply_to ? ` with reply-to: ${reply_to}` : ''}`);

    // Get user's email connection using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: connection, error: connError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .single();

    if (connError || !connection) {
      throw new Error('No Outlook connection found. Please connect your email account in My Profile.');
    }

    let accessToken = connection.access_token;
    const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();

    // Check if token is expired or will expire in the next minute
    if (tokenExpiry && tokenExpiry <= new Date(now.getTime() + 60000)) {
      console.log('Access token expired, refreshing...');
      
      if (!connection.refresh_token) {
        throw new Error('Token expired and no refresh token available. Please reconnect your email account.');
      }

      const refreshResult = await refreshAccessToken(connection.refresh_token);
      if (!refreshResult) {
        throw new Error('Failed to refresh access token. Please reconnect your email account.');
      }

      accessToken = refreshResult.access_token;
      const newExpiry = new Date(now.getTime() + (refreshResult.expires_in * 1000)).toISOString();

      // Update the token in the database
      await supabaseAdmin
        .from('user_email_connections')
        .update({
          access_token: accessToken,
          token_expires_at: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      console.log('Access token refreshed successfully');
    }

    // Build the message object
    const message: Record<string, unknown> = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    };

    // Add replyTo if specified
    if (reply_to) {
      message.replyTo = [
        {
          emailAddress: {
            address: reply_to,
          },
        },
      ];
    }

    // Send email via Microsoft Graph API
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        saveToSentItems: true,
      }),
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', graphResponse.status, errorText);
      throw new Error(`Failed to send email: ${graphResponse.status}`);
    }

    console.log('Email sent successfully via Microsoft Graph');

    // Log the email to contact_communications
    const { data: commData, error: commError } = await supabaseAdmin
      .from('contact_communications')
      .insert({
        contact_id: contact_id,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        body: body,
        status: 'sent',
        created_by: user.id,
      })
      .select()
      .single();

    if (commError) {
      console.error('Failed to log communication:', commError);
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        communication_id: commData?.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in send-email-outlook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
