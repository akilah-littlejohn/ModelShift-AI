import { supabase } from '../supabase';
import { apiKeysDb } from '../api-keys/api-keys-db';
import { serverEncryption } from '../api-keys/encryption';
import { getProxyUrl, isDevelopment } from '../devProxy';
import type { Provider } from '../../types';

export interface ProxyRequest {
  providerId: string;
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
  agentId?: string;
  userId?: string;
  useUserKey?: boolean; // New flag to indicate whether to use user's API key
}

export interface ProxyResponse {
  success: boolean;
  response?: string;
  error?: string;
  provider: string;
  model?: string;
  usingUserKey?: boolean; // New flag to indicate whether user's API key was used
  metrics?: {
    latency: number;
    tokens: number;
    cost: number;
  };
  metadata?: Record<string, any>;
}

export class ProxyService {
  /**
   * Make an authenticated API call through the Supabase Edge Function
   */
  static async callProvider(request: ProxyRequest): Promise<ProxyResponse> {
    const startTime = Date.now();
    
    try {
      // Check if we should use direct browser mode
      const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'browser';
      if (connectionMode === 'browser') {
        console.log('Using direct browser mode for API call');
        return this.callProviderDirectly(request);
      }
      
      // Get the current session for authentication with timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout after 30 seconds')), 30000)
      );
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
      } catch (timeoutError) {
        console.error('Session verification timeout:', timeoutError);
        throw new Error('Authentication timeout: Unable to verify session. Please check your Supabase configuration or try refreshing the page.');
      }
      
      const { data: { session }, error: sessionError } = sessionResult;
      
      if (sessionError || !session) {
        console.error(`[Auth Error] ${sessionError?.message || 'No active session'}`);
        throw new Error('Authentication error: Please sign in again.');
      }

      // Check if the user has an API key for this provider
      let useUserKey = request.useUserKey;
      
      if (useUserKey === undefined) {
        // Auto-detect if user has a key for this provider
        const hasUserKey = await apiKeysDb.getActiveForProvider(
          request.userId || session.user.id,
          request.providerId
        );
        
        useUserKey = !!hasUserKey;
      }

      // Prepare the request body
      const requestBody = {
        providerId: request.providerId,
        prompt: request.prompt,
        model: request.model,
        parameters: request.parameters,
        agentId: request.agentId,
        userId: request.userId || session.user.id,
        useUserKey
      };

      console.log(`Making authenticated proxy request to ${request.providerId}:`, {
        providerId: request.providerId,
        model: request.model,
        promptLength: request.prompt.length,
        userId: requestBody.userId,
        useUserKey
      });

      // Get the correct URL for the Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured. Please check your environment variables.');
      }
      
      const originalProxyUrl = `${supabaseUrl}/functions/v1/ai-proxy`;
      const proxyUrl = getProxyUrl(originalProxyUrl);

      // Make the authenticated request to the Edge Function with timeout
      const fetchPromise = fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const fetchTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000)
      );
      
      let response;
      try {
        response = await Promise.race([fetchPromise, fetchTimeoutPromise]) as Response;
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        if (fetchError.message.includes('timeout')) {
          throw new Error(`Request to ${request.providerId} timed out after 120 seconds. The service may be experiencing high load or your prompt may be too complex.`);
        }
        throw new Error(`Network error when calling ${request.providerId}: ${fetchError.message}`);
      }

      const latency = Date.now() - startTime;

      // Clone the response to inspect the raw text if needed
      const responseClone = response.clone();
      
      if (!response.ok) {
        // Get the raw text to see what's actually being returned
        const errorText = await responseClone.text();
        console.error('Proxy service returned error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        // Try to parse as JSON if possible
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
          
          // If we got a proper error response from our proxy, use it
          if (errorJson.error) {
            throw new Error(errorJson.error);
          } else {
            throw new Error(`Proxy service error: ${response.status}`);
          }
        } catch (parseError) {
          // If not JSON, use the raw text or status
          if (errorText && errorText.length > 0) {
            throw new Error(errorText);
          } else {
            throw new Error(`Proxy service error: ${response.status}`);
          }
        }
      }

      // Safely parse JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const rawText = await responseClone.text();
        console.error('Failed to parse JSON response:', rawText);
        throw new Error('Invalid response format from proxy service');
      }

      if (!data) {
        throw new Error('No response data from proxy service');
      }

      if (!data.success) {
        console.error('Proxy service returned error:', data.error);
        throw new Error(data.error || 'Proxy service request failed');
      }

      // Extract metrics from response or estimate them
      const inputTokens = Math.ceil(request.prompt.length / 4);
      const outputTokens = Math.ceil((data.response?.length || 0) / 4);
      
      const proxyResponse: ProxyResponse = {
        success: true,
        response: data.response,
        provider: request.providerId,
        model: data.model || request.model,
        usingUserKey: data.using_user_key,
        metrics: {
          latency,
          tokens: data.metrics?.tokens || (inputTokens + outputTokens),
          cost: data.metrics?.cost || this.estimateCost(request.providerId, inputTokens + outputTokens)
        },
        metadata: {
          requestId: data.requestId,
          timestamp: new Date().toISOString(),
          authenticated: true
        }
      };

      console.log(`Proxy request completed successfully:`, {
        providerId: request.providerId,
        latency,
        tokens: proxyResponse.metrics?.tokens,
        cost: proxyResponse.metrics?.cost,
        usingUserKey: data.using_user_key
      });

      return proxyResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Proxy service error:', error);
      
      // Enhance error messages for common issues
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = `Network error: Unable to connect to the AI proxy service. Please check your internet connection and Supabase configuration.`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `Request timeout: The operation took too long to complete. Please try again with a shorter prompt or try later when the service is less busy.`;
      } else if (error.message.includes('not found') && error.message.includes('function')) {
        errorMessage = `Edge Function not found: The ai-proxy function is not deployed. Please deploy the function to your Supabase project.`;
      }
      
      // Return error response with metrics
      return {
        success: false,
        error: errorMessage,
        provider: request.providerId,
        model: request.model,
        metrics: {
          latency,
          tokens: 0,
          cost: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          authenticated: false
        }
      };
    }
  }

  /**
   * Make a direct API call from the browser to the provider
   * This is used when in "browser mode" instead of "server mode"
   */
  private static async callProviderDirectly(request: ProxyRequest): Promise<ProxyResponse> {
    const startTime = Date.now();
    
    try {
      // Import the necessary modules dynamically
      const { keyVault } = await import('../encryption');
      const { providers } = await import('../../data/providers');
      const { ConfigurableClient } = await import('../modelshift-ai-sdk');
      
      // Get provider configuration
      const provider = providers.find(p => p.id === request.providerId);
      if (!provider) {
        throw new Error(`Provider '${request.providerId}' not found in configuration`);
      }
      
      // Get API keys from key vault
      const keyData = keyVault.retrieveDefault(request.providerId);
      if (!keyData) {
        // Provide a more helpful error message with instructions
        const providerName = provider.displayName;
        const errorMessage = `No API key found for ${providerName}. Please add your API key in the API Keys section.

To fix this:
1. Go to Settings → API Keys
2. Click "Add API Key"
3. Select ${providerName}
4. Enter your API key`;
        
        throw new Error(errorMessage);
      }
      
      console.log(`Making direct browser request to ${provider.displayName}`);
      
      // Create a client and make the request
      const client = new ConfigurableClient(keyData, {
        endpoint: provider.apiConfig.baseUrl + provider.apiConfig.endpointPath,
        buildRequestBody: (prompt: string) => {
          let body = JSON.parse(JSON.stringify(provider.apiConfig.requestBodyStructure));
          
          // Set the prompt
          const parts = provider.apiConfig.promptJsonPath.split('.');
          let current = body;
          
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part.includes('[')) {
              const [arrayName, indexStr] = part.split(/\[|\]/);
              const index = parseInt(indexStr);
              if (!current[arrayName]) current[arrayName] = [];
              if (!current[arrayName][index]) current[arrayName][index] = {};
              current = current[arrayName][index];
            } else {
              if (!current[part]) current[part] = {};
              current = current[part];
            }
          }
          
          const lastPart = parts[parts.length - 1];
          if (lastPart.includes('[')) {
            const [arrayName, indexStr] = lastPart.split(/\[|\]/);
            const index = parseInt(indexStr);
            if (!current[arrayName]) current[arrayName] = [];
            current[arrayName][index] = prompt;
          } else {
            current[lastPart] = prompt;
          }
          
          return body;
        },
        parseResponse: (response: any) => {
          const parts = provider.apiConfig.responseJsonPath.split('.');
          let result = response;
          
          for (const part of parts) {
            if (part.includes('[')) {
              const [arrayName, indexStr] = part.split(/\[|\]/);
              const index = parseInt(indexStr);
              result = result?.[arrayName]?.[index];
            } else {
              result = result?.[part];
            }
            
            if (result === undefined) return '';
          }
          
          return result || '';
        },
        buildHeaders: (keyData: Record<string, string>) => {
          const headers = { ...provider.apiConfig.headers };
          
          if (provider.apiConfig.authHeaderName) {
            headers[provider.apiConfig.authHeaderName] = `${provider.apiConfig.authHeaderPrefix || ''}${keyData.apiKey}`;
          }
          
          return headers;
        },
        buildEndpoint: (keyData: Record<string, string>) => {
          let endpoint = provider.apiConfig.baseUrl + provider.apiConfig.endpointPath;
          
          // Handle API key in URL parameter (e.g., Gemini)
          if (provider.apiConfig.apiKeyInUrlParam && provider.apiConfig.urlParamName) {
            const separator = endpoint.includes('?') ? '&' : '?';
            endpoint += `${separator}${provider.apiConfig.urlParamName}=${keyData.apiKey}`;
          }
          
          return endpoint;
        }
      });
      
      const response = await client.generate(request.prompt);
      const latency = Date.now() - startTime;
      
      // Estimate tokens and cost
      const inputTokens = Math.ceil(request.prompt.length / 4);
      const outputTokens = Math.ceil(response.length / 4);
      const estimatedCost = this.estimateCost(request.providerId, inputTokens + outputTokens);
      
      return {
        success: true,
        response,
        provider: request.providerId,
        model: request.model || provider.apiConfig.defaultModel,
        usingUserKey: true,
        metrics: {
          latency,
          tokens: inputTokens + outputTokens,
          cost: estimatedCost
        },
        metadata: {
          timestamp: new Date().toISOString(),
          authenticated: false,
          mode: 'browser'
        }
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Direct browser request failed:', error);
      
      // Enhance error messages for common issues
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = `Network error: Unable to connect to the AI provider directly. This may be due to CORS restrictions. Try switching to Server Proxy Mode in Settings.`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `Request timeout: The operation took too long to complete. Please try again with a shorter prompt or try later when the service is less busy.`;
      } else if (error.message.includes('API key')) {
        // Keep the original message as it's already specific
      } else if (error.message.includes('401') || error.message.includes('Authentication failed')) {
        errorMessage = `Authentication failed: Your API key for ${request.providerId} appears to be invalid. Please check your API key in the API Keys section.`;
      } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
        errorMessage = `Rate limit exceeded: You've made too many requests to ${request.providerId} in a short period. Please wait a few minutes and try again.`;
      }
      
      return {
        success: false,
        error: errorMessage,
        provider: request.providerId,
        model: request.model,
        metrics: {
          latency,
          tokens: 0,
          cost: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          authenticated: false,
          mode: 'browser'
        }
      };
    }
  }

  /**
   * Check if the proxy service is available and properly configured
   */
  static async checkProxyHealth(): Promise<{
    available: boolean;
    authenticated: boolean;
    configuredProviders: string[];
    errors: string[];
  }> {
    try {
      // Check if user is authenticated with timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout after 30 seconds')), 30000)
      );
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
      } catch (timeoutError) {
        console.error('Session timeout during health check:', timeoutError);
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: ['Session timeout - unable to verify authentication. Please check your internet connection and try again.']
        };
      }
      
      const { data: { session }, error: sessionError } = sessionResult;
      
      if (sessionError) {
        console.error('Session error during health check:', sessionError);
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: [`Authentication error: ${sessionError.message}`]
        };
      }
      
      if (!session) {
        console.error('No active session during health check');
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: ['No active session. Please sign in to use the AI proxy.']
        };
      }

      // Check if Supabase is configured for proxy mode
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || 
          supabaseUrl.includes('demo') || supabaseAnonKey.includes('demo')) {
        console.error('Supabase not configured for proxy mode');
        return {
          available: false,
          authenticated: true,
          configuredProviders: [],
          errors: ['Supabase not configured for proxy mode. Please set up your Supabase environment variables.']
        };
      }

      // Test the ai-proxy function with a health check
      try {
        console.log('Testing ai-proxy function with health check');
        
        // Build the health check request
        const originalEndpoint = `${supabaseUrl}/functions/v1/ai-proxy`;
        const proxyEndpoint = getProxyUrl(originalEndpoint);
        
        console.log(`Health check endpoint: ${proxyEndpoint}`);
        
        // Use direct fetch instead of supabase.functions.invoke
        const response = await fetch(proxyEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            providerId: 'health-check',
            prompt: 'test',
            userId: session.user.id
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Health check failed with status ${response.status}:`, errorText);
          
          return {
            available: false,
            authenticated: true,
            configuredProviders: [],
            errors: [`Health check failed with status ${response.status}: ${errorText}`]
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('Health check returned error:', data.error);
          return {
            available: false,
            authenticated: true,
            configuredProviders: [],
            errors: [data.error || 'Health check failed']
          };
        }

        // Parse the health check response
        const configuredProviders = data.configuredProviders || [];
        const errors = data.errors || [];

        console.log('Health check successful:', {
          configuredProviders,
          errors
        });

        return {
          available: true,
          authenticated: true,
          configuredProviders,
          errors
        };

      } catch (testError) {
        console.error('Test error during health check:', testError);
        return {
          available: false,
          authenticated: true,
          configuredProviders: [],
          errors: [testError instanceof Error ? testError.message : 'Health check failed']
        };
      }

    } catch (error) {
      console.error('Error during health check:', error);
      return {
        available: false,
        authenticated: false,
        configuredProviders: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Estimate cost based on provider and tokens
   */
  private static estimateCost(providerId: string, tokens: number): number {
    // Pricing per 1K tokens (as of 2024)
    const pricing: Record<string, number> = {
      openai: 0.06, // GPT-4 output pricing per 1K tokens
      gemini: 0.0015, // Gemini 2.0 Flash output pricing per 1K tokens
      claude: 0.075, // Claude 3 Sonnet output pricing per 1K tokens
      ibm: 0.04 // IBM Granite output pricing per 1K tokens
    };
    
    const pricePerToken = pricing[providerId] || 0.05; // Default fallback
    return (tokens * pricePerToken) / 1000;
  }

  /**
   * Get provider display name
   */
  private static getProviderDisplayName(providerId: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Google Gemini',
      claude: 'Anthropic Claude',
      ibm: 'IBM WatsonX'
    };
    return names[providerId] || providerId;
  }
}