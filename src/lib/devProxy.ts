/**
 * Development proxy utilities for handling CORS and network issues
 * in local development environment
 */

/**
 * Check if we're in development environment
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || 
         window.location.hostname === 'localhost' || 
         window.location.hostname.includes('webcontainer') ||
         window.location.hostname.includes('stackblitz');
}

/**
 * Get the proxy URL for a given endpoint in development
 * This helps bypass CORS issues in local development
 * 
 * @param originalUrl The original API endpoint URL
 * @returns The proxied URL for development or the original URL for production
 */
export function getProxyUrl(originalUrl: string): string {
  if (!isDevelopment()) {
    return originalUrl;
  }

  // Map external API URLs to proxy paths
  if (originalUrl.includes('api.openai.com')) {
    return originalUrl.replace('https://api.openai.com', '/api/openai');
  }
  if (originalUrl.includes('api.anthropic.com')) {
    return originalUrl.replace('https://api.anthropic.com', '/api/anthropic');
  }
  if (originalUrl.includes('generativelanguage.googleapis.com')) {
    return originalUrl.replace('https://generativelanguage.googleapis.com', '/api/gemini');
  }
  if (originalUrl.includes('us-south.ml.cloud.ibm.com')) {
    return originalUrl.replace('https://us-south.ml.cloud.ibm.com', '/api/ibm');
  }
  
  // Handle Supabase Edge Functions
  if (originalUrl.includes('/functions/v1/')) {
    // Extract the function name from the URL
    const functionNameMatch = originalUrl.match(/\/functions\/v1\/([^/?]+)/);
    const functionName = functionNameMatch ? functionNameMatch[1] : 'unknown';
    
    // Replace with local proxy
    return `/api/supabase-functions/${functionName}`;
  }

  return originalUrl;
}