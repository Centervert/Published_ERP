import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Get the app URL from environment - required for production
const getAppUrl = () => {
  const appUrl = Deno.env.get('APP_URL');
  if (!appUrl) {
    console.warn('[outlook-oauth-callback] APP_URL not set, using fallback');
  }
  return appUrl || 'https://d23f8566-3f14-446e-8064-8aae6e9ffb2b.lovableproject.com';
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const appUrl = getAppUrl();

    console.log('OAuth callback received, code present:', !!code, 'error:', error);

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const errorUrl = `${appUrl}/profile?oauth_error=${encodeURIComponent(errorDescription || error)}`;
      return Response.redirect(errorUrl, 302);
    }

    if (!code || !state) {
      console.error('Missing code or state');
      const errorUrl = `${appUrl}/profile?oauth_error=${encodeURIComponent('Missing authorization code')}`;
      return Response.redirect(errorUrl, 302);
    }

    // Decode state to get userId and returnUrl
    let userId: string;
    let returnUrl = '/profile';
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
      returnUrl = stateData.returnUrl || '/profile';
    } catch {
      console.error('Invalid state parameter');
      const errorUrl = `${appUrl}/profile?oauth_error=${encodeURIComponent('Invalid state')}`;
      return Response.redirect(errorUrl, 302);
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
      const errorUrl = `${appUrl}/profile?oauth_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`;
      return Response.redirect(errorUrl, 302);
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
      const errorUrl = `${appUrl}/profile?oauth_error=${encodeURIComponent('Failed to save credentials')}`;
      return Response.redirect(errorUrl, 302);
    }

    console.log('Successfully saved OAuth tokens for user:', userId);

    // Redirect back to the app with success
    const successUrl = `${appUrl}${returnUrl}?oauth_success=true`;
    return Response.redirect(successUrl, 302);
  } catch (error: unknown) {
    console.error('Error in outlook-oauth-callback:', error);
    const appUrl = getAppUrl();
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorUrl = `${appUrl}/profile?oauth_error=${encodeURIComponent(message)}`;
    return Response.redirect(errorUrl, 302);
  }
});
