/**
 * Phone number formatting utilities
 */

/**
 * Format a phone number as user types
 * Handles US phone numbers: (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");
  
  // If empty, return empty
  if (!digits) return "";
  
  // Handle country code
  let phoneDigits = digits;
  let countryCode = "";
  
  // If starts with 1 and has more than 10 digits, treat first digit as country code
  if (digits.startsWith("1") && digits.length > 10) {
    countryCode = "+1 ";
    phoneDigits = digits.slice(1);
  } else if (digits.length > 10) {
    // For other country codes, preserve them
    const extraDigits = digits.length - 10;
    countryCode = `+${digits.slice(0, extraDigits)} `;
    phoneDigits = digits.slice(extraDigits);
  }
  
  // Format the main phone number
  const len = phoneDigits.length;
  
  if (len <= 3) {
    return countryCode + phoneDigits;
  }
  
  if (len <= 6) {
    return countryCode + `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3)}`;
  }
  
  return countryCode + `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
};

/**
 * Add default country code if missing
 * Assumes US (+1) as default
 */
export const addDefaultCountryCode = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  
  if (!digits) return "";
  
  // If exactly 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If 11 digits starting with 1, format as US
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  // Otherwise return as-is with + prefix if not present
  if (!digits.startsWith("+")) {
    return `+${digits}`;
  }
  
  return phone;
};

/**
 * Parse phone number into E.164 format for storage
 */
export const parsePhoneToE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  
  if (!digits) return "";
  
  // If 10 digits, assume US
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If already has country code
  if (digits.length >= 11) {
    return `+${digits}`;
  }
  
  return digits;
};

/**
 * Validate phone number (basic validation)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  // Must have at least 10 digits
  return digits.length >= 10 && digits.length <= 15;
};
