/**
 * Format a phone number as the user types
 * Produces format: (555) 123-4567
 */
export function formatPhoneNumber(value: string): string {
  // Strip all non-numeric characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Normalize phone number to digits only for storage
 */
export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

/**
 * Check if a phone number is valid (10 digits)
 */
export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10;
}
