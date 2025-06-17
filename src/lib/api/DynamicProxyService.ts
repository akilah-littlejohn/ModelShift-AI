import { supabase } from '../supabase';
import { providers } from '../../data/providers';
import { keyVault } from '../encryption';
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
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No active session. Please sign in to use the AI proxy.');
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
        throw new Error('Supabase proxy not configured. Please configure your environment variables or use local API keys.');
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

      // Call the existing ai-proxy Edge Function
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const latency = Date.now() - startTime;

      if (error) {
        console.error('ai-proxy Edge Function invocation error:', error);
        
        // Enhanced error extraction with better context handling
        let specificError = 'Dynamic proxy service error';
        
        // First, try to extract error from the context (response body)
        if (error.context) {
          try {
            let contextError = null;
            
            if (typeof error.context === 'string') {
              try {
                // Try to parse as JSON first
                const contextData = JSON.parse(error.context);
                contextError = contextData.error || contextData.message || contextData.details;
              } catch {
                // If not JSON, use the string directly
                contextError = error.context;
              }
            } else if (typeof error.context === 'object') {
              contextError = error.context.error || error.context.message || error.context.details;
            }
            
            if (contextError && typeof contextError === 'string' && contextError.trim()) {
              specificError = contextError;
            }
          } catch (parseError) {
            console.warn('Could not parse error context:', parseError);
          }
        }
        
        // If we still have a generic error, try to extract from the main error message
        if (specificError === 'Dynamic proxy service error' && error.message) {
          if (error.message.includes('Function not found')) {
            specificError = 'ai-proxy Edge Function not found. Please ensure the ai-proxy function is deployed to Supabase.';
          } else if (error.message.includes('Invalid API key') || error.message.includes('401')) {
            specificError = `Invalid API key for ${provider.displayName}. Please check your server API key configuration in Supabase secrets.`;
          } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
            specificError = `Rate limit exceeded for ${provider.displayName}. Please try again later.`;
          } else if (error.message.includes('not set in Supabase secrets')) {
            specificError = `${provider.displayName} API key not configured on server. Please configure the required API key in Supabase Edge Function secrets.`;
          } else if (error.message.includes('OPENAI_API_KEY not set')) {
            specificError = 'OpenAI API key not configured on server. Please set OPENAI_API_KEY in Supabase Edge Function secrets.';
          } else if (error.message.includes('GEMINI_API_KEY not set')) {
            specificError = 'Google Gemini API key not configured on server. Please set GEMINI_API_KEY in Supabase Edge Function secrets.';
          } else if (error.message.includes('ANTHROPIC_API_KEY not set')) {
            specificError = 'Anthropic Claude API key not configured on server. Please set ANTHROPIC_API_KEY in Supabase Edge Function secrets.';
          } else if (error.message.includes('IBM_API_KEY not set')) {
            specificError = 'IBM WatsonX API key not configured on server. Please set IBM_API_KEY and IBM_PROJECT_ID in Supabase Edge Function secrets.';
          } else if (error.message !== 'Edge Function returned a non-2xx status code') {
            specificError = error.message;
          }
        }

        // If we still have a generic error, provide a helpful fallback
        if (specificError === 'Dynamic proxy service error') {
          specificError = `${provider.displayName} request failed. This could be due to missing API keys on the server, network issues, or service unavailability. Please check the server configuration and try again.`;
        }
        
        throw new Error(specificError);
      }

      if (!data) {
        throw new Error('No response data from proxy service');
      }

      if (!data.success) {
        console.error('Proxy service returned error:', data.error);
        
        // Enhanced error handling for specific server-side errors
        let errorMessage = data.error || 'Proxy service request failed';
        
        if (errorMessage.includes('not set in Supabase secrets')) {
          const providerName = provider.displayName;
          if (errorMessage.includes('OPENAI_API_KEY')) {
            errorMessage = `OpenAI API key not configured on server. Please set OPENAI_API_KEY in Supabase Edge Function secrets.`;
          } else if (errorMessage.includes('GEMINI_API_KEY')) {
            errorMessage = `Google Gemini API key not configured on server. Please set GEMINI_API_KEY in Supabase Edge Function secrets.`;
          } else if (errorMessage.includes('ANTHROPIC_API_KEY')) {
            errorMessage = `Anthropic Claude API key not configured on server. Please set ANTHROPIC_API_KEY in Supabase Edge Function secrets.`;
          } else if (errorMessage.includes('IBM_API_KEY')) {
            errorMessage = `IBM WatsonX API keys not configured on server. Please set IBM_API_KEY and IBM_PROJECT_ID in Supabase Edge Function secrets.`;
          } else {
            errorMessage = `${providerName} API key not configured on server. Please configure the required API keys in Supabase Edge Function secrets.`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const response: DynamicProxyResponse = {
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
        tokens: response.metrics?.tokens,
        cost: response.metrics?.cost,
        functionUsed: 'ai-proxy'
      });

      return response;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Dynamic proxy service error:', error);
      
      // Return error response with metrics
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown dynamic proxy service error',
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
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          available: false,
          authenticated: false,
          configuredProviders: [],
          errors: ['No active session']
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
          errors: ['Supabase not configured for proxy mode']
        };
      }

      // Test the ai-proxy function with a health check
      try {
        const { data, error } = await supabase.functions.invoke('ai-proxy', {
          body: {
            providerId: 'health-check',
            prompt: 'test',
            userId: session.user.id
          }
        });

        if (error) {
          // Extract detailed error information
          let errorMessage = 'ai-proxy function error';
          
          if (error.context) {
            try {
              let contextError = null;
              
              if (typeof error.context === 'string') {
                try {
                  const contextData = JSON.parse(error.context);
                  contextError = contextData.error || contextData.message || contextData.details;
                } catch {
                  contextError = error.context;
                }
              } else if (typeof error.context === 'object') {
                contextError = error.context.error || error.context.message || error.context.details;
              }
              
              if (contextError && typeof contextError === 'string' && contextError.trim()) {
                errorMessage = contextError;
              }
            } catch (parseError) {
              console.warn('Could not parse health check error context:', parseError);
            }
          }
          
          if (errorMessage === 'ai-proxy function error' && error.message) {
            errorMessage = error.message;
          }

          return {
            available: false,
            authenticated: true,
            configuredProviders: [],
            errors: [errorMessage]
          };
        }

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
          errors: [testError instanceof Error ? testError.message : 'Health check failed']
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