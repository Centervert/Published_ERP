import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  fullName?: string;
  role?: string;
}

function getInviteEmailTemplate(name: string, inviteLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Author Services Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Author Services Portal</h1>
              <p style="margin: 8px 0 0; color: #a3c4e8; font-size: 14px;">Your publishing partner</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1e3a5f; font-size: 22px; font-weight: 600;">
                Welcome${name ? `, ${name}` : ''}!
              </h2>
              <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                You've been invited to join the <strong>Author Services Portal</strong>. Click the button below to accept your invitation and set up your account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${inviteLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
              <!-- Link fallback -->
              <p style="margin: 24px 0 0; padding: 16px; background-color: #f7fafc; border-radius: 8px; color: #718096; font-size: 12px; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${inviteLink}" style="color: #2d5a87;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f7fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Author Services. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
    const mailgunRegion = Deno.env.get("MAILGUN_REGION") ?? "us";
    
    // Create client with user's auth to check their role
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error("[invite-user] Failed to get current user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if current user is admin or super_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (roleError || !roleData) {
      console.error("[invite-user] Failed to get user role:", roleError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - no role found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (roleData.role !== "admin" && roleData.role !== "super_admin") {
      console.log("[invite-user] User role is not admin:", roleData.role);
      return new Response(
        JSON.stringify({ error: "Only admins can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, role }: InviteUserRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[invite-user] Admin ${currentUser.email} inviting ${email} with role ${role || 'member'}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role assignment permissions
    const requestedRole = role || "member";
    if (requestedRole === "super_admin" && roleData.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Only Super Admins can assign the Super Admin role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use production domain for invite redirects
    const productionDomain = "https://portal.authorservices.com";
    const resetPasswordUrl = `${productionDomain}/reset-password`;

    // Step 1: Create the user without email confirmation
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        full_name: fullName || "",
        invited_role: requestedRole,
      },
    });

    if (createError) {
      console.error("[invite-user] Failed to create user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[invite-user] User created successfully: ${email}, id: ${newUser.user?.id}`);

    // Step 2: Generate a recovery link for the user to set their password
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkError) {
      console.error("[invite-user] Failed to generate recovery link:", linkError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user!.id);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token_hash from the generated link for PKCE flow
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      console.error("[invite-user] No action link in response");
      await supabaseAdmin.auth.admin.deleteUser(newUser.user!.id);
      return new Response(
        JSON.stringify({ error: "Failed to generate invitation link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the action link to extract token_hash and type
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get('token_hash') || actionUrl.hash.split('token=')[1]?.split('&')[0];
    const tokenType = actionUrl.searchParams.get('type') || 'recovery';
    
    // Build our custom invite link with token_hash as query param (scanner-resistant)
    const inviteLink = `${resetPasswordUrl}?token_hash=${encodeURIComponent(linkData.properties?.hashed_token || tokenHash || '')}&type=${tokenType}`;

    console.log(`[invite-user] Recovery link generated for ${email}`);

    // Step 3: Send custom branded email via Mailgun
    const emailHtml = getInviteEmailTemplate(fullName || "", inviteLink);
    
    // Build Mailgun API URL based on region
    const mailgunBaseUrl = mailgunRegion === "eu" 
      ? "https://api.eu.mailgun.net/v3"
      : "https://api.mailgun.net/v3";
    
    const mailgunUrl = `${mailgunBaseUrl}/${mailgunDomain}/messages`;
    
    const formData = new FormData();
    formData.append("from", "Author Services <hello@onboarding.authorservices.com>");
    formData.append("to", email);
    formData.append("subject", "You've been invited to Author Services Portal");
    formData.append("html", emailHtml);

    const mailgunResponse = await fetch(mailgunUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
      },
      body: formData,
    });

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error("[invite-user] Failed to send email via Mailgun:", errorText);
      // Clean up the created user if email sending fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user!.id);
      return new Response(
        JSON.stringify({ error: `Failed to send invitation email: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailgunResult = await mailgunResponse.json();
    console.log(`[invite-user] Invitation email sent successfully to ${email}, Mailgun ID: ${mailgunResult.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}`,
        userId: newUser.user?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[invite-user] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
