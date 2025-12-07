import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('OAuth callback received, code present:', !!code, 'error:', error);

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>${errorDescription || error}</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Missing authorization code</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
    } catch {
      console.error('Invalid state parameter');
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Invalid state</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const clientId = Deno.env.get('AZURE_CLIENT_ID');
    const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const redirectUri = `${supabaseUrl}/functions/v1/outlook-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error, tokenData.error_description);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>${tokenData.error_description || tokenData.error}</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('Token exchange successful for user:', userId);

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    const userInfo = await userInfoResponse.json();

    console.log('Retrieved Microsoft user info:', userInfo.mail || userInfo.userPrincipalName);

    // Store tokens in database
    const supabaseClient = createClient(
      supabaseUrl!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    const { error: upsertError } = await supabaseClient
      .from('user_email_connections')
      .upsert({
        user_id: userId,
        provider: 'outlook',
        email: userInfo.mail || userInfo.userPrincipalName,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Failed to save credentials</p><script>window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('Successfully saved OAuth tokens for user:', userId);

    // Success - close the popup and notify parent window
    return new Response(
      `<html>
        <body>
          <h1>Success!</h1>
          <p>Your Outlook account has been connected. This window will close automatically.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OUTLOOK_CONNECTED', success: true }, '*');
            }
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: unknown) {
    console.error('Error in outlook-oauth-callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><h1>Authentication Failed</h1><p>${message}</p><script>window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
