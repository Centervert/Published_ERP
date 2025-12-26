import type {
  EmailBlock,
  EmailDocument,
  HeaderBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  ColumnsBlock,
  FooterBlock,
  GreetingBlock,
  AscContactBlock,
} from '@/types/email-blocks';

export interface RenderOptions {
  imprint?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headingFont?: string;
    bodyFont?: string;
    logoUrl?: string;
    websiteUrl?: string;
  };
  trackingPixelUrl?: string;
  unsubscribeUrl?: string;
  // For preview purposes - show placeholder data
  isPreview?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderHeader(block: HeaderBlock, options: RenderOptions): string {
  const bgColor = block.backgroundColor || options.imprint?.backgroundColor || '#ffffff';
  const logoUrl = block.logoUrl || options.imprint?.logoUrl;
  const padding = block.padding || 20;

  return `
    <tr>
      <td style="background-color: ${bgColor}; padding: ${padding}px; text-align: center;">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-height: 60px; width: auto;" />` : ''}
      </td>
    </tr>
  `;
}

function renderText(block: TextBlock, options: RenderOptions): string {
  const color = block.color || options.imprint?.textColor || '#333333';
  const fontSize = block.fontSize || 16;
  const align = block.align || 'left';
  const fontWeight = block.fontWeight || 'normal';
  const lineHeight = block.lineHeight || 1.6;
  const fontFamily = options.imprint?.bodyFont || 'Arial, sans-serif';

  return `
    <tr>
      <td style="padding: 10px 20px;">
        <p style="margin: 0; color: ${color}; font-size: ${fontSize}px; text-align: ${align}; font-weight: ${fontWeight}; line-height: ${lineHeight}; font-family: ${fontFamily};">
          ${block.content}
        </p>
      </td>
    </tr>
  `;
}

function renderHeading(block: HeadingBlock, options: RenderOptions): string {
  const color = block.color || options.imprint?.textColor || '#1f2937';
  const align = block.align || 'left';
  const fontFamily = options.imprint?.headingFont || 'Arial, sans-serif';
  
  const sizes = { 1: 28, 2: 24, 3: 20 };
  const fontSize = sizes[block.level] || 24;
  const tag = `h${block.level}`;

  return `
    <tr>
      <td style="padding: 10px 20px;">
        <${tag} style="margin: 0; color: ${color}; font-size: ${fontSize}px; text-align: ${align}; font-family: ${fontFamily}; font-weight: bold;">
          ${escapeHtml(block.content)}
        </${tag}>
      </td>
    </tr>
  `;
}

function renderImage(block: ImageBlock, options: RenderOptions): string {
  const width = block.width === 'full' ? '100%' : `${block.width}px`;
  const align = block.align || 'center';
  const alt = block.alt || '';
  const padding = block.fullBleed ? '0' : '10px 20px';

  const imgHtml = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(alt)}" style="max-width: 100%; width: ${width}; height: auto; display: block;" />`;
  const linkedImg = block.link ? `<a href="${escapeHtml(block.link)}" target="_blank">${imgHtml}</a>` : imgHtml;

  return `
    <tr>
      <td style="padding: ${padding}; text-align: ${align};">
        ${linkedImg}
      </td>
    </tr>
  `;
}

function renderButton(block: ButtonBlock, options: RenderOptions): string {
  const bgColor = block.backgroundColor || options.imprint?.primaryColor || '#2563eb';
  const textColor = block.textColor || '#ffffff';
  const borderRadius = block.borderRadius || 4;
  const align = block.align || 'center';
  const fullWidth = block.fullWidth ? 'width: 100%;' : '';

  return `
    <tr>
      <td style="padding: 10px 20px; text-align: ${align};">
        <a href="${escapeHtml(block.url)}" target="_blank" style="display: inline-block; ${fullWidth} background-color: ${bgColor}; color: ${textColor}; text-decoration: none; padding: 12px 24px; border-radius: ${borderRadius}px; font-weight: bold; font-size: 16px;">
          ${escapeHtml(block.text)}
        </a>
      </td>
    </tr>
  `;
}

function renderDivider(block: DividerBlock): string {
  const color = block.color || '#e5e7eb';
  const thickness = block.thickness || 1;
  const style = block.style || 'solid';

  return `
    <tr>
      <td style="padding: 10px 20px;">
        <hr style="border: none; border-top: ${thickness}px ${style} ${color}; margin: 0;" />
      </td>
    </tr>
  `;
}

function renderSpacer(block: SpacerBlock): string {
  return `
    <tr>
      <td style="height: ${block.height}px; line-height: ${block.height}px; font-size: 1px;">
        &nbsp;
      </td>
    </tr>
  `;
}

function renderColumns(block: ColumnsBlock, options: RenderOptions): string {
  const gap = block.gap || 16;
  const columnsHtml = block.columns.map((col, index) => {
    const blocksHtml = col.blocks.map(b => renderBlock(b, options)).join('');
    const paddingLeft = index === 0 ? 0 : gap / 2;
    const paddingRight = index === block.columns.length - 1 ? 0 : gap / 2;
    
    return `
      <td style="width: ${col.width}; vertical-align: top; padding-left: ${paddingLeft}px; padding-right: ${paddingRight}px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${blocksHtml}
        </table>
      </td>
    `;
  }).join('');

  return `
    <tr>
      <td style="padding: 10px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${columnsHtml}
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderFooter(block: FooterBlock, options: RenderOptions): string {
  const bgColor = block.backgroundColor || options.imprint?.backgroundColor || '#f9fafb';
  const textColor = block.textColor || '#6b7280';
  const unsubscribeUrl = options.unsubscribeUrl || '{{unsubscribe_url}}';

  return `
    <tr>
      <td style="background-color: ${bgColor}; padding: 24px; text-align: center;">
        <p style="margin: 0 0 12px 0; color: ${textColor}; font-size: 14px;">
          ${block.content}
        </p>
        ${block.companyAddress ? `
          <p style="margin: 0 0 12px 0; color: ${textColor}; font-size: 12px;">
            ${escapeHtml(block.companyAddress)}
          </p>
        ` : ''}
        ${block.reasonText ? `
          <p style="margin: 0 0 12px 0; color: ${textColor}; font-size: 12px; font-style: italic;">
            ${escapeHtml(block.reasonText)}
          </p>
        ` : ''}
        <p style="margin: 0; font-size: 12px;">
          ${block.showUnsubscribe !== false ? `
            <a href="${escapeHtml(unsubscribeUrl)}" style="color: ${textColor}; text-decoration: underline;">
              ${escapeHtml(block.unsubscribeText || 'Unsubscribe')}
            </a>
          ` : ''}
          ${block.privacyUrl ? `
            ${block.showUnsubscribe !== false ? '<span style="color: ' + textColor + ';"> | </span>' : ''}
            <a href="${escapeHtml(block.privacyUrl)}" style="color: ${textColor}; text-decoration: underline;">
              Privacy Policy
            </a>
          ` : ''}
        </p>
      </td>
    </tr>
  `;
}

function renderGreeting(block: GreetingBlock, options: RenderOptions): string {
  const fontFamily = options.imprint?.bodyFont || 'Arial, sans-serif';
  const textColor = options.imprint?.textColor || '#333333';
  const fallbackName = block.fallbackName || 'there';
  
  // For preview, show a placeholder. At send time, Mailgun variables will be used
  const greetingPrefix = block.style === 'casual' ? 'Hey' : '{{greeting}}';
  const firstName = options.isPreview ? 'Sarah' : '%recipient.first_name%';
  const fallback = options.isPreview ? '' : `|default:${fallbackName}`;
  
  // The greeting will be dynamically replaced at send time
  // For preview, use current time to determine greeting
  let previewGreeting = 'Good morning';
  if (options.isPreview) {
    const hour = new Date().getHours();
    if (hour >= 17) previewGreeting = 'Good evening';
    else if (hour >= 12) previewGreeting = 'Good afternoon';
  }
  
  const displayGreeting = options.isPreview 
    ? (block.style === 'casual' ? 'Hey' : previewGreeting)
    : (block.style === 'casual' ? 'Hey' : '%recipient.greeting%');
  
  const displayName = options.isPreview ? 'Sarah' : `%recipient.first_name${fallback}%`;

  return `
    <tr>
      <td style="padding: 10px 20px;">
        <p style="margin: 0; color: ${textColor}; font-size: 16px; line-height: 1.6; font-family: ${fontFamily};">
          ${displayGreeting}, <span style="font-weight: 500;">${displayName}</span>
        </p>
      </td>
    </tr>
  `;
}

function renderAscContact(block: AscContactBlock, options: RenderOptions): string {
  const bgColor = block.backgroundColor || '#f0f9ff';
  const textColor = block.textColor || '#1e40af';
  const buttonColor = block.buttonColor || options.imprint?.primaryColor || '#2563eb';
  const headingText = block.headingText || 'Contact your Author Success Coach today!';
  const showEmail = block.showEmail !== false;
  const showPhone = block.showPhone !== false;
  
  // For preview, show placeholder. At send time, Mailgun variables will be used
  const ascName = options.isPreview ? 'Tyler Amos' : '%recipient.asc_name%';
  const ascEmail = options.isPreview ? 'tyler@authorservices.com' : '%recipient.asc_email%';
  const ascPhone = options.isPreview ? '(555) 123-4567' : '%recipient.asc_phone%';
  
  const emailButton = showEmail ? `
    <a href="mailto:${ascEmail}" style="display: inline-block; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; font-size: 14px; margin: 4px;">
      ✉ Email
    </a>
  ` : '';
  
  const phoneButton = showPhone ? `
    <a href="tel:${ascPhone}" style="display: inline-block; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: 500; font-size: 14px; margin: 4px;">
      📞 ${ascPhone}
    </a>
  ` : '';

  return `
    <tr>
      <td style="padding: 10px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${bgColor}; border-radius: 8px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <h3 style="margin: 0 0 16px 0; color: ${textColor}; font-size: 18px; font-weight: 600;">
                ${escapeHtml(headingText)}
              </h3>
              <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 16px; font-weight: 500;">
                👤 ${ascName}
              </p>
              <div>
                ${emailButton}
                ${phoneButton}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderBlock(block: EmailBlock, options: RenderOptions): string {
  switch (block.type) {
    case 'header':
      return renderHeader(block, options);
    case 'greeting':
      return renderGreeting(block, options);
    case 'text':
      return renderText(block, options);
    case 'heading':
      return renderHeading(block, options);
    case 'image':
      return renderImage(block, options);
    case 'button':
      return renderButton(block, options);
    case 'asc_contact':
      return renderAscContact(block, options);
    case 'divider':
      return renderDivider(block);
    case 'spacer':
      return renderSpacer(block);
    case 'columns':
      return renderColumns(block, options);
    case 'footer':
      return renderFooter(block, options);
    default:
      console.warn(`Unknown block type: ${(block as EmailBlock).type}`);
      return '';
  }
}

export function renderBlocksToHtml(
  blocks: EmailBlock[],
  options: RenderOptions = {}
): string {
  const bgColor = options.imprint?.backgroundColor || '#f4f4f4';
  const maxWidth = 600;
  const bodyFont = options.imprint?.bodyFont || 'Arial, sans-serif';
  const headingFont = options.imprint?.headingFont || bodyFont;

  // Build Google Fonts import if custom fonts
  let fontImport = '';
  const customFonts: string[] = [];
  if (options.imprint?.bodyFont && !['Arial', 'Helvetica', 'Times New Roman', 'Georgia'].includes(options.imprint.bodyFont)) {
    customFonts.push(options.imprint.bodyFont);
  }
  if (options.imprint?.headingFont && !['Arial', 'Helvetica', 'Times New Roman', 'Georgia'].includes(options.imprint.headingFont)) {
    customFonts.push(options.imprint.headingFont);
  }
  if (customFonts.length > 0) {
    const fontsQuery = [...new Set(customFonts)].map(f => f.replace(/ /g, '+')).join('&family=');
    fontImport = `<link href="https://fonts.googleapis.com/css2?family=${fontsQuery}&display=swap" rel="stylesheet">`;
  }

  const blocksHtml = blocks.map(block => renderBlock(block, options)).join('');

  const trackingPixel = options.trackingPixelUrl 
    ? `<img src="${escapeHtml(options.trackingPixelUrl)}" width="1" height="1" alt="" style="display:none;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${fontImport}
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

// For preview (no tracking pixel, placeholder URLs, with preview data)
export function renderBlocksToPreviewHtml(
  blocks: EmailBlock[],
  options: Omit<RenderOptions, 'trackingPixelUrl'>
): string {
  return renderBlocksToHtml(blocks, {
    ...options,
    unsubscribeUrl: '#unsubscribe',
    isPreview: true,
  });
}
