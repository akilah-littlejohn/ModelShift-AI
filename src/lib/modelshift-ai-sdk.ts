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

export class ConfigurableClient implements ModelShiftAIClient {
  constructor(private readonly keyData: Record<string, string>, private readonly config: ProviderConfig) {}

  async generate(prompt: string): Promise<string> {
    try {
      const endpoint = this.getEndpoint();
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
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} ${errorText}`);
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
      }

      const json = await response.json();
      const output = this.config.parseResponse(json);
      return output || 'No response';
    } catch (error) {
      console.error('Error during generate():', error);
      
      // Enhanced error handling for different types of network issues
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch') {
          throw new Error(
            'Network request failed. This may be due to CORS restrictions in the development environment. ' +
            'In a production environment, you would need to either:\n' +
            '1. Use a backend proxy to make API calls\n' +
            '2. Configure CORS headers on your server\n' +
            '3. Use the provider\'s official SDK with proper authentication'
          );
        }
        if (error.message.includes('NetworkError')) {
          throw new Error(
            'Network error occurred. Please check your internet connection and try again.'
          );
        }
      }
      
      // Re-throw other errors as-is
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
    try {
      const endpoint = this.buildEndpoint();
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
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} ${errorText}`);
        
        // Try to parse error from response if errorJsonPath is provided
        if (this.apiConfig.errorJsonPath) {
          try {
            const errorJson = JSON.parse(errorText);
            const errorMessage = getValueAtPath(errorJson, this.apiConfig.errorJsonPath);
            if (errorMessage) {
              throw new Error(`API Error: ${errorMessage}`);
            }
          } catch (parseError) {
            // Fall back to generic error if parsing fails
          }
        }
        
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
      }

      const json = await response.json();
      const output = getValueAtPath(json, this.apiConfig.responseJsonPath);
      return output || 'No response';
    } catch (error) {
      console.error('Error during generate():', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          'Network request failed. This may be due to CORS restrictions in the development environment. ' +
          'In a production environment, you would need to either:\n' +
          '1. Use a backend proxy to make API calls\n' +
          '2. Configure CORS headers on your server\n' +
          '3. Use the provider\'s official SDK with proper authentication'
        );
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
  static create(provider: string, keyData: Record<string, string>): ModelShiftAIClient {
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