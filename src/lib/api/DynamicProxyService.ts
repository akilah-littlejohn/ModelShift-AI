import { supabase } from '../supabase';
import { providers } from '../../data/providers';
import { keyVault } from '../encryption';
import { getProxyUrl } from '../devProxy';
import type { Provider } from '../../types';

export interface DynamicProxyResponse {
  success: boolean;
  response?: string;
  error?: string;
  provider: string;
  model?: string;
  metrics?: {
    latency: number;
    tokens: number;
    cost: number;
  };
  metadata?: Record<string, any>;
}

export class DynamicProxyService {
  /**
   * Make a dynamic API call through the existing ai-proxy Edge Function
   * This works with the current deployed infrastructure
   */
  static async callProvider(
    providerId: string,
    prompt: string,
    options: {
      model?: string;
      parameters?: Record<string, any>;
      agentId?: string;
      userId?: string;
    } = {}
  ): Promise<DynamicProxyResponse> {
    const startTime = Date.now();
    
    try {
      // Get the current session for authentication with timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout after 5 seconds')), 5000)
      );
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
      } catch (timeoutError) {
        throw new Error('Authentication timeout: Unable to verify session. Please check your connection and try again.');
      }
      
      const { data: { session }, error: sessionError } = sessionResult;
      
      if (sessionError || !session) {
        console.error(`[Auth Error] ${sessionError?.message || 'No active session'}`);
        throw new Error('No active session. Please sign in to continue.');
      }

      // Check if Supabase is properly configured for proxy mode
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const shouldUseProxy = supabaseUrl && supabaseAnonKey && 
                            !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo');

      if (!shouldUseProxy) {
        throw new Error('Server connection not configured. Please configure your environment variables or use direct browser mode.');
      }

      // Get provider configuration
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider '${providerId}' not found in configuration`);
      }

      // Determine if this is a custom provider or a built-in provider
      const isCustomProvider = !['openai', 'gemini', 'claude', 'ibm'].includes(providerId);
      
      // Prepare the request body based on provider type
      let requestBody;
      let functionName;
      
      if (isCustomProvider) {
        // For custom providers, use the dynamic-ai-proxy endpoint
        functionName = 'dynamic-ai-proxy';
        
        // Get API keys from key vault
        const keyData = keyVault.retrieveDefault(providerId);
        if (!keyData) {
          throw new Error(`No API key found for ${provider.displayName}. Please add your API key in the API Keys section.`);
        }
        
        // Build the request body for dynamic-ai-proxy
        requestBody = {
          providerConfig: {
            id: provider.id,
            name: provider.displayName,
            apiConfig: provider.apiConfig
          },
          prompt,
          model: options.model || provider.apiConfig.defaultModel,
          parameters: options.parameters || provider.apiConfig.defaultParameters,
          agentId: options.agentId,
          userId: options.userId || session.user.id,
          apiKeys: keyData
        };
      } else {
        // For built-in providers, use the ai-proxy endpoint
        functionName = 'ai-proxy';
        
        // Build the standard proxy request (compatible with existing ai-proxy function)
        requestBody = {
          providerId: provider.id,
          prompt,
          model: options.model || provider.apiConfig.defaultModel,
          parameters: options.parameters || provider.apiConfig.defaultParameters,
          agentId: options.agentId,
          userId: options.userId || session.user.id,
          useUserKey: true // Use the user's own API key
        };
      }

      console.log(`Making ${isCustomProvider ? 'custom' : 'standard'} proxy request to ${provider.displayName} via ${functionName}:`, {
        providerId,
        model: requestBody.model,
        promptLength: prompt.length,
        userId: requestBody.userId
      });

      // Build the URL for the Edge Function
      const originalEndpoint = `${supabaseUrl}/functions/v1/${functionName}`;
      const proxyEndpoint = getProxyUrl(originalEndpoint);
      
      console.log(`Using proxy endpoint: ${proxyEndpoint}`);

      // Call the Edge Function with timeout
      const fetchPromise = fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const fetchTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Edge Function timeout after 30 seconds')), 30000)
      );

      let response;
      try {
        response = await Promise.race([fetchPromise, fetchTimeoutPromise]) as Response;
      } catch (fetchError) {
        throw new Error(`Request failed: ${fetchError.message}`);
      }

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Proxy request failed with status ${response.status}:`, errorText);
        
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          
          // If we got a proper error response from our proxy, use it
          if (errorData.error) {
            throw new Error(errorData.error);
          } else {
            throw new Error(`Service error (${response.status}). Please try again later.`);
          }
        } catch (parseError) {
          // If not JSON, use the raw text or status
          if (errorText && errorText.length > 0) {
            throw new Error(errorText);
          } else {
            throw new Error(`Service error (${response.status}). Please try again later.`);
          }
        }
      }

      // Safely parse JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const rawText = await response.text();
        console.error('Failed to parse JSON response:', rawText);
        throw new Error('We received an invalid response. Please try again.');
      }

      if (!data) {
        throw new Error('No response received. Please try again.');
      }

      if (!data.success) {
        console.error('Proxy service returned error:', data.error);
        throw new Error(data.error || 'Request failed. Please try again.');
      }

      // Extract metrics from response or estimate them
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil((data.response?.length || 0) / 4);
      
      const proxyResponse: DynamicProxyResponse = {
        success: true,
        response: data.response,
        provider: providerId,
        model: data.model || options.model,
        metrics: {
          latency,
          tokens: data.metrics?.tokens || (inputTokens + outputTokens),
          cost: data.metrics?.cost || this.estimateCost(providerId, inputTokens + outputTokens)
        },
        metadata: {
          requestId: data.requestId,
          timestamp: new Date().toISOString(),
          authenticated: true,
          isCustomProvider
        }
      };

      console.log(`Proxy request completed successfully:`, {
        providerId,
        latency,
        tokens: proxyResponse.metrics?.tokens,
        cost: proxyResponse.metrics?.cost,
        isCustomProvider
      });

      return proxyResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Proxy service error:', error);
      
      // Enhance error messages for common issues
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = `Network error: Please check your internet connection and try again.`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `Your request timed out. Please try again with a shorter prompt or try later.`;
      } else if (error.message.includes('not found') && error.message.includes('function')) {
        errorMessage = `Service not available. Please contact support.`;
      } else if (error.message.includes('requested path is invalid')) {
        errorMessage = `The requested service path is invalid. Please check your provider configuration or contact support.`;
      }
      
      // Return error response with metrics
      return {
        success: false,
        error: errorMessage,
        provider: providerId,
        model: options.model,
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
          errors: ['Session verification timed out. Please check your internet connection and try again.']
        };
      }
      
      const { data: { session }, error: sessionError } = sessionResult;
      
      if (sessionError) {
        console.error('Session error during health check:', sessionError);
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: [`Authentication error: Please sign in again.`]
        };
      }
      
      if (!session) {
        console.error('No active session during health check');
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: ['No active session. Please sign in to continue.']
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
          errors: ['Server connection not configured. Please use direct browser mode.']
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
            errors: ['Connection check failed. Please try again later.']
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('Health check returned error:', data.error);
          return {
            available: false,
            authenticated: true,
            configuredProviders: [],
            errors: [data.error || 'Connection check failed']
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
          errors: [testError instanceof Error ? testError.message : 'Connection check failed']
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
   * Get all available providers (those defined in the frontend configuration)
   */
  static getAvailableProviders(): Provider[] {
    return providers.filter(provider => provider.isAvailable);
  }

  /**
   * Estimate cost based on provider and tokens
   */
  private static estimateCost(providerId: string, tokens: number): number {
    const pricing: Record<string, number> = {
      openai: 0.06, // GPT-4 output pricing per 1K tokens
      gemini: 0.0015, // Gemini 2.0 Flash output pricing per 1K tokens
      claude: 0.075, // Claude 3 Sonnet output pricing per 1K tokens
      ibm: 0.04 // IBM Granite output pricing per 1K tokens
    };
    
    const pricePerToken = pricing[providerId] || 0.05; // Default fallback
    return (tokens * pricePerToken) / 1000;
  }
}