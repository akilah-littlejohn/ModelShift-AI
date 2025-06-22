import { supabase } from '../supabase';
import { apiKeysDb } from '../api-keys/api-keys-db';
import { serverEncryption } from '../api-keys/encryption';
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
      // Check if we should use direct browser mode
      const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
      if (connectionMode === 'browser') {
        console.log('Using direct browser mode for API call');
        return this.callProviderDirectly(request);
      }
      
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

      // Get the correct URL for the Edge Function
      const proxyUrl = import.meta.env.VITE_SUPABASE_URL 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
        : '/api/ai-proxy'; // Fallback for local development

      // Make the authenticated request to the Edge Function
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

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
          throw new Error(errorJson.error || `Proxy service error: ${response.status}`);
        } catch (parseError) {
          // If not JSON, use the raw text or status
          throw new Error(errorText || `Proxy service error: ${response.status}`);
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

      // Estimate tokens and cost (basic estimation)
      const estimatedTokens = Math.ceil((request.prompt.length + (data.response?.length || 0)) / 4);
      const estimatedCost = this.estimateCost(request.providerId, estimatedTokens);

      const proxyResponse: ProxyResponse = {
        success: true,
        response: data.response,
        provider: request.providerId,
        model: data.model || request.model,
        usingUserKey: data.using_user_key,
        metrics: {
          latency,
          tokens: data.metrics?.tokens || estimatedTokens,
          cost: data.metrics?.cost || estimatedCost
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

      return proxyResponse;

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
        throw new Error(`No API key found for ${provider.displayName}. Please add your API key in the API Keys section.`);
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
          
          // Set model if provided
          if (request.model && provider.apiConfig.modelJsonPath) {
            const modelParts = provider.apiConfig.modelJsonPath.split('.');
            let modelCurrent = body;
            
            for (let i = 0; i < modelParts.length - 1; i++) {
              const part = modelParts[i];
              if (!modelCurrent[part]) modelCurrent[part] = {};
              modelCurrent = modelCurrent[part];
            }
            
            modelCurrent[modelParts[modelParts.length - 1]] = request.model;
          }
          
          // Merge parameters if provided
          if (request.parameters) {
            if (provider.apiConfig.parametersJsonPath) {
              const paramParts = provider.apiConfig.parametersJsonPath.split('.');
              let paramCurrent = body;
              
              for (let i = 0; i < paramParts.length - 1; i++) {
                const part = paramParts[i];
                if (!paramCurrent[part]) paramCurrent[part] = {};
                paramCurrent = paramCurrent[part];
              }
              
              paramCurrent[paramParts[paramParts.length - 1]] = {
                ...paramCurrent[paramParts[paramParts.length - 1]],
                ...request.parameters
              };
            } else {
              // If no specific path, merge at root level
              body = { ...body, ...request.parameters };
            }
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
      const estimatedTokens = Math.ceil((request.prompt.length + response.length) / 4);
      const estimatedCost = this.estimateCost(request.providerId, estimatedTokens);
      
      return {
        success: true,
        response,
        provider: request.providerId,
        model: request.model || provider.apiConfig.defaultModel,
        usingUserKey: true,
        metrics: {
          latency,
          tokens: estimatedTokens,
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
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in direct browser request',
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
          errors: ['Session timeout - unable to verify authentication']
        };
      }
      
      const { data: { session } } = sessionResult;
      
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
        const functionPromise = supabase.functions.invoke('ai-proxy', {
          body: {
            providerId: 'health-check',
            prompt: 'test',
            userId: session.user.id
          }
        });
        
        const functionTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout after 10 seconds')), 10000)
        );

        const { data, error } = await Promise.race([
          functionPromise,
          functionTimeoutPromise
        ]) as any;

        if (error) {
          // Extract detailed error information
          let errorMessage = 'ai-proxy function error';
          
          // First check if we have data with error info
          if (data && data.error) {
            errorMessage = data.error;
          }
          // Then check error context
          else if (error.context) {
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