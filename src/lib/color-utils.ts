/**
 * Determines if a hex color is dark based on luminance
 * Uses the relative luminance formula from WCAG
 */
export function isDarkColor(hexColor: string): boolean {
  // Default to light if no color provided
  if (!hexColor) return false;
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Handle shorthand hex (e.g., #fff)
  const fullHex = hex.length === 3 
    ? hex.split('').map(c => c + c).join('') 
    : hex;
  
  // Parse RGB values
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  // If parsing failed, assume light
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  
  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // If luminance is less than 0.5, it's a dark color
  return luminance < 0.5;
}

/**
 * Returns the appropriate logo URL based on background color
 * Uses dark logo on dark backgrounds, light logo on light backgrounds
 */
export function getLogoForBackground(
  backgroundColor: string | undefined,
  logoUrl: string | undefined | null,
  logoDarkUrl: string | undefined | null
): string | undefined {
  if (!logoUrl && !logoDarkUrl) return undefined;
  
  const bgIsDark = isDarkColor(backgroundColor || '#ffffff');
  
  // On dark backgrounds, use the dark logo (which should be light-colored)
  // On light backgrounds, use the regular logo (which should be dark-colored)
  if (bgIsDark) {
    return logoDarkUrl || logoUrl || undefined;
  }
  
  return logoUrl || undefined;
}
