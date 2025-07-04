// ModelShift AI Provider SDK Integration
import { setValueAtPath, getValueAtPath, mergeAtPath } from './jsonPathUtils';
import { ProxyService } from './api/ProxyService';
import { DynamicProxyService } from './api/DynamicProxyService';
import { apiKeysDb } from './api-keys/api-keys-db';
import { serverEncryption } from './api-keys/encryption';
import { isDevelopment, getProxyUrl } from './devProxy';
import { sanitizeHeaders } from './headerSanitizer';
import type { ApiConfiguration } from '../types';

export interface ModelShiftAIClient {
  generate(prompt: string): Promise<string>;
}

export interface ProviderConfig {
  endpoint: string;
  buildRequestBody: (prompt: string, keyData: Record<string, string>) => object;
  parseResponse: (response: any) => string;
  buildHeaders?: (keyData: Record<string, string>) => Record<string, string>;
  buildEndpoint?: (keyData: Record<string, string>) => string;
  defaultModel?: string;
  defaultParameters?: Record<string, any>;
}

// Helper function to check if Supabase proxy is properly configured
async function isSupabaseProxyConfigured(): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('demo') || supabaseAnonKey.includes('demo')) {
    return false;
  }

  try {
    // Use the DynamicProxyService to check health
    const health = await DynamicProxyService.checkProxyHealth();
    return health.available && health.authenticated;
  } catch (error) {
    console.warn('Supabase dynamic proxy health check failed:', error);
    return false;
  }
}

// Enhanced Dynamic Proxy Client that uses the new DynamicProxyService
export class DynamicProxyClient implements ModelShiftAIClient {
  constructor(
    private readonly providerId: string,
    private readonly userId: string,
    private readonly customModel?: string,
    private readonly customParameters?: Record<string, any>,
    private readonly agentId?: string,
    private readonly useUserKey: boolean = true
  ) {}

  async generate(prompt: string): Promise<string> {
    try {
      // Check if we should use direct browser mode
      const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
      if (connectionMode === 'browser') {
        console.log('DynamicProxyClient: Using direct browser mode');
        return this.generateDirectly(prompt);
      }
      
      console.log(`DynamicProxyClient: Making authenticated request to ${this.providerId}`);

      const response = await DynamicProxyService.callProvider(
        this.providerId,
        prompt,
        {
          model: this.customModel,
          parameters: this.customParameters,
          agentId: this.agentId,
          userId: this.userId,
          useUserKey: this.useUserKey
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Dynamic proxy request failed');
      }

      return response.response || 'No response';

    } catch (error) {
      console.error('Error during DynamicProxyClient.generate():', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          'Network request failed. Please check your internet connection and Supabase configuration.'
        );
      }
      
      throw error;
    }
  }
  
  private async generateDirectly(prompt: string): Promise<string> {
    // Import necessary modules
    const { keyVault } = await import('./encryption');
    const { providers } = await import('../data/providers');
    
    // Get provider configuration
    const provider = providers.find(p => p.id === this.providerId);
    if (!provider) {
      throw new Error(`Provider '${this.providerId}' not found in configuration`);
    }
    
    // Get API keys from key vault
    const keyData = keyVault.retrieveDefault(this.providerId);
    if (!keyData) {
      throw new Error(`No API key found for ${provider.displayName}. Please add your API key in the API Keys section.`);
    }
    
    // Create a client and make the request
    const client = new ConfigurableClient(keyData, {
      endpoint: provider.apiConfig.baseUrl + provider.apiConfig.endpointPath,
      buildRequestBody: (prompt: string) => {
        let body = JSON.parse(JSON.stringify(provider.apiConfig.requestBodyStructure));
        
        // Set the prompt using the promptJsonPath
        body = setValueAtPath(body, provider.apiConfig.promptJsonPath, prompt);
        
        // Set model if provided
        if (this.customModel && provider.apiConfig.modelJsonPath) {
          body = setValueAtPath(body, provider.apiConfig.modelJsonPath, this.customModel);
        }
        
        // Set parameters if provided
        if (this.customParameters) {
          if (provider.apiConfig.parametersJsonPath) {
            body = mergeAtPath(body, provider.apiConfig.parametersJsonPath, this.customParameters);
          } else {
            // If no specific path, merge at root level
            body = { ...body, ...this.customParameters };
          }
        }
        
        return body;
      },
      parseResponse: (response: any) => {
        return getValueAtPath(response, provider.apiConfig.responseJsonPath) || '';
      },
      buildHeaders: (keyData: Record<string, string>) => {
        const headers = { ...provider.apiConfig.headers };
        
        if (provider.apiConfig.authHeaderName) {
          headers[provider.apiConfig.authHeaderName] = `${provider.apiConfig.authHeaderPrefix || ''}${keyData.apiKey}`;
        }
        
        // Sanitize headers to ensure they only contain valid characters
        return sanitizeHeaders(headers);
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
    
    return await client.generate(prompt);
  }

  private getProviderDisplayName(): string {
    const providerNames: Record<string, string> = {
      'openai': 'OpenAI',
      'gemini': 'Google Gemini',
      'claude': 'Anthropic Claude',
      'ibm': 'IBM WatsonX'
    };
    return providerNames[this.providerId] || this.providerId;
  }
}

// Legacy Proxy Client (for backward compatibility)
export class ProxyClient implements ModelShiftAIClient {
  constructor(
    private readonly providerId: string,
    private readonly userId: string,
    private readonly customModel?: string,
    private readonly customParameters?: Record<string, any>,
    private readonly agentId?: string,
    private readonly useUserKey: boolean = true
  ) {}

  async generate(prompt: string): Promise<string> {
    try {
      // Check if we should use direct browser mode
      const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
      if (connectionMode === 'browser') {
        console.log('ProxyClient: Using direct browser mode');
        return this.generateDirectly(prompt);
      }
      
      console.log(`ProxyClient: Making authenticated request to ${this.providerId}`);

      const response = await ProxyService.callProvider({
        providerId: this.providerId,
        prompt,
        model: this.customModel,
        parameters: this.customParameters,
        agentId: this.agentId,
        userId: this.userId,
        useUserKey: this.useUserKey
      });

      if (!response.success) {
        throw new Error(response.error || 'Proxy request failed');
      }

      return response.response || 'No response';

    } catch (error) {
      console.error('Error during ProxyClient.generate():', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          'Network request failed. Please check your internet connection and Supabase configuration.'
        );
      }
      
      throw error;
    }
  }
  
  private async generateDirectly(prompt: string): Promise<string> {
    // Import necessary modules
    const { keyVault } = await import('./encryption');
    const { providers } = await import('../data/providers');
    
    // Get provider configuration
    const provider = providers.find(p => p.id === this.providerId);
    if (!provider) {
      throw new Error(`Provider '${this.providerId}' not found in configuration`);
    }
    
    // Get API keys from key vault
    const keyData = keyVault.retrieveDefault(this.providerId);
    if (!keyData) {
      throw new Error(`No API key found for ${provider.displayName}. Please add your API key in the API Keys section.`);
    }
    
    // Create a client and make the request
    const client = new ConfigurableClient(keyData, {
      endpoint: provider.apiConfig.baseUrl + provider.apiConfig.endpointPath,
      buildRequestBody: (prompt: string) => {
        let body = JSON.parse(JSON.stringify(provider.apiConfig.requestBodyStructure));
        
        // Set the prompt using the promptJsonPath
        body = setValueAtPath(body, provider.apiConfig.promptJsonPath, prompt);
        
        // Set model if provided
        if (this.customModel && provider.apiConfig.modelJsonPath) {
          body = setValueAtPath(body, provider.apiConfig.modelJsonPath, this.customModel);
        }
        
        // Set parameters if provided
        if (this.customParameters) {
          if (provider.apiConfig.parametersJsonPath) {
            body = mergeAtPath(body, provider.apiConfig.parametersJsonPath, this.customParameters);
          } else {
            // If no specific path, merge at root level
            body = { ...body, ...this.customParameters };
          }
        }
        
        return body;
      },
      parseResponse: (response: any) => {
        return getValueAtPath(response, provider.apiConfig.responseJsonPath) || '';
      },
      buildHeaders: (keyData: Record<string, string>) => {
        const headers = { ...provider.apiConfig.headers };
        
        if (provider.apiConfig.authHeaderName) {
          headers[provider.apiConfig.authHeaderName] = `${provider.apiConfig.authHeaderPrefix || ''}${keyData.apiKey}`;
        }
        
        // Sanitize headers to ensure they only contain valid characters
        return sanitizeHeaders(headers);
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
    
    return await client.generate(prompt);
  }
}

// Enhanced ConfigurableClient with better CORS handling
export class ConfigurableClient implements ModelShiftAIClient {
  constructor(private readonly keyData: Record<string, string>, private readonly config: ProviderConfig) {}

  async generate(prompt: string): Promise<string> {
    console.log('Using ConfigurableClient for direct API calls');
    
    try {
      const originalEndpoint = this.getEndpoint();
      const endpoint = getProxyUrl(originalEndpoint);
      const headers = this.buildHeaders();
      const body = this.config.buildRequestBody(prompt, this.keyData);

      console.log(`Making request to: ${endpoint}`);
      console.log('Request headers:', headers);

      // Enhanced error handling for WebContainer/CORS issues
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit' // Don't send credentials for external APIs
      });

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
        
        // Enhanced error messages for common issues
        if (response.status === 401) {
          if (errorDetails?.error?.message) {
            throw new Error(`Authentication failed: ${errorDetails.error.message}`);
          } else {
            throw new Error(`Authentication failed: Invalid API key or credentials (HTTP ${response.status})`);
          }
        } else if (response.status === 403) {
          throw new Error(`Access forbidden: Check your API key permissions (HTTP ${response.status})`);
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded: Too many requests (HTTP ${response.status})`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: The API service is temporarily unavailable (HTTP ${response.status})`);
        } else {
          const errorMessage = errorDetails?.error?.message || errorDetails?.message || errorText || 'Unknown error';
          throw new Error(`API request failed: ${errorMessage} (HTTP ${response.status})`);
        }
      }

      const json = await response.json();
      const output = this.config.parseResponse(json);
      return output || 'No response';
    } catch (error) {
      console.error('Error during generate():', error);
      
      // Enhanced error handling for different types of network issues
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch') {
          if (isDevelopment()) {
            throw new Error(
              'Network request failed. This is likely due to CORS restrictions. ' +
              'The development proxy should handle this automatically. ' +
              'Please ensure the Vite development server is running correctly. ' +
              'If the issue persists, try restarting the development server.'
            );
          } else {
            throw new Error(
              'Network request failed. This may be due to CORS restrictions or network connectivity issues. ' +
              'In a production environment, you would need to either:\n' +
              '1. Use a backend proxy to make API calls\n' +
              '2. Configure CORS headers on your server\n' +
              '3. Use the provider\'s official SDK with proper authentication'
            );
          }
        }
        if (error.message.includes('NetworkError')) {
          throw new Error(
            'Network error occurred. Please check your internet connection and try again.'
          );
        }
        if (error.message.includes('Failed to execute \'fetch\'') && error.message.includes('headers')) {
          throw new Error(
            'Invalid header value detected. Please ensure your API keys and headers contain only valid ASCII characters. ' +
            'If you\'re using a copied API key, try manually typing it to avoid invisible Unicode characters.'
          );
        }
      }
      
      // Re-throw other errors as-is (including our enhanced API errors)
      throw error;
    }
  }

  private getEndpoint(): string {
    if (this.config.buildEndpoint) {
      return this.config.buildEndpoint(this.keyData);
    }
    return this.config.endpoint;
  }

  private buildHeaders(): Record<string, string> {
    let headers: Record<string, string>;
    
    if (this.config.buildHeaders) {
      headers = this.config.buildHeaders(this.keyData);
    } else {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.keyData.apiKey}`
      };
    }
    
    // Sanitize headers to ensure they only contain valid characters
    return sanitizeHeaders(headers);
  }
}

// Data-Driven Configurable Client with enhanced CORS handling
export class DataDrivenClient implements ModelShiftAIClient {
  constructor(
    private readonly keyData: Record<string, string>, 
    private readonly apiConfig: ApiConfiguration,
    private readonly customModel?: string,
    private readonly customParameters?: Record<string, any>
  ) {}

  async generate(prompt: string): Promise<string> {
    console.log('Using DataDrivenClient for direct API calls');
    
    try {
      const originalEndpoint = this.buildEndpoint();
      const endpoint = getProxyUrl(originalEndpoint);
      const headers = this.buildHeaders();
      const body = this.buildRequestBody(prompt);

      console.log(`Making request to: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: this.apiConfig.method,
        headers: headers,
        body: JSON.stringify(body),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        let errorText = '';
        let errorDetails = null;
        
        try {
          errorText = await response.text();
          if (errorText.trim().startsWith('{')) {
            errorDetails = JSON.parse(errorText);
          }
        } catch (parseError) {
          errorText = errorText || `HTTP ${response.status}`;
        }

        console.error(`API request failed: ${response.status} ${errorText}`);
        
        // Try to parse error from response if errorJsonPath is provided
        if (this.apiConfig.errorJsonPath && errorDetails) {
          try {
            const errorMessage = getValueAtPath(errorDetails, this.apiConfig.errorJsonPath);
            if (errorMessage) {
              throw new Error(`API Error: ${errorMessage}`);
            }
          } catch (parseError) {
            // Fall back to generic error if parsing fails
          }
        }
        
        // Enhanced error messages
        if (response.status === 401) {
          throw new Error(`Authentication failed: Invalid API key or credentials (HTTP ${response.status})`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden: Check your API key permissions (HTTP ${response.status})`);
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded: Too many requests (HTTP ${response.status})`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: The API service is temporarily unavailable (HTTP ${response.status})`);
        } else {
          const errorMessage = errorDetails?.error?.message || errorDetails?.message || errorText || 'Unknown error';
          throw new Error(`API request failed: ${errorMessage} (HTTP ${response.status})`);
        }
      }

      const json = await response.json();
      const output = getValueAtPath(json, this.apiConfig.responseJsonPath);
      return output || 'No response';
    } catch (error) {
      console.error('Error during generate():', error);
      
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch') {
          if (isDevelopment()) {
            throw new Error(
              'Network request failed. This is likely due to CORS restrictions. ' +
              'The development proxy should handle this automatically. ' +
              'Please ensure the Vite development server is running correctly.'
            );
          } else {
            throw new Error(
              'Network request failed. This may be due to CORS restrictions in the development environment. ' +
              'In a production environment, you would need to either:\n' +
              '1. Use a backend proxy to make API calls\n' +
              '2. Configure CORS headers on your server\n' +
              '3. Use the provider\'s official SDK with proper authentication'
            );
          }
        }
        if (error.message.includes('Failed to execute \'fetch\'') && error.message.includes('headers')) {
          throw new Error(
            'Invalid header value detected. Please ensure your API keys and headers contain only valid ASCII characters. ' +
            'If you\'re using a copied API key, try manually typing it to avoid invisible Unicode characters.'
          );
        }
      }
      
      throw error;
    }
  }

  private buildEndpoint(): string {
    let endpoint = `${this.apiConfig.baseUrl}${this.apiConfig.endpointPath}`;
    
    // Handle API key in URL parameter (e.g., Gemini)
    if (this.apiConfig.apiKeyInUrlParam && this.apiConfig.urlParamName) {
      const separator = endpoint.includes('?') ? '&' : '?';
      endpoint += `${separator}${this.apiConfig.urlParamName}=${this.keyData.apiKey}`;
    }
    
    return endpoint;
  }

  private buildHeaders(): Record<string, string> {
    const headers = { ...this.apiConfig.headers };
    
    // Add authentication header if not using URL parameter
    if (!this.apiConfig.apiKeyInUrlParam && this.apiConfig.authHeaderName) {
      const authValue = `${this.apiConfig.authHeaderPrefix || ''}${this.keyData.apiKey}`;
      headers[this.apiConfig.authHeaderName] = authValue;
    }
    
    // Sanitize headers to ensure they only contain valid characters
    return sanitizeHeaders(headers);
  }

  private buildRequestBody(prompt: string): any {
    let body = JSON.parse(JSON.stringify(this.apiConfig.requestBodyStructure));
    
    // Set the prompt
    body = setValueAtPath(body, this.apiConfig.promptJsonPath, prompt);
    
    // Set custom model if provided
    if (this.customModel && this.apiConfig.modelJsonPath) {
      body = setValueAtPath(body, this.apiConfig.modelJsonPath, this.customModel);
    }
    
    // Set project ID if required (IBM specific)
    if (this.apiConfig.projectIdJsonPath && this.keyData.projectId) {
      body = setValueAtPath(body, this.apiConfig.projectIdJsonPath, this.keyData.projectId);
    }
    
    // Merge custom parameters
    const parameters = { ...this.apiConfig.defaultParameters, ...this.customParameters };
    if (this.apiConfig.parametersJsonPath) {
      body = mergeAtPath(body, this.apiConfig.parametersJsonPath, parameters);
    } else {
      // If no specific path, merge at root level
      body = { ...body, ...parameters };
    }
    
    return body;
  }
}

// Provider Configurations (Legacy - for backward compatibility)
export const openAIConfig: ProviderConfig = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  buildRequestBody: (prompt: string) => ({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  }),
  parseResponse: (response: any) => response?.choices?.[0]?.message?.content ?? '',
  buildHeaders: (keyData: Record<string, string>) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${keyData.apiKey}`
  }),
  defaultModel: 'gpt-4',
  defaultParameters: {
    temperature: 0.7,
    max_tokens: 1000
  }
};

export const googleGeminiConfig: ProviderConfig = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  buildRequestBody: (prompt: string) => ({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, topP: 1, maxOutputTokens: 1000 }
  }),
  parseResponse: (response: any) => response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
  buildEndpoint: (keyData: Record<string, string>) => 
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyData.apiKey}`,
  buildHeaders: () => ({
    'Content-Type': 'application/json'
  }),
  defaultModel: 'gemini-2.0-flash',
  defaultParameters: {
    temperature: 0.5,
    topP: 1,
    maxOutputTokens: 1000
  }
};

export const anthropicClaudeConfig: ProviderConfig = {
  endpoint: 'https://api.anthropic.com/v1/messages',
  buildRequestBody: (prompt: string) => ({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  }),
  parseResponse: (response: any) => response?.content?.[0]?.text ?? '',
  buildHeaders: (keyData: Record<string, string>) => {
    // Ensure we're using ASCII-safe header values
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': keyData.apiKey,
      'anthropic-version': '2023-06-01'
    };
    
    // Remove the dangerous header that was causing issues
    // This header is not needed and was causing problems
    // 'anthropic-dangerous-direct-browser-access': 'true'
    
    return headers;
  },
  defaultModel: 'claude-3-sonnet-20240229',
  defaultParameters: {
    max_tokens: 1000,
    temperature: 0.7
  }
};

export const ibmWatsonXConfig: ProviderConfig = {
  endpoint: 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
  buildRequestBody: (prompt: string, keyData: Record<string, string>) => ({
    input: prompt,
    model_id: 'ibm/granite-13b-chat-v2',
    project_id: keyData.projectId,
    parameters: { temperature: 0.7, max_new_tokens: 500 }
  }),
  parseResponse: (response: any) => response?.results?.[0]?.generated_text ?? '',
  buildHeaders: (keyData: Record<string, string>) => ({
    'Authorization': `Bearer ${keyData.apiKey}`,
    'Content-Type': 'application/json'
  }),
  defaultModel: 'ibm/granite-13b-chat-v2',
  defaultParameters: {
    temperature: 0.7,
    max_new_tokens: 500
  }
};

export const providerConfigs: Record<string, ProviderConfig> = {
  openai: openAIConfig,
  gemini: googleGeminiConfig,
  claude: anthropicClaudeConfig,
  ibm: ibmWatsonXConfig
};

// Prompt Builder
export class PromptBuilder {
  static chainOfThought(taskDescription: string, input: string): string {
    return `You are an expert assistant. Your task is: ${taskDescription}

Follow these steps before answering:
1. Analyze input carefully
2. Reason step-by-step
3. Identify key factors
4. Formulate response based on reasoning

Input:
"""
${input}
"""

Provide your reasoning and final answer.`;
  }

  static simpleInstruction(instruction: string, input: string): string {
    return `Instruction: ${instruction}

Input: ${input}`;
  }

  static classification(taskDescription: string, input: string, classes: string[]): string {
    return `You are a classification AI.
Task: ${taskDescription}

Input:
"""
${input}
"""

Available categories: ${classes.join(', ')}

Classify the input into one of the categories.`;
  }
}

// Client Factory
export class ModelShiftAIClientFactory {
  // Enhanced primary method using the secure dynamic proxy with fallback
  static async create(
    provider: string, 
    userId: string,
    keyData?: Record<string, string>, 
    agentId?: string,
    useUserKey: boolean = true
  ): Promise<ModelShiftAIClient> {
    // Check if we should use direct browser mode
    const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
    
    if (connectionMode === 'browser') {
      console.log(`Creating direct browser client for ${provider}`);
      // For browser mode, we need API keys
      if (!keyData) {
        try {
          const { keyVault } = await import('./encryption');
          keyData = keyVault.retrieveDefault(provider);
        } catch (error) {
          console.error('Failed to import keyVault:', error);
        }
        
        if (!keyData) {
          throw new Error(`API keys required for direct browser mode. Please configure API keys in the API Keys section.`);
        }
      }
      
      const config = providerConfigs[provider];
      if (!config) {
        throw new Error(`Provider '${provider}' not supported`);
      }
      
      return new ConfigurableClient(keyData, config);
    }
    
    // Server mode - check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && 
        !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
      
      // Test if the proxy is properly configured
      const isProxyConfigured = await isSupabaseProxyConfigured();
      
      if (isProxyConfigured) {
        // Use the new dynamic proxy client
        console.log(`Creating DynamicProxyClient for ${provider}`);
        return new DynamicProxyClient(provider, userId, undefined, undefined, agentId, useUserKey);
      } else {
        console.warn(`Supabase dynamic proxy not properly configured, falling back to direct client for ${provider}`);
      }
    } else {
      console.warn(`Supabase not configured, falling back to direct client for ${provider}`);
    }
    
    // Fallback to legacy direct client
    const config = providerConfigs[provider];
    if (!config) {
      throw new Error(`Provider '${provider}' not supported`);
    }
    
    // Try to get keys from keyVault if not provided
    if (!keyData) {
      try {
        const { keyVault } = await import('./encryption');
        keyData = keyVault.retrieveDefault(provider);
        
        if (!keyData) {
          throw new Error(`API keys required for direct client mode. Please configure API keys in the API Keys section.`);
        }
      } catch (error) {
        console.error('Failed to import keyVault:', error);
        throw new Error(`API keys required for direct client mode. Please configure API keys in the API Keys section.`);
      }
    }
    
    return new ConfigurableClient(keyData, config);
  }

  // Synchronous version for backward compatibility
  static createSync(
    provider: string, 
    userId: string,
    keyData?: Record<string, string>, 
    agentId?: string,
    useUserKey: boolean = true
  ): ModelShiftAIClient {
    // Check if we should use direct browser mode
    const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
    
    if (connectionMode === 'browser') {
      console.log(`Creating direct browser client for ${provider}`);
      // For browser mode, we need API keys
      if (!keyData) {
        try {
          const { keyVault } = require('./encryption');
          keyData = keyVault.retrieveDefault(provider);
          
          if (!keyData) {
            throw new Error(`API keys required for direct browser mode. Please configure API keys in the API Keys section.`);
          }
        } catch (error) {
          console.error('Failed to import keyVault:', error);
          throw new Error(`API keys required for direct browser mode. Please configure API keys in the API Keys section.`);
        }
      }
      
      const config = providerConfigs[provider];
      if (!config) {
        throw new Error(`Provider '${provider}' not supported`);
      }
      
      return new ConfigurableClient(keyData, config);
    }
    
    // Server mode - check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && 
        !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
      // Use the new dynamic proxy client
      console.log(`Creating DynamicProxyClient for ${provider}`);
      return new DynamicProxyClient(provider, userId, undefined, undefined, agentId, useUserKey);
    } else {
      // Fallback to legacy direct client for development/demo
      console.warn(`Supabase not configured, falling back to direct client for ${provider}`);
      const config = providerConfigs[provider];
      if (!config) {
        throw new Error(`Provider '${provider}' not supported`);
      }
      
      // Try to get keys from keyVault if not provided
      if (!keyData) {
        try {
          const { keyVault } = require('./encryption');
          keyData = keyVault.retrieveDefault(provider);
          
          if (!keyData) {
            throw new Error(`API keys required for direct client mode. Please configure API keys in the API Keys section.`);
          }
        } catch (error) {
          console.error('Failed to import keyVault:', error);
          throw new Error(`API keys required for direct client mode. Please configure API keys in the API Keys section.`);
        }
      }
      
      return new ConfigurableClient(keyData, config);
    }
  }

  // Legacy method for backward compatibility
  static createLegacy(provider: string, keyData: Record<string, string>): ModelShiftAIClient {
    const config = providerConfigs[provider];
    if (!config) {
      throw new Error(`Provider '${provider}' not supported`);
    }
    return new ConfigurableClient(keyData, config);
  }

  // New method for creating data-driven clients
  static createFromApiConfig(
    apiConfig: ApiConfiguration, 
    keyData: Record<string, string>,
    customModel?: string,
    customParameters?: Record<string, any>
  ): ModelShiftAIClient {
    return new DataDrivenClient(keyData, apiConfig, customModel, customParameters);
  }

  // Enhanced method for creating clients from serialized configurations
  static createFromSerializedConfig(serializedConfig: import('../types').SerializedConfig): ModelShiftAIClient {
    // Check if we should use direct browser mode
    const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
    
    if (connectionMode === 'browser') {
      console.log(`Creating direct browser client from serialized config for ${serializedConfig.providerId}`);
      // For browser mode, we use the serialized config directly
      const baseConfig = providerConfigs[serializedConfig.providerId];
      if (!baseConfig) {
        throw new Error(`Provider '${serializedConfig.providerId}' not supported`);
      }

      // Create a custom config that overrides defaults with serialized values
      const customConfig: ProviderConfig = {
        ...baseConfig,
        buildRequestBody: (prompt: string, keyData: Record<string, string>) => {
          const baseBody = baseConfig.buildRequestBody(prompt, keyData);
          
          // Override model and parameters if specified in serialized config
          const customBody = { ...baseBody };
          
          if (serializedConfig.model) {
            if ('model' in customBody) {
              customBody.model = serializedConfig.model;
            } else if ('model_id' in customBody) {
              (customBody as any).model_id = serializedConfig.model;
            }
          }
          
          if (serializedConfig.parameters) {
            Object.assign(customBody, serializedConfig.parameters);
          }
          
          return customBody;
        }
      };

      return new ConfigurableClient(serializedConfig.keyData, customConfig);
    }
    
    // Server mode
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && 
        !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
      // Use the new dynamic proxy client
      return new DynamicProxyClient(
        serializedConfig.providerId,
        'serialized-config-user', // Placeholder user ID
        serializedConfig.model,
        serializedConfig.parameters,
        serializedConfig.agentId,
        false // Don't use user key for serialized configs
      );
    } else {
      // Fallback to legacy client
      const baseConfig = providerConfigs[serializedConfig.providerId];
      if (!baseConfig) {
        throw new Error(`Provider '${serializedConfig.providerId}' not supported`);
      }

      // Create a custom config that overrides defaults with serialized values
      const customConfig: ProviderConfig = {
        ...baseConfig,
        buildRequestBody: (prompt: string, keyData: Record<string, string>) => {
          const baseBody = baseConfig.buildRequestBody(prompt, keyData);
          
          // Override model and parameters if specified in serialized config
          const customBody = { ...baseBody };
          
          if (serializedConfig.model) {
            if ('model' in customBody) {
              customBody.model = serializedConfig.model;
            } else if ('model_id' in customBody) {
              (customBody as any).model_id = serializedConfig.model;
            }
          }
          
          if (serializedConfig.parameters) {
            Object.assign(customBody, serializedConfig.parameters);
          }
          
          return customBody;
        }
      };

      return new ConfigurableClient(serializedConfig.keyData, customConfig);
    }
  }

  // New method to get user API key and create client
  static async createWithUserKey(
    provider: string,
    userId: string,
    agentId?: string
  ): Promise<ModelShiftAIClient> {
    try {
      // Check if we should use direct browser mode
      const connectionMode = localStorage.getItem('modelshift-connection-mode') || 'server';
      
      if (connectionMode === 'browser') {
        console.log(`Creating direct browser client with user key for ${provider}`);
        const { keyVault } = await import('./encryption');
        const keyData = keyVault.retrieveDefault(provider);
        
        if (!keyData) {
          throw new Error(`No API key found for ${provider}. Please add your API key in the API Keys section.`);
        }
        
        const config = providerConfigs[provider];
        if (!config) {
          throw new Error(`Provider '${provider}' not supported`);
        }
        
        return new ConfigurableClient(keyData, config);
      }
      
      // Server mode - check if user has an API key for this provider
      const userKey = await apiKeysDb.getActiveForProvider(userId, provider);
      
      if (userKey) {
        // User has a key, decrypt it
        const decryptedKey = serverEncryption.decrypt(userKey.encrypted_key);
        
        // For IBM, we need to check if the user has a project ID
        let projectId = null;
        if (provider === 'ibm') {
          const projectIdKey = await apiKeysDb.getActiveForProvider(userId, 'ibm_project');
          if (projectIdKey) {
            projectId = serverEncryption.decrypt(projectIdKey.encrypted_key);
          }
        }
        
        // Create key data object
        const keyData: Record<string, string> = {
          apiKey: decryptedKey
        };
        
        if (projectId) {
          keyData.projectId = projectId;
        }
        
        // Update last used timestamp
        await apiKeysDb.updateLastUsed(userId, userKey.id);
        
        // Create client with user's key
        return this.createSync(provider, userId, keyData, agentId, false);
      }
      
      // No user key, use proxy with server key
      return this.createSync(provider, userId, undefined, agentId, false);
    } catch (error) {
      console.error('Error creating client with user key:', error);
      // Fallback to server key
      return this.createSync(provider, userId, undefined, agentId, false);
    }
  }
}