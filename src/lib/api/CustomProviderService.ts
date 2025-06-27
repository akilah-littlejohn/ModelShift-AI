import { supabase } from '../supabase';
import { keyVault } from '../encryption';
import { getProxyUrl } from '../devProxy';
import { sanitizeHeaders } from '../headerSanitizer';
import { setValueAtPath, getValueAtPath } from '../jsonPathUtils';
import type { ApiConfiguration } from '../../types';

export interface CustomProviderResponse {
  success: boolean;
  response?: string;
  error?: string;
  provider: string;
  metrics?: {
    latency: number;
    tokens: number;
    cost: number;
  };
}

export class CustomProviderService {
  /**
   * Make a direct API call to a custom provider
   */
  static async callProvider(
    providerId: string,
    prompt: string,
    apiConfig: ApiConfiguration,
    keyData: Record<string, string>,
    options: {
      model?: string;
      parameters?: Record<string, any>;
    } = {}
  ): Promise<CustomProviderResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`Making direct request to custom provider ${providerId}`);
      
      // Build the endpoint URL
      let endpoint = `${apiConfig.baseUrl}${apiConfig.endpointPath}`;
      
      // Handle API key in URL parameter
      if (apiConfig.apiKeyInUrlParam && apiConfig.urlParamName) {
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint += `${separator}${apiConfig.urlParamName}=${keyData.apiKey}`;
      }
      
      // Apply dev proxy for CORS handling if needed
      const proxyEndpoint = getProxyUrl(endpoint);
      
      // Build headers
      const headers: Record<string, string> = { ...apiConfig.headers };
      
      // Add authentication header if not using URL parameter
      if (!apiConfig.apiKeyInUrlParam && apiConfig.authHeaderName) {
        const authValue = `${apiConfig.authHeaderPrefix || ''}${keyData.apiKey}`;
        headers[apiConfig.authHeaderName] = authValue;
      }
      
      // Sanitize headers to ensure they only contain valid characters
      const sanitizedHeaders = sanitizeHeaders(headers);
      
      // Build request body
      let requestBody = JSON.parse(JSON.stringify(apiConfig.requestBodyStructure));
      
      // Set the prompt
      requestBody = setValueAtPath(requestBody, apiConfig.promptJsonPath, prompt);
      
      // Set custom model if provided
      if (options.model && apiConfig.modelJsonPath) {
        requestBody = setValueAtPath(requestBody, apiConfig.modelJsonPath, options.model);
      }
      
      // Set project ID if required (IBM specific)
      if (apiConfig.projectIdJsonPath && keyData.projectId) {
        requestBody = setValueAtPath(requestBody, apiConfig.projectIdJsonPath, keyData.projectId);
      }
      
      // Merge custom parameters
      if (options.parameters) {
        if (apiConfig.parametersJsonPath) {
          const currentParams = getValueAtPath(requestBody, apiConfig.parametersJsonPath) || {};
          const mergedParams = { ...currentParams, ...options.parameters };
          requestBody = setValueAtPath(requestBody, apiConfig.parametersJsonPath, mergedParams);
        } else {
          // If no specific path, merge at root level
          requestBody = { ...requestBody, ...options.parameters };
        }
      }
      
      console.log(`Making request to: ${proxyEndpoint}`);
      console.log('Request method:', apiConfig.method);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      // Make the API request
      const response = await fetch(proxyEndpoint, {
        method: apiConfig.method,
        headers: sanitizedHeaders,
        body: JSON.stringify(requestBody),
        mode: 'cors',
        credentials: 'omit'
      });
      
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        let errorText = '';
        let errorDetails = null;
        
        try {
          errorText = await response.text();
          // Try to parse as JSON to get structured error
          if (errorText.trim().startsWith('{')) {
            errorDetails = JSON.parse(errorText);
          }
        } catch (parseError) {
          // If we can't parse the error, use the raw text
          errorText = errorText || `HTTP ${response.status}`;
        }
        
        console.error(`API request failed: ${response.status} ${errorText}`);
        
        // Try to extract error using errorJsonPath if provided
        let errorMessage = '';
        if (apiConfig.errorJsonPath && errorDetails) {
          try {
            const extractedError = getValueAtPath(errorDetails, apiConfig.errorJsonPath);
            if (extractedError) {
              errorMessage = extractedError;
            }
          } catch (pathError) {
            // Ignore path errors
          }
        }
        
        if (!errorMessage) {
          // Enhanced error messages for common issues
          if (response.status === 401) {
            errorMessage = `Authentication failed: Invalid API key`;
          } else if (response.status === 403) {
            errorMessage = `Access forbidden: Check your API key permissions`;
          } else if (response.status === 429) {
            errorMessage = `Rate limit exceeded: Too many requests`;
          } else if (response.status >= 500) {
            errorMessage = `Server error: The service is temporarily unavailable`;
          } else if (response.status === 404) {
            errorMessage = `Endpoint not found: The API endpoint "${apiConfig.endpointPath}" could not be found`;
          } else {
            errorMessage = errorDetails?.error?.message || errorDetails?.message || errorText || 'Unknown error';
          }
        }
        
        return {
          success: false,
          error: errorMessage,
          provider: providerId,
          metrics: {
            latency,
            tokens: 0,
            cost: 0
          }
        };
      }
      
      // Parse response
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        return {
          success: false,
          error: `Failed to parse response: ${jsonError.message}`,
          provider: providerId,
          metrics: {
            latency,
            tokens: 0,
            cost: 0
          }
        };
      }
      
      // Extract response text using responseJsonPath
      const generatedText = getValueAtPath(responseData, apiConfig.responseJsonPath);
      
      if (!generatedText) {
        console.warn(`No text generated from response:`, responseData);
        return {
          success: false,
          error: `No text found in response at path "${apiConfig.responseJsonPath}"`,
          provider: providerId,
          metrics: {
            latency,
            tokens: 0,
            cost: 0
          }
        };
      }
      
      // Estimate token usage
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(generatedText.length / 4);
      
      return {
        success: true,
        response: generatedText,
        provider: providerId,
        metrics: {
          latency,
          tokens: inputTokens + outputTokens,
          cost: 0.01 * (inputTokens + outputTokens) / 1000 // Generic cost estimate
        }
      };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Custom provider error:', error);
      
      // Enhance error messages for common issues
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = `Network error: Unable to connect to the provider. Please check your internet connection and the API endpoint.`;
      } else if (errorMessage.includes('timeout')) {
        errorMessage = `Request timeout: The operation took too long to complete. Please try again with a shorter prompt.`;
      } else if (errorMessage.includes('Invalid header')) {
        errorMessage = `Invalid header value: Please check your API key for special characters.`;
      }
      
      return {
        success: false,
        error: errorMessage,
        provider: providerId,
        metrics: {
          latency,
          tokens: 0,
          cost: 0
        }
      };
    }
  }
}