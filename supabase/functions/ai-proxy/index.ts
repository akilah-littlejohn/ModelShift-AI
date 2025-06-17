import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  providerId: string;
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
  agentId?: string;
  userId?: string;
}

interface ProviderConfig {
  name: string;
  apiKeyEnvVar: string;
  endpoint: string;
  buildRequest: (prompt: string, model?: string, parameters?: Record<string, any>) => any;
  parseResponse: (response: any) => string;
  additionalHeaders?: Record<string, string>;
  requiresProjectId?: boolean;
}

// Provider configurations
const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    buildRequest: (prompt: string, model = 'gpt-4', parameters = {}) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      ...parameters,
    }),
    parseResponse: (response: any) => response?.choices?.[0]?.message?.content || '',
    additionalHeaders: {}
  },
  gemini: {
    name: 'Google Gemini',
    apiKeyEnvVar: 'GEMINI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    buildRequest: (prompt: string, model = 'gemini-2.0-flash', parameters = {}) => ({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 1,
        maxOutputTokens: 1000,
        ...parameters,
      },
    }),
    parseResponse: (response: any) => response?.candidates?.[0]?.content?.parts?.[0]?.text || '',
    additionalHeaders: {}
  },
  claude: {
    name: 'Anthropic Claude',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    endpoint: 'https://api.anthropic.com/v1/messages',
    buildRequest: (prompt: string, model = 'claude-3-sonnet-20240229', parameters = {}) => ({
      model,
      max_tokens: parameters?.max_tokens || 1000,
      messages: [{ role: 'user', content: prompt }],
      temperature: parameters?.temperature || 0.7,
      ...parameters,
    }),
    parseResponse: (response: any) => response?.content?.[0]?.text || '',
    additionalHeaders: {
      'anthropic-version': '2023-06-01'
    }
  },
  ibm: {
    name: 'IBM WatsonX',
    apiKeyEnvVar: 'IBM_API_KEY',
    endpoint: 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
    buildRequest: (prompt: string, model = 'ibm/granite-13b-chat-v2', parameters = {}) => ({
      input: prompt,
      model_id: model,
      project_id: Deno.env.get('IBM_PROJECT_ID'),
      parameters: {
        temperature: 0.7,
        max_new_tokens: 500,
        ...parameters,
      },
    }),
    parseResponse: (response: any) => response?.results?.[0]?.generated_text || '',
    additionalHeaders: {},
    requiresProjectId: true
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Initialize Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error('Invalid authentication token');
    }

    console.log(`[${requestId}] Authenticated request from user: ${user.email}`);

    // Parse request body
    const { providerId, prompt, model, parameters, agentId, userId }: RequestBody = await req.json();

    // Validate request
    if (!providerId || !prompt) {
      throw new Error('Missing required fields: providerId and prompt');
    }

    // Verify user ID matches authenticated user
    if (userId && userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    // Handle health check
    if (providerId === 'health-check') {
      const configuredProviders = Object.keys(PROVIDERS).filter(id => {
        const config = PROVIDERS[id];
        const hasApiKey = !!Deno.env.get(config.apiKeyEnvVar);
        const hasProjectId = !config.requiresProjectId || !!Deno.env.get('IBM_PROJECT_ID');
        return hasApiKey && hasProjectId;
      });

      const errors = Object.keys(PROVIDERS).filter(id => {
        const config = PROVIDERS[id];
        const hasApiKey = !!Deno.env.get(config.apiKeyEnvVar);
        const hasProjectId = !config.requiresProjectId || !!Deno.env.get('IBM_PROJECT_ID');
        return !hasApiKey || !hasProjectId;
      }).map(id => `${PROVIDERS[id].name}: Missing ${PROVIDERS[id].apiKeyEnvVar}${PROVIDERS[id].requiresProjectId ? ' or IBM_PROJECT_ID' : ''}`);

      return new Response(
        JSON.stringify({
          success: true,
          configuredProviders,
          errors,
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get provider configuration
    const providerConfig = PROVIDERS[providerId];
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${providerId}`);
    }

    // Check API key availability
    const apiKey = Deno.env.get(providerConfig.apiKeyEnvVar);
    if (!apiKey) {
      throw new Error(`${providerConfig.apiKeyEnvVar} not set in Supabase secrets.`);
    }

    // Check additional requirements (e.g., IBM Project ID)
    if (providerConfig.requiresProjectId && !Deno.env.get('IBM_PROJECT_ID')) {
      throw new Error('IBM_PROJECT_ID not set in Supabase secrets.');
    }

    console.log(`[${requestId}] Making API call to ${providerConfig.name}`);

    // Build request
    const requestBody = providerConfig.buildRequest(prompt, model, parameters);
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...providerConfig.additionalHeaders
    };

    // Add authentication header based on provider
    if (providerId === 'openai' || providerId === 'ibm') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (providerId === 'claude') {
      headers['x-api-key'] = apiKey;
    }

    // Build endpoint URL (for Gemini, add API key as query parameter)
    let endpoint = providerConfig.endpoint;
    if (providerId === 'gemini') {
      endpoint += `?key=${apiKey}`;
    }

    // Make API request
    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;

    if (!apiResponse.ok) {
      let errorText = '';
      try {
        const errorData = await apiResponse.json();
        errorText = errorData.error?.message || errorData.message || `HTTP ${apiResponse.status}`;
      } catch (e) {
        errorText = `HTTP ${apiResponse.status}`;
      }
      
      console.error(`[${requestId}] API call failed for ${providerConfig.name}: ${apiResponse.status} - ${errorText}`);
      
      // Enhanced error messages for common issues
      if (apiResponse.status === 401) {
        throw new Error(`Authentication failed for ${providerConfig.name}: Invalid API key`);
      } else if (apiResponse.status === 403) {
        throw new Error(`Access forbidden for ${providerConfig.name}: Check API key permissions`);
      } else if (apiResponse.status === 429) {
        throw new Error(`Rate limit exceeded for ${providerConfig.name}: Too many requests`);
      } else if (apiResponse.status >= 500) {
        throw new Error(`Server error for ${providerConfig.name}: Service temporarily unavailable`);
      } else {
        throw new Error(`API call failed for ${providerConfig.name}: ${errorText}`);
      }
    }

    const responseData = await apiResponse.json();
    const generatedText = providerConfig.parseResponse(responseData);

    if (!generatedText) {
      console.warn(`[${requestId}] No text generated from ${providerConfig.name} response:`, responseData);
    }

    // Log successful request
    console.log(`[${requestId}] Request completed successfully:`, {
      provider: providerConfig.name,
      model: model || 'default',
      responseTime,
      responseLength: generatedText?.length || 0,
      userId: user.id
    });

    // Log to analytics (optional - could be done asynchronously)
    try {
      await supabaseClient.from('analytics_events').insert({
        id: `proxy_${requestId}`,
        user_id: user.id,
        event_type: 'proxy_call',
        provider_id: providerId,
        agent_id: agentId,
        prompt_length: prompt.length,
        response_length: generatedText?.length || 0,
        success: true,
        metrics: {
          latency: responseTime,
          tokens: Math.ceil((prompt.length + (generatedText?.length || 0)) / 4),
          cost: 0 // Could be calculated based on provider pricing
        },
        metadata: {
          model: model || 'default',
          requestId,
          proxy_mode: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.warn(`[${requestId}] Failed to log analytics:`, logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: generatedText || 'No response generated',
        provider: providerId,
        model: model || 'default',
        requestId,
        metrics: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error(`[${requestId}] AI Proxy Edge Function error:`, error);
    
    // Log error to analytics (optional)
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Try to get user from auth header for error logging
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          await supabaseClient.from('analytics_events').insert({
            id: `proxy_error_${requestId}`,
            user_id: user.id,
            event_type: 'proxy_error',
            provider_id: 'unknown',
            prompt_length: 0,
            response_length: 0,
            success: false,
            error_type: 'proxy_error',
            metrics: {
              latency: responseTime,
              tokens: 0,
              cost: 0
            },
            metadata: {
              error: error.message,
              requestId,
              proxy_mode: true
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (logError) {
      console.warn(`[${requestId}] Failed to log error analytics:`, logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        provider: 'unknown',
        requestId,
        metrics: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});