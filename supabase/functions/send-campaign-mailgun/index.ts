import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

interface SendCampaignRequest {
  campaignId: string;
  listIds: string[];
  imprintIds?: string[];
  additionalRecipients?: string[];
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
}

// Web-safe font stacks (no Google Fonts import for email clients)
const WEB_SAFE_FONTS: Record<string, string> = {
  'Arial': 'Arial, Helvetica, sans-serif',
  'Helvetica': 'Helvetica, Arial, sans-serif',
  'Georgia': 'Georgia, Times New Roman, serif',
  'Times New Roman': 'Times New Roman, Times, serif',
  'Verdana': 'Verdana, Geneva, sans-serif',
  'Trebuchet MS': 'Trebuchet MS, Lucida Sans, sans-serif',
  'Courier New': 'Courier New, Courier, monospace',
  'Tahoma': 'Tahoma, Verdana, sans-serif',
  'Lucida Sans': 'Lucida Sans Unicode, Lucida Grande, sans-serif',
};

function getWebSafeFont(font: string | undefined): string {
  if (!font) return 'Arial, Helvetica, sans-serif';
  // If it's already a web-safe font, return the full stack
  if (WEB_SAFE_FONTS[font]) return WEB_SAFE_FONTS[font];
  // For Google Fonts, fall back to Arial with the original as first choice
  return `${font}, Arial, Helvetica, sans-serif`;
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
  const bodyFont = getWebSafeFont(options.imprint?.bodyFont);
  const headingFont = getWebSafeFont(options.imprint?.headingFont);
  const textColor = options.imprint?.textColor || '#333333';
  const primaryColor = options.imprint?.primaryColor || '#2563eb';

  switch (block.type) {
    case 'header':
      const logoUrl = (block.logoUrl as string) || options.imprint?.logoUrl;
      const bgColor = (block.backgroundColor as string) || '#ffffff';
      return `<tr><td style="background-color: ${bgColor}; padding: ${block.padding || 20}px; text-align: center;">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-height: 60px; width: auto;" />` : ''}</td></tr>`;

    case 'text':
      // Use Mailgun personalization tokens
      let content = block.content as string;
      content = content.replace(/\{\{FIRST_NAME\}\}/gi, '%recipient.first_name%');
      content = content.replace(/\{\{LAST_NAME\}\}/gi, '%recipient.last_name%');
      content = content.replace(/\{\{EMAIL\}\}/gi, '%recipient.email%');
      return `<tr><td style="padding: 10px 20px;"><p style="margin: 0; color: ${block.color || textColor}; font-size: ${block.fontSize || 16}px; text-align: ${block.align || 'left'}; font-weight: ${block.fontWeight || 'normal'}; line-height: ${block.lineHeight || 1.6}; font-family: ${bodyFont};">${content}</p></td></tr>`;

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
      return `<tr><td style="padding: 10px 20px; text-align: ${block.align || 'center'};"><a href="${escapeHtml(block.url as string)}" target="_blank" style="display: inline-block; ${fullWidth} background-color: ${btnBg}; color: ${btnText}; text-decoration: none; padding: 12px 24px; border-radius: ${btnRadius}px; font-weight: bold; font-size: 16px; font-family: ${bodyFont};">${escapeHtml(block.text as string)}</a></td></tr>`;

    case 'divider':
      return `<tr><td style="padding: 10px 20px;"><hr style="border: none; border-top: ${block.thickness || 1}px ${block.style || 'solid'} ${block.color || '#e5e7eb'}; margin: 0;" /></td></tr>`;

    case 'spacer':
      return `<tr><td style="height: ${block.height}px; line-height: ${block.height}px; font-size: 1px;">&nbsp;</td></tr>`;

    case 'footer':
      const footerBg = (block.backgroundColor as string) || '#f9fafb';
      const footerText = (block.textColor as string) || '#6b7280';
      // Use Mailgun personalization for unsubscribe URL
      const unsubUrl = '%recipient.unsubscribe_url%';
      // Escape footer content to prevent XSS
      const footerContent = escapeHtml(block.content as string || '');
      return `<tr><td style="background-color: ${footerBg}; padding: 20px; text-align: center;"><p style="margin: 0 0 10px 0; color: ${footerText}; font-size: 14px; font-family: ${bodyFont};">${footerContent}</p>${block.showUnsubscribe !== false ? `<a href="${unsubUrl}" style="color: ${footerText}; font-size: 12px; text-decoration: underline; font-family: ${bodyFont};">${escapeHtml((block.unsubscribeText as string) || 'Unsubscribe')}</a>` : ''}</td></tr>`;

    default:
      return '';
  }
}

function renderBlocksToHtml(blocks: EmailBlock[], options: RenderOptions = {}): string {
  const bgColor = options.imprint?.backgroundColor || '#f4f4f4';
  const bodyFont = getWebSafeFont(options.imprint?.bodyFont);
  const headingFont = getWebSafeFont(options.imprint?.headingFont);
  const maxWidth = 600;

  const blocksHtml = blocks.map(block => renderBlockToHtml(block, options)).join('');

  // No Google Fonts import - using web-safe fonts only for better email client compatibility
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
</body>
</html>`;
}

function renderBlocksToPlainText(blocks: EmailBlock[]): string {
  const lines: string[] = [];
  
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        // Strip HTML tags and convert personalization tokens
        let content = (block.content as string || '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]*>/g, '')
          .replace(/\{\{FIRST_NAME\}\}/gi, '%recipient.first_name%')
          .replace(/\{\{LAST_NAME\}\}/gi, '%recipient.last_name%')
          .replace(/\{\{EMAIL\}\}/gi, '%recipient.email%')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        if (content) lines.push(content);
        break;
        
      case 'heading':
        const heading = (block.content as string || '').trim();
        if (heading) {
          lines.push(heading.toUpperCase());
          lines.push('');
        }
        break;
        
      case 'button':
        const buttonText = block.text as string || 'Click here';
        const buttonUrl = block.url as string || '';
        lines.push(`${buttonText}: ${buttonUrl}`);
        lines.push('');
        break;
        
      case 'divider':
        lines.push('-------------------------------------------');
        break;
        
      case 'spacer':
        lines.push('');
        break;
        
      case 'footer':
        lines.push('');
        lines.push('-------------------------------------------');
        const footerContent = (block.content as string || '').replace(/<[^>]*>/g, '').trim();
        if (footerContent) lines.push(footerContent);
        if (block.showUnsubscribe !== false) {
          lines.push('');
          lines.push('Unsubscribe: %recipient.unsubscribe_url%');
        }
        break;
    }
  }
  
  return lines.join('\n');
}

function formatRFC2822(date: Date): string {
  // Format: "Mon, 15 Dec 2025 10:30:00 -0500"
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = days[date.getUTCDay()];
  const dayNum = String(date.getUTCDate()).padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
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
    
    const hasWorkerAuth = workerKey && workerKey === expectedWorkerKey;
    const hasUserAuth = authHeader && authHeader.startsWith("Bearer ");
    
    if (!hasWorkerAuth && !hasUserAuth) {
      console.log("[send-campaign-mailgun] Unauthorized: no valid auth found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mailgun config
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
    const mailgunRegion = Deno.env.get("MAILGUN_REGION") ?? "US";
    
    if (!mailgunApiKey || !mailgunDomain) {
      throw new Error("Mailgun configuration missing");
    }

    const mailgunBaseUrl = mailgunRegion === "EU" 
      ? "https://api.eu.mailgun.net/v3" 
      : "https://api.mailgun.net/v3";

    const { campaignId, listIds, imprintIds, additionalRecipients }: SendCampaignRequest = await req.json();
    
    console.log(`[send-campaign-mailgun] Starting campaign ${campaignId}`);
    console.log(`[send-campaign-mailgun] Lists: ${listIds.join(", ")}, Imprints: ${imprintIds?.join(", ") || "all"}, Additional: ${additionalRecipients?.length || 0}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "sending" && campaign.status !== "scheduled") {
      throw new Error("Campaign has already been sent or cannot be modified");
    }

    // Update campaign status to sending
    await supabase
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Fetch contacts from lists and imprints (union logic)
    // Skip contacts with status: bounced, complained, unsubscribed
    let contacts: any[] = [];
    const seenEmails = new Set<string>();
    
    const addUniqueContacts = (newContacts: any[]) => {
      for (const contact of newContacts) {
        const emailLower = contact.email?.toLowerCase();
        if (emailLower && !seenEmails.has(emailLower)) {
          seenEmails.add(emailLower);
          contacts.push(contact);
        }
      }
    };
    
    // Get contacts from selected lists
    if (listIds.length > 0) {
      const { data: contactListEntries } = await supabase
        .from("contact_lists")
        .select("contact_id")
        .in("list_id", listIds);

      if (contactListEntries && contactListEntries.length > 0) {
        const contactIdsList = contactListEntries.map(e => e.contact_id);
        const batchSize = 500;
        for (let i = 0; i < contactIdsList.length; i += batchSize) {
          const batch = contactIdsList.slice(i, i + batchSize);
          const { data: batchContacts } = await supabase
            .from("contacts")
            .select("id, email, first_name, last_name, imprint_id")
            .in("id", batch)
            .not("status", "in", "(bounced,complained,unsubscribed)");
          
          if (batchContacts) {
            addUniqueContacts(batchContacts);
          }
        }
      }
    }

    // Get contacts from selected imprints
    if (imprintIds && imprintIds.length > 0) {
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: imprintContacts } = await supabase
          .from("contacts")
          .select("id, email, first_name, last_name, imprint_id")
          .in("imprint_id", imprintIds)
          .not("status", "in", "(bounced,complained,unsubscribed)")
          .range(offset, offset + pageSize - 1);
        
        if (imprintContacts && imprintContacts.length > 0) {
          addUniqueContacts(imprintContacts);
          offset += pageSize;
          hasMore = imprintContacts.length === pageSize;
        } else {
          hasMore = false;
        }
      }
    }

    console.log(`[send-campaign-mailgun] Total unique contacts: ${contacts.length}`);

    if (contacts.length === 0 && (!additionalRecipients || additionalRecipients.length === 0)) {
      await supabase
        .from("campaigns")
        .update({ status: "failed" })
        .eq("id", campaignId);
      throw new Error("No contacts found in selected lists/imprints");
    }

    // Fetch imprint for styling (use the first imprint if multiple, or fetch based on campaign)
    let imprintOptions: RenderOptions = {};
    if (imprintIds && imprintIds.length > 0) {
      const { data: imprint } = await supabase
        .from("imprints")
        .select("primary_color, background_color, text_color, heading_font, body_font, logo_url")
        .eq("id", imprintIds[0])
        .single();
      
      if (imprint) {
        imprintOptions = {
          imprint: {
            primaryColor: imprint.primary_color || undefined,
            backgroundColor: imprint.background_color || undefined,
            textColor: imprint.text_color || undefined,
            headingFont: imprint.heading_font || undefined,
            bodyFont: imprint.body_font || undefined,
            logoUrl: imprint.logo_url || undefined,
          }
        };
        console.log(`[send-campaign-mailgun] Applying imprint styling from: ${imprintIds[0]}`);
      }
    }

    // Render HTML from blocks with imprint styling
    let htmlTemplate = campaign.html_content;
    let plainTextTemplate = '';
    
    if (campaign.blocks_json && Array.isArray(campaign.blocks_json) && campaign.blocks_json.length > 0) {
      console.log(`[send-campaign-mailgun] Rendering ${campaign.blocks_json.length} blocks with imprint styling`);
      htmlTemplate = renderBlocksToHtml(campaign.blocks_json as EmailBlock[], imprintOptions);
      plainTextTemplate = renderBlocksToPlainText(campaign.blocks_json as EmailBlock[]);
    }

    // Replace personalization tokens with Mailgun syntax
    htmlTemplate = htmlTemplate
      .replace(/\{\{FIRST_NAME\}\}/gi, '%recipient.first_name%')
      .replace(/\{\{LAST_NAME\}\}/gi, '%recipient.last_name%')
      .replace(/\{\{EMAIL\}\}/gi, '%recipient.email%')
      .replace(/\{\{UNSUBSCRIBE_URL\}\}/gi, '%recipient.unsubscribe_url%')
      .replace(/\{\{unsubscribe_url\}\}/gi, '%recipient.unsubscribe_url%');

    // Ensure footer has physical address for CAN-SPAM compliance
    if (!htmlTemplate.includes('Author Services') && !htmlTemplate.includes('physical address')) {
      htmlTemplate = htmlTemplate.replace(
        '</body>',
        '<p style="font-size:11px;color:#999;text-align:center;margin-top:20px;">Author Services, 2727 Paces Ferry Road SE, Building Two, Suite 250, Atlanta, GA 30339</p></body>'
      );
    }

    // Add CAN-SPAM address to plain text if not present
    if (plainTextTemplate && !plainTextTemplate.includes('Author Services')) {
      plainTextTemplate += '\n\n---\nAuthor Services, 2727 Paces Ferry Road SE, Building Two, Suite 250, Atlanta, GA 30339';
    }

    // Hardcoded sender and reply-to (no custom reply-to until mail forwarding is set up)
    const fromEmail = "noreply@newauthor.authorservices.com";
    const fromName = campaign.from_name || "Author Services";
    const replyTo = "noreply@newauthor.authorservices.com";

    // Build recipient batches (max 1000 per Mailgun API call)
    const BATCH_SIZE = 1000;
    let totalSent = 0;
    const sentEvents: any[] = [];

    for (let batchStart = 0; batchStart < contacts.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, contacts.length);
      const batchContacts = contacts.slice(batchStart, batchEnd);
      
      // Build recipient list and recipient-variables
      const recipientEmails: string[] = [];
      const recipientVariables: Record<string, any> = {};
      
      for (const contact of batchContacts) {
        recipientEmails.push(contact.email);
        
        // Generate unsubscribe URL for this contact
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?c=${campaignId}&t=${contact.id}&e=${encodeURIComponent(contact.email)}`;
        
        recipientVariables[contact.email] = {
          first_name: contact.first_name || "there",
          last_name: contact.last_name || "",
          email: contact.email,
          contact_id: contact.id,
          unsubscribe_url: unsubscribeUrl,
        };
        
        // Prepare sent event for logging
        sentEvents.push({
          campaign_id: campaignId,
          contact_id: contact.id,
          email: contact.email,
          event_type: "sent",
        });
      }
      
      // Build form data for Mailgun
      const formData = new FormData();
      formData.append("from", `${fromName} <${fromEmail}>`);
      formData.append("to", recipientEmails.join(","));
      formData.append("subject", campaign.subject);
      formData.append("html", htmlTemplate);
      
      // Add plain text version for better deliverability
      if (plainTextTemplate) {
        formData.append("text", plainTextTemplate);
      }
      
      formData.append("recipient-variables", JSON.stringify(recipientVariables));
      
      // Tracking
      formData.append("o:tracking", "yes");
      formData.append("o:tracking-opens", "yes");
      formData.append("o:tracking-clicks", "htmlonly");
      
      // Custom variables for webhook correlation
      formData.append("v:campaign_id", campaignId);
      
      // Headers - hardcoded reply-to
      formData.append("h:Reply-To", replyTo);
      formData.append("h:List-Unsubscribe", `<%recipient.unsubscribe_url%>`);
      formData.append("h:List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
      
      // If campaign is scheduled, use Mailgun's scheduling
      if (campaign.scheduled_at) {
        const scheduledDate = new Date(campaign.scheduled_at);
        if (scheduledDate > new Date()) {
          formData.append("o:deliverytime", formatRFC2822(scheduledDate));
          console.log(`[send-campaign-mailgun] Scheduling batch for: ${scheduledDate.toISOString()}`);
        }
      }

      // Send to Mailgun
      console.log(`[send-campaign-mailgun] Sending batch ${batchStart / BATCH_SIZE + 1} with ${recipientEmails.length} recipients`);
      
      const mailgunResponse = await fetch(`${mailgunBaseUrl}/${mailgunDomain}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      });

      if (!mailgunResponse.ok) {
        const errorText = await mailgunResponse.text();
        console.error(`[send-campaign-mailgun] Mailgun error: ${errorText}`);
        throw new Error(`Mailgun API error: ${mailgunResponse.status} - ${errorText}`);
      }

      const mailgunResult = await mailgunResponse.json();
      console.log(`[send-campaign-mailgun] Batch sent successfully:`, mailgunResult);
      
      totalSent += recipientEmails.length;
    }

    // Add additional recipients if any
    if (additionalRecipients && additionalRecipients.length > 0) {
      const additionalEmails = additionalRecipients.filter(e => !seenEmails.has(e.toLowerCase()));
      
      if (additionalEmails.length > 0) {
        const recipientVariables: Record<string, any> = {};
        
        for (const email of additionalEmails) {
          const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?c=${campaignId}&e=${encodeURIComponent(email)}`;
          recipientVariables[email] = {
            first_name: "there",
            last_name: "",
            email: email,
            unsubscribe_url: unsubscribeUrl,
          };
          
          sentEvents.push({
            campaign_id: campaignId,
            email: email,
            event_type: "sent",
          });
        }
        
        const formData = new FormData();
        formData.append("from", `${fromName} <${fromEmail}>`);
        formData.append("to", additionalEmails.join(","));
        formData.append("subject", campaign.subject);
        formData.append("html", htmlTemplate);
        
        if (plainTextTemplate) {
          formData.append("text", plainTextTemplate);
        }
        
        formData.append("recipient-variables", JSON.stringify(recipientVariables));
        formData.append("o:tracking", "yes");
        formData.append("o:tracking-opens", "yes");
        formData.append("o:tracking-clicks", "htmlonly");
        formData.append("v:campaign_id", campaignId);
        formData.append("h:Reply-To", replyTo);
        formData.append("h:List-Unsubscribe", `<%recipient.unsubscribe_url%>`);
        formData.append("h:List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
        
        if (campaign.scheduled_at) {
          const scheduledDate = new Date(campaign.scheduled_at);
          if (scheduledDate > new Date()) {
            formData.append("o:deliverytime", formatRFC2822(scheduledDate));
          }
        }

        const mailgunResponse = await fetch(`${mailgunBaseUrl}/${mailgunDomain}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
          },
          body: formData,
        });

        if (!mailgunResponse.ok) {
          const errorText = await mailgunResponse.text();
          console.error(`[send-campaign-mailgun] Additional recipients error: ${errorText}`);
        } else {
          totalSent += additionalEmails.length;
        }
      }
    }

    // Log sent events in batches
    const eventBatchSize = 500;
    for (let i = 0; i < sentEvents.length; i += eventBatchSize) {
      const batch = sentEvents.slice(i, i + eventBatchSize);
      await supabase.from("email_events").insert(batch);
    }

    // Update campaign status
    await supabase
      .from("campaigns")
      .update({ 
        status: campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date() ? "scheduled" : "sent",
        sent_at: campaign.scheduled_at || new Date().toISOString(),
        total_recipients: totalSent,
      })
      .eq("id", campaignId);

    console.log(`[send-campaign-mailgun] Campaign ${campaignId} completed. Total sent: ${totalSent}`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-campaign-mailgun] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
