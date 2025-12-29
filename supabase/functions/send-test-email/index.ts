import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendTestEmailRequest {
  to: string;
  subject: string;
  html_content: string;
  from_name: string;
  from_email: string;
  blocks_json?: EmailBlock[];
  imprint_id?: string;
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
    logoDarkUrl?: string;
    headerImageUrl?: string;
    headerImageDarkUrl?: string;
  };
  recipientData?: {
    firstName: string;
    greeting: string;
  };
}

// Web-safe font stacks
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
  if (WEB_SAFE_FONTS[font]) return WEB_SAFE_FONTS[font];
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

function isDarkColor(hexColor: string): boolean {
  if (!hexColor) return false;
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 
    ? hex.split('').map(c => c + c).join('') 
    : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

function getAssetForBackground(bgColor: string, lightAsset?: string, darkAsset?: string): string | undefined {
  if (!lightAsset && !darkAsset) return undefined;
  const bgIsDark = isDarkColor(bgColor || '#ffffff');
  if (bgIsDark) {
    return darkAsset || lightAsset || undefined;
  }
  return lightAsset || undefined;
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getUTCHours();
  // Adjust for typical US timezone (EST/PST)
  const estHour = (hour - 5 + 24) % 24;
  if (estHour >= 5 && estHour < 12) return 'Good morning';
  if (estHour >= 12 && estHour < 17) return 'Good afternoon';
  return 'Good evening';
}

function renderBlockToHtml(block: EmailBlock, options: RenderOptions): string {
  const bodyFont = getWebSafeFont(options.imprint?.bodyFont);
  const headingFont = getWebSafeFont(options.imprint?.headingFont);
  const textColor = options.imprint?.textColor || '#333333';
  const primaryColor = options.imprint?.primaryColor || '#2563eb';
  const firstName = options.recipientData?.firstName || 'there';
  const greeting = options.recipientData?.greeting || getTimeBasedGreeting();

  switch (block.type) {
    case 'header':
      const bgColor = (block.backgroundColor as string) || '#ffffff';
      let headerImage: string | undefined = block.logoUrl as string | undefined;
      if (!headerImage) {
        if (options.imprint?.headerImageUrl || options.imprint?.headerImageDarkUrl) {
          headerImage = getAssetForBackground(bgColor, options.imprint.headerImageUrl, options.imprint.headerImageDarkUrl);
        } else {
          headerImage = getAssetForBackground(bgColor, options.imprint?.logoUrl, options.imprint?.logoDarkUrl);
        }
      }
      return `<tr><td style="background-color: ${bgColor}; padding: ${block.padding || 20}px; text-align: center;">${headerImage ? `<img src="${escapeHtml(headerImage)}" alt="Header" style="max-height: 80px; width: auto;" />` : ''}</td></tr>`;

    case 'greeting':
      const greetingStyle = (block.style as string) || 'formal';
      const greetingPrefix = greetingStyle === 'casual' ? 'Hey' : greeting;
      return `<tr><td style="padding: 10px 20px;"><p style="margin: 0; color: ${textColor}; font-size: 16px; line-height: 1.6; font-family: ${bodyFont};">${greetingPrefix}, <span style="font-weight: 500;">${escapeHtml(firstName)}</span></p></td></tr>`;

    case 'text':
      let content = block.content as string;
      // Replace personalization tokens with actual test recipient data
      content = content.replace(/\{\{FIRST_NAME\}\}/gi, escapeHtml(firstName));
      content = content.replace(/\{\{LAST_NAME\}\}/gi, '');
      content = content.replace(/\{\{EMAIL\}\}/gi, '');
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

    case 'columns':
      const columns = (block.columns as { width: string; blocks: EmailBlock[] }[]) || [];
      const gap = (block.gap as number) || 16;
      const columnsHtml = columns.map((col, index) => {
        const colBlocksHtml = col.blocks.map(b => renderBlockToHtml(b, options)).join('');
        const paddingLeft = index === 0 ? 0 : gap / 2;
        const paddingRight = index === columns.length - 1 ? 0 : gap / 2;
        return `<td style="width: ${col.width}; vertical-align: top; padding-left: ${paddingLeft}px; padding-right: ${paddingRight}px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${colBlocksHtml}</table></td>`;
      }).join('');
      return `<tr><td style="padding: 10px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${columnsHtml}</tr></table></td></tr>`;

    case 'asc_contact':
      const ascBgColor = (block.backgroundColor as string) || '#f0f9ff';
      const ascTextColor = (block.textColor as string) || '#1e40af';
      const ascButtonColor = (block.buttonColor as string) || primaryColor;
      const headingText = (block.headingText as string) || 'Contact your Author Success Coach today!';
      const showEmail = block.showEmail !== false;
      const showPhone = block.showPhone !== false;
      
      const emailDisplay = showEmail ? `<p style="margin: 0 0 12px 0; color: ${ascTextColor}; font-size: 14px;">✉️ test@example.com</p>` : '';
      const phoneButton = showPhone ? `<a href="tel:555-555-5555" style="display: inline-block; background-color: ${ascButtonColor}; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; font-size: 14px;">📞 Call 555-555-5555</a>` : '';
      
      return `<tr><td style="padding: 10px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${ascBgColor}; border-radius: 8px;"><tr><td style="padding: 24px; text-align: center;"><h3 style="margin: 0 0 16px 0; color: ${ascTextColor}; font-size: 18px; font-weight: 600;">${escapeHtml(headingText)}</h3><p style="margin: 0 0 12px 0; color: ${ascTextColor}; font-size: 16px; font-weight: 500;">👤 Your Coach</p>${emailDisplay}<div>${phoneButton}</div></td></tr></table></td></tr>`;

    case 'footer':
      const footerBg = (block.backgroundColor as string) || '#f9fafb';
      const footerTextColor = (block.textColor as string) || '#6b7280';
      const footerContent = escapeHtml(block.content as string || '');
      const companyAddress = (block.companyAddress as string) || '';
      const reasonText = (block.reasonText as string) || '';
      const COMPANY_PHONE = '866-381-2665';
      return `<tr><td style="background-color: ${footerBg}; padding: 24px; text-align: center;"><p style="margin: 0 0 12px 0; color: ${footerTextColor}; font-size: 14px; font-family: ${bodyFont};">${footerContent}</p>${companyAddress ? `<p style="margin: 0 0 8px 0; color: ${footerTextColor}; font-size: 12px; font-family: ${bodyFont};">${escapeHtml(companyAddress)}</p><p style="margin: 0 0 12px 0; color: ${footerTextColor}; font-size: 12px; font-family: ${bodyFont};">${COMPANY_PHONE}</p>` : ''}${reasonText ? `<p style="margin: 0 0 12px 0; color: ${footerTextColor}; font-size: 12px; font-style: italic; font-family: ${bodyFont};">${escapeHtml(reasonText)}</p>` : ''}${block.showUnsubscribe !== false ? `<a href="#" style="color: ${footerTextColor}; font-size: 12px; text-decoration: underline; font-family: ${bodyFont};">${escapeHtml((block.unsubscribeText as string) || 'Unsubscribe')}</a>` : ''}</td></tr>`;

    default:
      console.log(`[send-test-email] Unknown block type: ${block.type}`);
      return '';
  }
}

function renderBlocksToHtml(blocks: EmailBlock[], options: RenderOptions = {}): string {
  const bgColor = options.imprint?.backgroundColor || '#f4f4f4';
  const bodyFont = getWebSafeFont(options.imprint?.bodyFont);
  const headingFont = getWebSafeFont(options.imprint?.headingFont);
  const maxWidth = 600;

  const blocksHtml = blocks.map(block => renderBlockToHtml(block, options)).join('');

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, html_content, from_name, from_email, blocks_json, imprint_id }: SendTestEmailRequest = await req.json();

    if (!to || !subject || (!html_content && !blocks_json) || !from_name || !from_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html_content or blocks_json, from_name, from_email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Try to look up the test recipient in the contacts table
    let recipientFirstName = 'there';
    const { data: contactData } = await supabaseClient
      .from('contacts')
      .select('first_name')
      .eq('email', to.toLowerCase())
      .maybeSingle();
    
    if (contactData?.first_name) {
      recipientFirstName = contactData.first_name;
      console.log(`[send-test-email] Found contact: ${recipientFirstName}`);
    } else {
      console.log(`[send-test-email] No contact found for ${to}, using fallback name`);
    }

    // Determine which HTML to send
    let finalHtml: string;
    
    if (blocks_json && Array.isArray(blocks_json) && blocks_json.length > 0) {
      console.log(`[send-test-email] Re-rendering ${blocks_json.length} blocks with personalization`);
      
      // Fetch imprint styling if available
      let imprintData = null;
      if (imprint_id) {
        const { data } = await supabaseClient
          .from('imprints')
          .select('primary_color, background_color, text_color, heading_font, body_font, logo_url, logo_dark_url, header_image_url, header_image_dark_url')
          .eq('id', imprint_id)
          .maybeSingle();
        imprintData = data;
      }

      const renderOptions: RenderOptions = {
        imprint: imprintData ? {
          primaryColor: imprintData.primary_color || undefined,
          backgroundColor: imprintData.background_color || undefined,
          textColor: imprintData.text_color || undefined,
          headingFont: imprintData.heading_font || undefined,
          bodyFont: imprintData.body_font || undefined,
          logoUrl: imprintData.logo_url || undefined,
          logoDarkUrl: imprintData.logo_dark_url || undefined,
          headerImageUrl: imprintData.header_image_url || undefined,
          headerImageDarkUrl: imprintData.header_image_dark_url || undefined,
        } : undefined,
        recipientData: {
          firstName: recipientFirstName,
          greeting: getTimeBasedGreeting(),
        },
      };

      finalHtml = renderBlocksToHtml(blocks_json, renderOptions);
    } else {
      console.log(`[send-test-email] No blocks_json provided, using html_content as fallback (may contain hardcoded names)`);
      finalHtml = html_content;
    }

    // Mailgun configuration
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
    const mailgunRegion = Deno.env.get("MAILGUN_REGION") ?? "US";
    
    if (!mailgunApiKey || !mailgunDomain) {
      return new Response(
        JSON.stringify({ error: "Mailgun configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const mailgunBaseUrl = mailgunRegion === "EU" 
      ? "https://api.eu.mailgun.net/v3" 
      : "https://api.mailgun.net/v3";

    console.log(`[send-test-email] Sending test email to: ${to}, from: ${from_name} <noreply@newauthor.authorservices.com>`);

    const formData = new FormData();
    formData.append("from", `${from_name} <noreply@newauthor.authorservices.com>`);
    formData.append("to", to);
    formData.append("subject", `[TEST] ${subject}`);
    formData.append("html", finalHtml);

    const mailgunResponse = await fetch(`${mailgunBaseUrl}/${mailgunDomain}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`,
      },
      body: formData,
    });

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error(`[send-test-email] Mailgun error: ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Mailgun API error: ${mailgunResponse.status}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await mailgunResponse.json();
    console.log("[send-test-email] Test email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-test-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
