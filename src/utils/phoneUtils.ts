/**
 * Utility functions for Indian phone number normalization and formatting.
 * System-wide default: +91 (India)
 */

export const DEFAULT_COUNTRY_CODE = '+91';

/**
 * Normalizes any phone input into a standard Indian format (+91 XXXXX XXXXX).
 * Handles inputs with or without +91, with leading 0, spaces, dashes, etc.
 */
export function formatToIndianMobile(input: string | undefined | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Extract all digits
  const digits = trimmed.replace(/\D/g, '');

  // If starts with 91 and has 12 digits: e.g. 919822144589
  if (digits.startsWith('91') && digits.length === 12) {
    const national = digits.slice(2);
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }

  // If starts with 0 and has 11 digits: e.g. 09822144589
  if (digits.startsWith('0') && digits.length === 11) {
    const national = digits.slice(1);
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }

  // Standard 10 digits
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // If already formatted with +91 or custom length (e.g. landline with STD)
  if (trimmed.startsWith('+91')) {
    return trimmed;
  }

  // Fallback: prefix with +91 if digits exist
  if (digits.length > 0) {
    return `+91 ${digits}`;
  }

  return trimmed;
}

/**
 * Extracts the 10-digit national number from an input that might contain +91 or leading 0.
 */
export function extractNationalDigits(input: string | undefined | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  if (trimmed.startsWith('+91')) {
    return trimmed.slice(3).replace(/\D/g, '').slice(0, 10);
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.slice(1);
  }
  if (digits.length <= 10) {
    return digits;
  }
  // Return last 10 digits as a best effort
  return digits.slice(-10);
}

/**
 * Checks if the string represents a valid 10-digit Indian phone number.
 */
export function isValidIndianMobile(input: string | undefined | null): boolean {
  if (!input) return false;
  const digits = extractNationalDigits(input);
  return digits.length === 10;
}

/**
 * Clean phone number formatted for direct WhatsApp URL (e.g. 919822144589).
 */
export function getWhatsAppNumber(input: string | undefined | null): string {
  if (!input) return '';
  const national = extractNationalDigits(input);
  if (national.length === 10) {
    return `91${national}`;
  }
  const allDigits = input.replace(/\D/g, '');
  return allDigits.startsWith('91') ? allDigits : `91${allDigits}`;
}

/**
 * Clean phone number for tel: link (e.g. +919822144589).
 */
export function getTelNumber(input: string | undefined | null): string {
  if (!input) return '';
  const national = extractNationalDigits(input);
  if (national.length === 10) {
    return `+91${national}`;
  }
  const allDigits = input.replace(/\D/g, '');
  return allDigits.startsWith('91') ? `+${allDigits}` : `+91${allDigits}`;
}
