/**
 * Email tracking utilities for wrapping HTML emails with tracking pixel and link redirects
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TrackingParams {
  campaignId: string;
  contactId: string;
  email: string;
}

/**
 * Generate a tracking pixel URL
 */
export function getTrackingPixelUrl(params: TrackingParams): string {
  const { campaignId, contactId, email } = params;
  return `${SUPABASE_URL}/functions/v1/track-pixel?c=${campaignId}&t=${contactId}&e=${encodeURIComponent(email)}`;
}

/**
 * Generate an HTML tracking pixel tag
 */
export function getTrackingPixelHtml(params: TrackingParams): string {
  const url = getTrackingPixelUrl(params);
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
}

/**
 * Wrap a URL with click tracking
 */
export function wrapLinkForTracking(originalUrl: string, params: TrackingParams): string {
  const { campaignId, contactId, email } = params;
  return `${SUPABASE_URL}/functions/v1/track-click?c=${campaignId}&t=${contactId}&e=${encodeURIComponent(email)}&url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Generate an unsubscribe URL
 */
export function getUnsubscribeUrl(params: TrackingParams): string {
  const { campaignId, contactId, email } = params;
  return `${SUPABASE_URL}/functions/v1/unsubscribe?c=${campaignId}&t=${contactId}&e=${encodeURIComponent(email)}`;
}

/**
 * Process HTML email content to add tracking
 * - Adds tracking pixel before </body>
 * - Wraps all <a href="..."> links with click tracking
 * - Adds unsubscribe link placeholder replacement
 */
export function processEmailForTracking(html: string, params: TrackingParams): string {
  let processed = html;
  
  // Replace {{UNSUBSCRIBE_URL}} placeholder with actual unsubscribe link
  processed = processed.replace(
    /\{\{UNSUBSCRIBE_URL\}\}/gi,
    getUnsubscribeUrl(params)
  );
  
  // Wrap all href links with tracking (except mailto: and unsubscribe links)
  processed = processed.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi,
    (match, before, url, after) => {
      // Skip mailto links, tel links, and already-tracked links
      if (
        url.startsWith('mailto:') || 
        url.startsWith('tel:') || 
        url.includes('/functions/v1/track-') ||
        url.includes('/functions/v1/unsubscribe')
      ) {
        return match;
      }
      const trackedUrl = wrapLinkForTracking(url, params);
      return `<a ${before}href="${trackedUrl}"${after}>`;
    }
  );
  
  // Add tracking pixel before </body>
  const trackingPixel = getTrackingPixelHtml(params);
  if (processed.includes('</body>')) {
    processed = processed.replace('</body>', `${trackingPixel}</body>`);
  } else {
    // If no body tag, append to end
    processed += trackingPixel;
  }
  
  return processed;
}
