// ModelShift AI Provider SDK Integration
import { setValueAtPath, getValueAtPath, mergeAtPath } from './jsonPathUtils';
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

// Helper function to determine if we're in development and should use proxy
function isDevelopment(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost' || 
         window.location.hostname.includes('webcontainer') ||
         window.location.hostname.includes('stackblitz');
}

// Helper function to check if Supabase proxy is properly configured
async function isSupabaseProxyConfigured(): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('demo') || supabaseAnonKey.includes('demo')) {
    return false;
  }

  // Test if the edge function is accessible
  try {
    const testResponse = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        providerId: 'test',
        prompt: 'test'
      })
    });

    // If we get a 404, the function doesn't exist
    if (testResponse.status === 404) {
      return false;
    }

    // If we get a 400 with "Unsupported provider: test", the function exists but API keys might be missing
    // This is actually a good sign - the function is working
    if (testResponse.status === 400) {
      try {
        const errorData = await testResponse.json();
        if (errorData.error && errorData.error.includes('Unsupported provider: test')) {
          return true; // Function exists and is working
        }
      } catch (e) {
        // If we can't parse the error, assume function exists
        return true;
      }
    }

    // Any other response means the function exists
    return true;
  } catch (error) {
    console.warn('Supabase proxy test failed:', error);
    return false;
  }
}

// New Proxy Client that uses the Supabase Edge Function
export class ProxyClient implements ModelShiftAIClient {
  constructor(
    private readonly providerId: string,
    private readonly customModel?: string,
    private readonly customParameters?: Record<string, any>
  ) {}

  async generate(prompt: string): Promise<string> {
    try {
      // Get Supabase URL and anon key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      }

      // Construct the Edge Function URL
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-proxy`;

      // Prepare request body
      const requestBody = {
        providerId: this.providerId,
        prompt,
        model: this.customModel,
        parameters: this.customParameters
      };

      // Make request to Edge Function
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorText = '';
        let errorData = null;
        try {
          errorData = await response.json();
          errorText = errorData.error || `HTTP ${response.status}`;
        } catch (e) {
          errorText = `HTTP ${response.status}`;
        }
        
        console.error(`Edge Function request failed: ${response.status} - ${errorText}`);
        
        // Enhanced error handling for missing API keys
        if (errorText.includes('not set in Supabase secrets')) {
          const providerName = this.getProviderDisplayName();
          throw new Error(
            `${providerName} API key is not configured on the server. ` +
            `The server administrator needs to configure the API key in Supabase Edge Function secrets. ` +
            `Alternatively, you can configure local API keys in the API Keys section to use direct mode.`
          );
        }
        
        // Handle other common server-side errors
        if (response.status === 401) {
          throw new Error(`Authentication failed: Invalid API key configuration on server`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden: API key permissions issue on server`);
        } else if (response.status === 404) {
          throw new Error(`AI proxy service not found: Edge function may not be deployed`);
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded: Too many requests to ${this.getProviderDisplayName()}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: The AI proxy service is temporarily unavailable`);
        }
        
        throw new Error(`AI proxy request failed: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        // Handle structured error responses from the Edge Function
        if (data.error && data.error.includes('not set in Supabase secrets')) {
          const providerName = this.getProviderDisplayName();
          throw new Error(
            `${providerName} API key is not configured on the server. ` +
            `The server administrator needs to configure the API key in Supabase Edge Function secrets. ` +
            `Alternatively, you can configure local API keys in the API Keys section to use direct mode.`
          );
        }
        throw new Error(data.error || 'AI proxy request failed');
      }

      return data.response || 'No response';
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

// Legacy ConfigurableClient for backward compatibility (now deprecated)
export class ConfigurableClient implements ModelShiftAIClient {
  constructor(private readonly keyData: Record<string, string>, private readonly config: ProviderConfig) {}

  async generate(prompt: string): Promise<string> {
    console.warn('ConfigurableClient is deprecated. Please use ProxyClient for enhanced security.');
    
    try {
      const originalEndpoint = this.getEndpoint();
      const endpoint = this.getProxyUrl(originalEndpoint);
      const headers = this.buildHeaders();
      const body = this.config.buildRequestBody(prompt, this.keyData);

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
              'Network request failed. The development proxy may not be configured correctly. ' +
              'Please ensure the Vite development server is running with proxy configuration.'
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
    if (this.config.buildHeaders) {
      return this.config.buildHeaders(this.keyData);
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.keyData.apiKey}`
    };
  }

  // Helper function to convert external URLs to proxy URLs in development
  private getProxyUrl(originalUrl: string): string {
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

    return originalUrl;
  }
}

// New Data-Driven Configurable Client
export class DataDrivenClient implements ModelShiftAIClient {
  constructor(
    private readonly keyData: Record<string, string>, 
    private readonly apiConfig: ApiConfiguration,
    private readonly customModel?: string,
    private readonly customParameters?: Record<string, any>
  ) {}

  async generate(prompt: string): Promise<string> {
    console.warn('DataDrivenClient is deprecated. Please use ProxyClient for enhanced security.');
    
    try {
      const originalEndpoint = this.buildEndpoint();
      const endpoint = this.getProxyUrl(originalEndpoint);
      const headers = this.buildHeaders();
      const body = this.buildRequestBody(prompt);

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
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        if (isDevelopment()) {
          throw new Error(
            'Network request failed. The development proxy may not be configured correctly. ' +
            'Please ensure the Vite development server is running with proxy configuration.'
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
    
    return headers;
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

  // Helper function to convert external URLs to proxy URLs in development
  private getProxyUrl(originalUrl: string): string {
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

    return originalUrl;
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
  buildHeaders: (keyData: Record<string, string>) => ({
    'x-api-key': keyData.apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json'
    // Note: Removed 'anthropic-dangerous-direct-browser-access' as it's not needed for proxy calls
  }),
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
  // NEW: Primary method using the secure proxy with fallback
  static async create(provider: string, keyData?: Record<string, string>): Promise<ModelShiftAIClient> {
    // Check if Supabase is configured for proxy mode
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && 
        !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
      
      // Test if the proxy is properly configured
      const isProxyConfigured = await isSupabaseProxyConfigured();
      
      if (isProxyConfigured) {
        // Use the secure proxy client
        console.log(`Creating ProxyClient for ${provider}`);
        return new ProxyClient(provider);
      } else {
        console.warn(`Supabase proxy not properly configured, falling back to direct client for ${provider}`);
      }
    } else {
      console.warn(`Supabase not configured, falling back to direct client for ${provider}`);
    }
    
    // Fallback to legacy direct client
    const config = providerConfigs[provider];
    if (!config) {
      throw new Error(`Provider '${provider}' not supported`);
    }
    if (!keyData) {
      throw new Error(`API keys required for direct client mode. Please configure API keys in the API Keys section.`);
    }
    return new ConfigurableClient(keyData, config);
  }

  // Synchronous version for backward compatibility
  static createSync(provider: string, keyData?: Record<string, string>): ModelShiftAIClient {
    // Check if Supabase is configured for proxy mode
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && 
        !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
      // Use the secure proxy client
      console.log(`Creating ProxyClient for ${provider}`);
      return new ProxyClient(provider);
    } else {
      // Fallback to legacy direct client for development/demo
      console.warn(`Supabase not configured, falling back to direct client for ${provider}`);
      const config = providerConfigs[provider];
      if (!config) {
        throw new Error(`Provider '${provider}' not supported`);
      }
      if (!keyData) {
        throw new Error(`API keys required for direct client mode. Please configure API keys in the API Keys section.`);
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
    // Check if Supabase is configured for proxy mode
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && 
        !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
      // Use the secure proxy client
      return new ProxyClient(
        serializedConfig.providerId,
        serializedConfig.model,
        serializedConfig.parameters
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
}