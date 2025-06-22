import { supabase } from '../supabase';

export interface ProxyResponse {
  success: boolean;
  response?: string;
  error?: string;
  provider?: string;
  model?: string;
  requestId?: string;
  using_user_key?: boolean;
  metrics?: {
    responseTime: number;
    timestamp: string;
  };
}

export interface ProxyRequest {
  providerId: string;
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
  agentId?: string;
  userId?: string;
  useUserKey?: boolean;
}

export class ProxyService {
  private static instance: ProxyService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
  }

  public static getInstance(): ProxyService {
    if (!ProxyService.instance) {
      ProxyService.instance = new ProxyService();
    }
    return ProxyService.instance;
  }

  private async getAuthToken(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      throw new Error('Authentication required. Please log in to continue.');
    }
    
    return session.access_token;
  }

  private getProviderDisplayName(providerId: string): string {
    const providerNames: Record<string, string> = {
      'openai': 'OpenAI',
      'gemini': 'Google Gemini',
      'claude': 'Anthropic Claude',
      'ibm': 'IBM WatsonX'
    };
    return providerNames[providerId] || providerId;
  }

  private formatApiKeyError(error: string, providerId: string): string {
    const providerName = this.getProviderDisplayName(providerId);
    
    if (error.includes('No API key found')) {
      return `${providerName} API key not configured. To fix this:\n\n` +
             `Option 1: Add your own API key\n` +
             `• Go to Settings → API Keys\n` +
             `• Click "Add API Key"\n` +
             `• Select "${providerName}" and enter your API key\n\n` +
             `Option 2: Ask your administrator to configure server-side keys\n` +
             `• Server-side keys can be configured in Supabase Edge Function secrets\n\n` +
             `Need an API key? Visit the ${providerName} website to create one.`;
    }
    
    if (error.includes('Authentication failed') || error.includes('Invalid API key')) {
      return `${providerName} API key is invalid. Please:\n\n` +
             `• Check that your API key is correct\n` +
             `• Verify the key hasn't expired\n` +
             `• Ensure the key has the necessary permissions\n\n` +
             `You can update your API key in Settings → API Keys`;
    }
    
    if (error.includes('Rate limit exceeded')) {
      return `${providerName} rate limit exceeded. Please:\n\n` +
             `• Wait a few minutes before trying again\n` +
             `• Consider upgrading your API plan for higher limits\n` +
             `• Use a different provider temporarily`;
    }
    
    if (error.includes('No Project ID found')) {
      return `${providerName} requires a Project ID. Please:\n\n` +
             `• Go to Settings → API Keys\n` +
             `• Add your IBM Project ID (separate from API key)\n` +
             `• You can find your Project ID in your IBM Cloud dashboard`;
    }
    
    return error;
  }

  async callProvider(request: ProxyRequest): Promise<ProxyResponse> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Proxy service returned error:', {
          status: response.status,
          statusText: response.statusText,
          body: JSON.stringify(data)
        });
        
        // Format the error message for better user experience
        const formattedError = this.formatApiKeyError(data.error || 'Unknown error', request.providerId);
        
        throw new Error(`Proxy service returned error:\n\n${JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          body: JSON.stringify({
            ...data,
            error: formattedError
          })
        })}`);
      }

      if (!data.success) {
        console.error('Proxy service error:', data);
        
        // Format the error message for better user experience
        const formattedError = this.formatApiKeyError(data.error || 'Unknown error', request.providerId);
        
        throw new Error(`Proxy service error:\n\n${JSON.stringify({
          ...data,
          error: formattedError
        })}`);
      }

      return data;
    } catch (error) {
      console.error('ProxyService.callProvider error:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<{
    success: boolean;
    configuredProviders: string[];
    errors: string[];
    requestId?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: 'health-check',
          prompt: 'health-check'
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('ProxyService.checkHealth error:', error);
      return {
        success: false,
        configuredProviders: [],
        errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

export const proxyService = ProxyService.getInstance();