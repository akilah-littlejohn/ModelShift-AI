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
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No active session. Please sign in to continue.');
      }

      // Get provider configuration
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider '${providerId}' not found in configuration`);
      }

      // Check if we should use proxy mode or direct mode
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const shouldUseProxy = supabaseUrl && supabaseAnonKey && 
                            !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo');

      if (!shouldUseProxy) {
        throw new Error('Server connection not configured. Please configure your environment variables or use direct browser mode.');
      }

      // Prepare the standard proxy request (compatible with existing ai-proxy function)
      const requestBody = {
        providerId: provider.id,
        prompt,
        model: options.model || provider.apiConfig.defaultModel,
        parameters: options.parameters || provider.apiConfig.defaultParameters,
        agentId: options.agentId,
        userId: options.userId || session.user.id
      };

      console.log(`Making proxy request to ${provider.displayName} via ai-proxy:`, {
        providerId,
        model: requestBody.model,
        promptLength: prompt.length,
        userId: requestBody.userId
      });

      // Build the URL for the Edge Function
      // FIXED: Ensure we're using the correct path format for the Edge Function
      const originalEndpoint = `${supabaseUrl}/functions/v1/ai-proxy`;
      const proxyEndpoint = getProxyUrl(originalEndpoint);
      
      console.log(`Using proxy endpoint: ${proxyEndpoint}`);

      // Call the existing ai-proxy Edge Function with timeout
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
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('Proxy service returned error:', data.error);
        throw new Error(data.error || 'Request failed');
      }

      const proxyResponse: DynamicProxyResponse = {
        success: true,
        response: data.response,
        provider: providerId,
        model: data.model || options.model,
        metrics: {
          latency,
          tokens: data.metrics?.tokens || Math.ceil((prompt.length + (data.response?.length || 0)) / 4),
          cost: data.metrics?.cost || this.estimateCost(providerId, data.metrics?.tokens || 0)
        },
        metadata: {
          requestId: data.metadata?.requestId || data.requestId,
          timestamp: new Date().toISOString(),
          authenticated: true,
          proxy_mode: true,
          function_used: 'ai-proxy'
        }
      };

      console.log(`Proxy request completed successfully:`, {
        providerId,
        latency,
        tokens: proxyResponse.metrics?.tokens,
        cost: proxyResponse.metrics?.cost,
        functionUsed: 'ai-proxy'
      });

      return proxyResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Dynamic proxy service error:', error);
      
      // Return error response with metrics
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: providerId,
        model: options.model,
        metrics: {
          latency,
          tokens: 0,
          cost: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          authenticated: false,
          proxy_mode: true
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
        setTimeout(() => reject(new Error('Session timeout after 5 seconds')), 5000)
      );
      
      let sessionResult;
      try {
        sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
      } catch (timeoutError) {
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: ['Session verification timed out. Please try again.']
        };
      }
      
      const { data: { session } } = sessionResult;
      
      if (!session) {
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
        return {
          available: false,
          authenticated: true,
          configuredProviders: [],
          errors: ['Server connection not configured. Please use direct browser mode.']
        };
      }

      // Test the ai-proxy function with a health check
      try {
        // Build the URL for the Edge Function
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

        // Parse the health check response
        const configuredProviders = data?.configuredProviders || [];
        const errors = data?.errors || [];

        return {
          available: true,
          authenticated: true,
          configuredProviders,
          errors
        };

      } catch (testError) {
        return {
          available: false,
          authenticated: true,
          configuredProviders: [],
          errors: [testError instanceof Error ? testError.message : 'Connection check failed']
        };
      }

    } catch (error) {
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
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return 0;
    
    const outputPricing = provider.capabilities.pricing.output;
    return (tokens * outputPricing) / 1000;
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