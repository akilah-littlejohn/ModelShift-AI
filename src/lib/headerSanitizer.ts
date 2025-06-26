/**
 * Utilities for sanitizing HTTP headers to ensure they only contain valid characters
 */

/**
 * Checks if a string contains only ISO-8859-1 (Latin-1) characters
 * which are valid for HTTP headers according to the spec
 */
export function isValidHeaderValue(value: string): boolean {
  // Check each character code to ensure it's in the valid range for ISO-8859-1
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Valid ranges for ISO-8859-1: 0-255
    if (code > 255) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitizes a header value to ensure it only contains valid ISO-8859-1 characters
 * @param value The header value to sanitize
 * @param headerName Optional header name for better error messages
 * @returns The sanitized header value
 * @throws Error if the value contains invalid characters and cannot be sanitized
 */
export function sanitizeHeaderValue(value: string, headerName?: string): string {
  if (!value) return value;
  
  // Check if the value is already valid
  if (isValidHeaderValue(value)) {
    return value;
  }
  
  // Try to replace common problematic characters
  const sanitized = value
    // Replace smart quotes with straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace em-dash and en-dash with hyphen
    .replace(/[\u2013\u2014]/g, '-')
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace other common Unicode characters
    .replace(/[\u2026]/g, '...')
    .replace(/[\u2022]/g, '*');
  
  // Check if the sanitized value is valid
  if (!isValidHeaderValue(sanitized)) {
    const invalidChars = [];
    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      if (code > 255) {
        invalidChars.push(`'${sanitized[i]}' (U+${code.toString(16).padStart(4, '0')})`);
      }
    }
    
    const errorMsg = `Header ${headerName || ''} contains invalid characters: ${invalidChars.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  return sanitized;
}

/**
 * Sanitizes all header values in a headers object
 * @param headers The headers object to sanitize
 * @returns A new headers object with sanitized values
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitizedHeaders: Record<string, string> = {};
  
  for (const [name, value] of Object.entries(headers)) {
    try {
      sanitizedHeaders[name] = sanitizeHeaderValue(value, name);
    } catch (error) {
      console.warn(`Failed to sanitize header '${name}': ${error.message}`);
      // Skip this header if it can't be sanitized
    }
  }
  
  return sanitizedHeaders;
}