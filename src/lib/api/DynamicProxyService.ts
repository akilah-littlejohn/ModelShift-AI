import { supabase } from '../supabase';
import { providers } from '../../data/providers';
import { keyVault } from '../encryption';
import type { Provider } from '../../types';

export interface DynamicProxyRequest {
  providerConfig: {
    id: string;
    name: string;
    apiConfig: any; // The full API configuration from the provider
  };
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
  agentId?: string;
  userId?: string;
  apiKeys: Record<string, string>;
}

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
  private static readonly EDGE_FUNCTION_URL = '/functions/v1/dynamic-ai-proxy';
  
  /**
   * Make a dynamic API call through the enhanced Edge Function
   * This supports ANY provider configuration without hardcoding
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

      // Get API keys for the provider
      const keyData = keyVault.retrieveDefault(providerId);
      if (!keyData || Object.keys(keyData).length === 0) {
        throw new Error(`No API keys found for provider '${providerId}'. Please configure API keys in the API Keys section.`);
      }

      // Validate required keys
      const missingKeys = provider.keyRequirements
        .filter(req => req.required && (!keyData[req.name] || !keyData[req.name].trim()))
        .map(req => req.label);
      
      if (missingKeys.length > 0) {
        throw new Error(`Missing required API keys for ${provider.displayName}: ${missingKeys.join(', ')}`);
      }

      // Prepare the dynamic request
      const requestBody: DynamicProxyRequest = {
        providerConfig: {
          id: provider.id,
          name: provider.displayName,
          apiConfig: provider.apiConfig
        },
        prompt,
        model: options.model,
        parameters: options.parameters,
        agentId: options.agentId,
        userId: options.userId || session.user.id,
        apiKeys: keyData
      };

      console.log(`Making dynamic proxy request to ${provider.displayName}:`, {
        providerId,
        model: options.model,
        promptLength: prompt.length,
        userId: requestBody.userId,
        hasApiKeys: Object.keys(keyData).length > 0
      });

      // Make the authenticated request to the dynamic Edge Function
      const { data, error } = await supabase.functions.invoke('dynamic-ai-proxy', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const latency = Date.now() - startTime;

      if (error) {
        console.error('Dynamic Edge Function invocation error:', error);
        throw new Error(`Dynamic proxy service error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response data from dynamic proxy service');
      }

      if (!data.success) {
        console.error('Dynamic proxy service returned error:', data.error);
        throw new Error(data.error || 'Dynamic proxy service request failed');
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
          requestId: data.metadata?.requestId,
          timestamp: new Date().toISOString(),
          authenticated: true,
          dynamic_provider: true
        }
      };

      console.log(`Dynamic proxy request completed successfully:`, {
        providerId,
        latency,
        tokens: response.metrics?.tokens,
        cost: response.metrics?.cost
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
          dynamic_provider: true
        }
      };
    }
  }

  /**
   * Add a new provider configuration dynamically
   * This allows users to add ANY provider without backend changes
   */
  static async addCustomProvider(
    providerConfig: Provider,
    apiKeys: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the provider configuration
      const validation = this.validateProviderConfig(providerConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid provider configuration: ${validation.errors.join(', ')}`);
      }

      // Test the provider with a simple request
      const testResponse = await this.callProvider(
        providerConfig.id,
        'Hello, this is a test. Please respond with "OK".',
        { model: providerConfig.apiConfig.defaultModel }
      );

      if (!testResponse.success) {
        throw new Error(`Provider test failed: ${testResponse.error}`);
      }

      // Store the provider configuration (you could save this to a database)
      // For now, we'll just add it to the runtime providers list
      const existingProviderIndex = providers.findIndex(p => p.id === providerConfig.id);
      if (existingProviderIndex >= 0) {
        providers[existingProviderIndex] = providerConfig;
      } else {
        providers.push(providerConfig);
      }

      // Store the API keys
      keyVault.store(providerConfig.id, apiKeys);

      return { success: true };

    } catch (error) {
      console.error('Error adding custom provider:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error adding provider'
      };
    }
  }

  /**
   * Validate a provider configuration
   */
  static validateProviderConfig(config: Provider): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.id) errors.push('Provider ID is required');
    if (!config.name) errors.push('Provider name is required');
    if (!config.displayName) errors.push('Provider display name is required');
    if (!config.apiConfig) errors.push('API configuration is required');

    // API config validation
    if (config.apiConfig) {
      if (!config.apiConfig.baseUrl) errors.push('Base URL is required');
      if (!config.apiConfig.endpointPath) errors.push('Endpoint path is required');
      if (!config.apiConfig.method) errors.push('HTTP method is required');
      if (!config.apiConfig.requestBodyStructure) errors.push('Request body structure is required');
      if (!config.apiConfig.promptJsonPath) errors.push('Prompt JSON path is required');
      if (!config.apiConfig.responseJsonPath) errors.push('Response JSON path is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if the dynamic proxy service is available
   */
  static async checkProxyHealth(): Promise<{
    available: boolean;
    authenticated: boolean;
    supportedProviders: string[];
    errors: string[];
  }> {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          available: false,
          authenticated: false,
          supportedProviders: [],
          errors: ['No active session']
        };
      }

      // Test with a known provider
      const testProvider = providers[0]; // Use first available provider
      if (!testProvider) {
        return {
          available: false,
          authenticated: true,
          supportedProviders: [],
          errors: ['No providers configured']
        };
      }

      // Make a test call
      const testResponse = await this.callProvider(
        testProvider.id,
        'test',
        { model: testProvider.apiConfig.defaultModel }
      );

      const supportedProviders = providers
        .filter(p => {
          const keyData = keyVault.retrieveDefault(p.id);
          return keyData && Object.keys(keyData).length > 0;
        })
        .map(p => p.id);

      return {
        available: true,
        authenticated: true,
        supportedProviders,
        errors: testResponse.success ? [] : [testResponse.error || 'Test request failed']
      };

    } catch (error) {
      return {
        available: false,
        authenticated: false,
        supportedProviders: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get all configured providers
   */
  static getConfiguredProviders(): Provider[] {
    return providers.filter(provider => {
      const keyData = keyVault.retrieveDefault(provider.id);
      return keyData && Object.keys(keyData).length > 0;
    });
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
}