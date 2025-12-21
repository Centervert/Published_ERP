import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaignId: string;
  listIds: string[];
  imprintIds?: string[];
  additionalRecipients?: string[];
  routeRepliesToAsc?: boolean;
}

interface EmailBlock {
  id: string;
  type: string;
  [key: string]: unknown;
}

interface RenderOptions {
  imprint?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headingFont?: string;
    bodyFont?: string;
    logoUrl?: string;
  };
  trackingPixelUrl?: string;
  unsubscribeUrl?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBlockToHtml(block: EmailBlock, options: RenderOptions): string {
  const bodyFont = options.imprint?.bodyFont || 'Arial, sans-serif';
  const headingFont = options.imprint?.headingFont || bodyFont;
  const textColor = options.imprint?.textColor || '#333333';
  const primaryColor = options.imprint?.primaryColor || '#2563eb';

  switch (block.type) {
    case 'header':
      const logoUrl = (block.logoUrl as string) || options.imprint?.logoUrl;
      const bgColor = (block.backgroundColor as string) || '#ffffff';
      return `<tr><td style="background-color: ${bgColor}; padding: ${block.padding || 20}px; text-align: center;">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-height: 60px; width: auto;" />` : ''}</td></tr>`;

    case 'text':
      return `<tr><td style="padding: 10px 20px;"><p style="margin: 0; color: ${block.color || textColor}; font-size: ${block.fontSize || 16}px; text-align: ${block.align || 'left'}; font-weight: ${block.fontWeight || 'normal'}; line-height: ${block.lineHeight || 1.6}; font-family: ${bodyFont};">${block.content}</p></td></tr>`;

    case 'heading':
      const sizes: Record<number, number> = { 1: 28, 2: 24, 3: 20 };
      const fontSize = sizes[block.level as number] || 24;
      return `<tr><td style="padding: 10px 20px;"><h${block.level} style="margin: 0; color: ${block.color || textColor}; font-size: ${fontSize}px; text-align: ${block.align || 'left'}; font-family: ${headingFont}; font-weight: bold;">${escapeHtml(block.content as string)}</h${block.level}></td></tr>`;

    case 'image':
      const width = block.width === 'full' ? '100%' : `${block.width}px`;
      const imgHtml = `<img src="${escapeHtml(block.src as string)}" alt="${escapeHtml((block.alt as string) || '')}" style="max-width: 100%; width: ${width}; height: auto; display: block;" />`;
      const linkedImg = block.link ? `<a href="${escapeHtml(block.link as string)}" target="_blank">${imgHtml}</a>` : imgHtml;
      return `<tr><td style="padding: 10px 20px; text-align: ${block.align || 'center'};">${linkedImg}</td></tr>`;

    case 'button':
      const btnBg = (block.backgroundColor as string) || primaryColor;
      const btnText = (block.textColor as string) || '#ffffff';
      const btnRadius = block.borderRadius || 4;
      const fullWidth = block.fullWidth ? 'width: 100%;' : '';
      return `<tr><td style="padding: 10px 20px; text-align: ${block.align || 'center'};"><a href="${escapeHtml(block.url as string)}" target="_blank" style="display: inline-block; ${fullWidth} background-color: ${btnBg}; color: ${btnText}; text-decoration: none; padding: 12px 24px; border-radius: ${btnRadius}px; font-weight: bold; font-size: 16px;">${escapeHtml(block.text as string)}</a></td></tr>`;

    case 'divider':
      return `<tr><td style="padding: 10px 20px;"><hr style="border: none; border-top: ${block.thickness || 1}px ${block.style || 'solid'} ${block.color || '#e5e7eb'}; margin: 0;" /></td></tr>`;

    case 'spacer':
      return `<tr><td style="height: ${block.height}px; line-height: ${block.height}px; font-size: 1px;">&nbsp;</td></tr>`;

    case 'footer':
      const footerBg = (block.backgroundColor as string) || '#f9fafb';
      const footerText = (block.textColor as string) || '#6b7280';
      const unsubUrl = options.unsubscribeUrl || '{{unsubscribe_url}}';
      return `<tr><td style="background-color: ${footerBg}; padding: 20px; text-align: center;"><p style="margin: 0 0 10px 0; color: ${footerText}; font-size: 14px;">${block.content}</p>${block.showUnsubscribe !== false ? `<a href="${escapeHtml(unsubUrl)}" style="color: ${footerText}; font-size: 12px; text-decoration: underline;">${escapeHtml((block.unsubscribeText as string) || 'Unsubscribe')}</a>` : ''}</td></tr>`;

    default:
      return '';
  }
}

function renderBlocksToHtml(blocks: EmailBlock[], options: RenderOptions = {}): string {
  const bgColor = options.imprint?.backgroundColor || '#f4f4f4';
  const bodyFont = options.imprint?.bodyFont || 'Arial, sans-serif';
  const headingFont = options.imprint?.headingFont || bodyFont;
  const maxWidth = 600;

  const blocksHtml = blocks.map(block => renderBlockToHtml(block, options)).join('');
  const trackingPixel = options.trackingPixelUrl 
    ? `<img src="${escapeHtml(options.trackingPixelUrl)}" width="1" height="1" alt="" style="display:none;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    body { margin: 0; padding: 0; width: 100%; background-color: ${bgColor}; font-family: ${bodyFont}; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: inherit; }
    h1, h2, h3 { font-family: ${headingFont}; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor};">
  <center>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${bgColor};">
      <tr>
        <td align="center" valign="top" style="padding: 20px 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${maxWidth}" class="email-container" style="max-width: ${maxWidth}px; background-color: #ffffff;">
            ${blocksHtml}
          </table>
        </td>
      </tr>
    </table>
  </center>
  ${trackingPixel}
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for worker API key OR valid authorization header
    const workerKey = req.headers.get("x-worker-key");
    const expectedWorkerKey = Deno.env.get("WORKER_API_KEY");
    const authHeader = req.headers.get("authorization");
    
    // Allow access if worker API key matches OR if there's a valid auth header
    const hasWorkerAuth = workerKey && workerKey === expectedWorkerKey;
    const hasUserAuth = authHeader && authHeader.startsWith("Bearer ");
    
    if (!hasWorkerAuth && !hasUserAuth) {
      console.log("[send-campaign] Unauthorized: no valid auth found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, listIds, imprintIds, additionalRecipients, routeRepliesToAsc }: SendCampaignRequest = await req.json();
    
    console.log(`[send-campaign] Queueing campaign ${campaignId} to lists: ${listIds.join(", ")}, imprints: ${imprintIds?.join(", ") || "all"}, additional: ${additionalRecipients?.length || 0}, routeRepliesToAsc: ${routeRepliesToAsc}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Allow draft or sending (scheduled campaigns are set to sending before calling this)
    if (campaign.status !== "draft" && campaign.status !== "sending") {
      throw new Error("Campaign has already been sent or cannot be modified");
    }

    // Update campaign status to sending
    await supabase
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Get contacts from selected lists (active only, not unsubscribed/bounced)
    // Include assigned_asc for reply-to routing
    let contactsQuery = supabase
      .from("contacts")
      .select("id, email, first_name, last_name, imprint_id, assigned_asc")
      .eq("status", "active");

    // Filter by lists if specified
    if (listIds.length > 0) {
      const { data: contactListEntries } = await supabase
        .from("contact_lists")
        .select("contact_id")
        .in("list_id", listIds);

      if (contactListEntries && contactListEntries.length > 0) {
        const contactIds = contactListEntries.map(e => e.contact_id);
        contactsQuery = contactsQuery.in("id", contactIds);
      }
    }

    // Filter by imprints if specified
    if (imprintIds && imprintIds.length > 0) {
      contactsQuery = contactsQuery.in("imprint_id", imprintIds);
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      await supabase
        .from("campaigns")
        .update({ status: "failed" })
        .eq("id", campaignId);
      throw new Error("No active contacts found in selected lists");
    }

    console.log(`[send-campaign] Found ${contacts.length} contacts to queue`);

    // If routing replies to ASC, fetch ASC profiles
    let ascProfiles: Record<string, string> = {};
    if (routeRepliesToAsc) {
      const ascIds = [...new Set(contacts.filter(c => c.assigned_asc).map(c => c.assigned_asc as string))];
      if (ascIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", ascIds);
        
        if (profiles) {
          ascProfiles = Object.fromEntries(profiles.map(p => [p.id, p.email]));
          console.log(`[send-campaign] Loaded ${profiles.length} ASC profiles for reply-to routing`);
        }
      }
    }

    // Update total recipients
    await supabase
      .from("campaigns")
      .update({ total_recipients: contacts.length })
      .eq("id", campaignId);

    // Determine HTML content: render from blocks if available, else use html_content
    let baseHtml = campaign.html_content;
    
    if (campaign.blocks_json && Array.isArray(campaign.blocks_json) && campaign.blocks_json.length > 0) {
      console.log(`[send-campaign] Rendering ${campaign.blocks_json.length} blocks to HTML`);
      baseHtml = renderBlocksToHtml(campaign.blocks_json as EmailBlock[], {
        imprint: {
          // Blocks already have their styling baked in, but we can pass defaults
        },
      });
    }

    // Prepare queue entries with all data needed for sending
    const queueEntries = contacts.map(contact => {
      let personalizedHtml = baseHtml
        .replace(/\{\{FIRST_NAME\}\}/g, contact.first_name || "there")
        .replace(/\{\{LAST_NAME\}\}/g, contact.last_name || "")
        .replace(/\{\{EMAIL\}\}/g, contact.email);

      // Add tracking pixel
      const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-pixel?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}`;
      personalizedHtml = personalizedHtml.replace(
        "</body>",
        `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`
      );

      // Wrap links for click tracking
      const linkRegex = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;
      personalizedHtml = personalizedHtml.replace(linkRegex, (match: string, pre: string, url: string, post: string) => {
        if (url.includes("unsubscribe")) return match;
        const trackedUrl = `${supabaseUrl}/functions/v1/track-click?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}&u=${encodeURIComponent(url)}`;
        return `<a ${pre}${trackedUrl}${post}>`;
      });

      // Add unsubscribe link
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}`;
      personalizedHtml = personalizedHtml
        .replace(/\{\{UNSUBSCRIBE_URL\}\}/gi, unsubscribeUrl)
        .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

      // Determine reply-to email
      // If routeRepliesToAsc is enabled and contact has an ASC with email, use that
      let replyToEmail = campaign.reply_to_email || null;
      if (routeRepliesToAsc && contact.assigned_asc && ascProfiles[contact.assigned_asc]) {
        replyToEmail = ascProfiles[contact.assigned_asc];
      }

      return {
        campaign_id: campaignId,
        contact_id: contact.id,
        email: contact.email,
        status: "pending",
        subject: campaign.subject,
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        reply_to_email: replyToEmail,
        html_content: personalizedHtml,
        contact_first_name: contact.first_name,
        contact_last_name: contact.last_name,
      };
    });

    // Add additional recipients (test emails) to the queue
    if (additionalRecipients && additionalRecipients.length > 0) {
      for (const email of additionalRecipients) {
        if (!email || !email.includes('@')) continue;
        
        let personalizedHtml = baseHtml
          .replace(/\{\{FIRST_NAME\}\}/g, "Test")
          .replace(/\{\{LAST_NAME\}\}/g, "User")
          .replace(/\{\{EMAIL\}\}/g, email);

        // Add tracking pixel for test recipients too
        const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-pixel?c=${campaignId}&t=test&e=${encodeURIComponent(email)}`;
        personalizedHtml = personalizedHtml.replace(
          "</body>",
          `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`
        );

        // Wrap links for click tracking
        const linkRegex = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;
        personalizedHtml = personalizedHtml.replace(linkRegex, (match: string, pre: string, url: string, post: string) => {
          if (url.includes("unsubscribe")) return match;
          const trackedUrl = `${supabaseUrl}/functions/v1/track-click?c=${campaignId}&t=test&e=${encodeURIComponent(email)}&u=${encodeURIComponent(url)}`;
          return `<a ${pre}${trackedUrl}${post}>`;
        });

        // Add unsubscribe link
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?c=${campaignId}&t=test&e=${encodeURIComponent(email)}`;
        personalizedHtml = personalizedHtml
          .replace(/\{\{UNSUBSCRIBE_URL\}\}/gi, unsubscribeUrl)
          .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

        queueEntries.push({
          campaign_id: campaignId,
          contact_id: null,
          email: email,
          status: "pending",
          subject: campaign.subject,
          from_name: campaign.from_name,
          from_email: campaign.from_email,
          reply_to_email: campaign.reply_to_email || null,
          html_content: personalizedHtml,
          contact_first_name: "Test",
          contact_last_name: "User",
        });
      }
      console.log(`[send-campaign] Added ${additionalRecipients.length} additional recipients`);
    }

    // Insert all emails into the queue
    const { error: insertError } = await supabase.from("email_queue").insert(queueEntries);
    
    if (insertError) {
      console.error("[send-campaign] Failed to insert queue entries:", insertError);
      throw new Error(`Failed to queue emails: ${insertError.message}`);
    }

    console.log(`[send-campaign] Successfully queued ${contacts.length} emails for VPS worker to process`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        queued: contacts.length,
        message: "Emails queued for sending. VPS worker will process them."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[send-campaign] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
