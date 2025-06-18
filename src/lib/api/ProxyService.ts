import { supabase } from '../supabase';
import { apiKeysDb } from '../api-keys/api-keys-db';
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
  private static readonly EDGE_FUNCTION_URL = '/functions/v1/ai-proxy';
  
  /**
   * Make an authenticated API call through the Supabase Edge Function
   */
  static async callProvider(request: ProxyRequest): Promise<ProxyResponse> {
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

      // Make the authenticated request to the Edge Function
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const latency = Date.now() - startTime;

      if (error) {
        console.error('Edge Function invocation error:', error);
        throw new Error(`Proxy service error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response data from proxy service');
      }

      if (!data.success) {
        console.error('Proxy service returned error:', data.error);
        
        // Enhanced error handling for specific cases
        if (data.error?.includes('not set in Supabase secrets')) {
          const providerName = this.getProviderDisplayName(request.providerId);
          throw new Error(
            `${providerName} API key is not configured on the server. ` +
            `The server administrator needs to configure the API key in Supabase Edge Function secrets. ` +
            `Alternatively, you can configure your own API key in the API Keys section.`
          );
        }
        
        throw new Error(data.error || 'Proxy service request failed');
      }

      // Estimate tokens and cost (basic estimation)
      const estimatedTokens = Math.ceil((request.prompt.length + (data.response?.length || 0)) / 4);
      const estimatedCost = this.estimateCost(request.providerId, estimatedTokens);

      const response: ProxyResponse = {
        success: true,
        response: data.response,
        provider: request.providerId,
        model: data.model || request.model,
        usingUserKey: data.using_user_key,
        metrics: {
          latency,
          tokens: estimatedTokens,
          cost: estimatedCost
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
        tokens: estimatedTokens,
        cost: estimatedCost,
        usingUserKey: data.using_user_key
      });

      return response;

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.error('Proxy service error:', error);
      
      // Return error response with metrics
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown proxy service error',
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

      // Test the proxy with a minimal request
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          providerId: 'health-check',
          prompt: 'test',
          userId: session.user.id
        }
      });

      if (error) {
        return {
          available: false,
          authenticated: true,
          configuredProviders: [],
          errors: [error.message]
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
   * Check if a user has API keys configured for providers
   */
  static async checkUserApiKeys(userId: string): Promise<{
    hasKeys: boolean;
    providers: Record<string, boolean>;
  }> {
    // For demo users, return mock data
    if (userId === 'demo-user-123') {
      return {
        hasKeys: false,
        providers: { openai: false, gemini: false, claude: false, ibm: false }
      };
    }
    
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('provider_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const providers: Record<string, boolean> = {
        openai: false,
        gemini: false,
        claude: false,
        ibm: false
      };
      
      (data || []).forEach(key => {
        if (key.provider_id in providers) {
          providers[key.provider_id] = true;
        }
      });
      
      const hasKeys = Object.values(providers).some(v => v);
      
      return { hasKeys, providers };
    } catch (error) {
      console.error('Failed to check user API keys:', error);
      return { 
        hasKeys: false, 
        providers: { openai: false, gemini: false, claude: false, ibm: false } 
      };
    }
  }

  /**
   * Get display name for a provider
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

  /**
   * Log proxy usage for analytics
   */
  static async logProxyUsage(request: ProxyRequest, response: ProxyResponse): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('Cannot log proxy usage: No active session');
        return;
      }

      // Log to analytics_events table
      await supabase.from('analytics_events').insert({
        id: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: session.user.id,
        event_type: 'proxy_call',
        provider_id: request.providerId,
        agent_id: request.agentId,
        prompt_length: request.prompt.length,
        response_length: response.response?.length || 0,
        success: response.success,
        error_type: response.success ? null : 'proxy_error',
        metrics: response.metrics || { latency: 0, tokens: 0, cost: 0 },
        metadata: {
          ...response.metadata,
          model: response.model,
          proxy_mode: true,
          using_user_key: response.usingUserKey
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to log proxy usage:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }
}