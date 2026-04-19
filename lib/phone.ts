/**
 * Mongolia mobile helpers — DB may store 8 digits (9xxxxxxx), 11 (976…), or pasted formats.
 */
export function mnPhoneSearchVariants(input: string): string[] {
  const digits = input.replace(/\D/g, '');
  if (!digits) return [];

  const out = new Set<string>();
  out.add(digits);

  if (digits.length >= 11 && digits.startsWith('976')) {
    out.add(digits.slice(-8));
  }
  if (digits.length === 11 && digits.startsWith('976')) {
    out.add(digits);
  }
  if (digits.length === 8 && digits.startsWith('9')) {
    out.add(digits);
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    out.add(digits.slice(0, 8));
  }

  return [...out];
}
