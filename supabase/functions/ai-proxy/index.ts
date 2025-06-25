import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers must be included in all responses
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
  useUserKey?: boolean; // Flag to indicate whether to use user's API key
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
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
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

// Encryption utilities for API keys
const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'modelshift-ai-secure-key-2024';

/**
 * Decrypt an encrypted API key
 * This is a simplified implementation - in production, use a proper encryption library
 */
function decrypt(encryptedText: string): string {
  try {
    // This is a simplified implementation - in production, use a proper encryption library
    // For demo purposes, we're using a basic XOR encryption
    const textBytes = atob(encryptedText);
    const keyBytes = encryptionKey.repeat(Math.ceil(textBytes.length / encryptionKey.length)).slice(0, textBytes.length);
    
    let decrypted = '';
    for (let i = 0; i < textBytes.length; i++) {
      decrypted += String.fromCharCode(textBytes.charCodeAt(i) ^ keyBytes.charCodeAt(i));
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key. The key may be corrupted or using an incompatible encryption format.');
  }
}

/**
 * Estimate token count from text length
 * This is a very rough estimation - actual token count depends on the tokenizer used by each model
 */
function estimateTokenCount(text: string): number {
  // A very rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on provider and token count
 */
function estimateCost(providerId: string, inputTokens: number, outputTokens: number): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    openai: { input: 0.03, output: 0.06 }, // GPT-4
    gemini: { input: 0.0005, output: 0.0015 }, // Gemini 2.0 Flash
    claude: { input: 0.015, output: 0.075 }, // Claude 3 Sonnet
    ibm: { input: 0.02, output: 0.04 } // IBM Granite
  };
  
  const rates = pricing[providerId] || { input: 0.01, output: 0.02 }; // Default fallback
  
  return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
}

/**
 * Validate the request body
 * Returns an error message if validation fails, null if validation passes
 */
function validateRequest(body: any): string | null {
  if (!body) {
    return 'Missing request body';
  }
  
  if (!body.providerId) {
    return 'Missing required field: providerId';
  }
  
  if (body.providerId !== 'health-check' && !body.prompt) {
    return 'Missing required field: prompt';
  }
  
  return null;
}

/**
 * Verify authentication with Supabase
 * Returns the user if authentication is successful, throws an error if not
 */
async function verifyAuthentication(authHeader: string | null, supabaseClient: any): Promise<any> {
  if (!authHeader) {
    throw new Error('Missing authorization header. Please ensure you are signed in and your session is valid.');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }
  
  if (!user) {
    throw new Error('Invalid or expired authentication token. Please sign in again.');
  }
  
  return user;
}

/**
 * Log analytics event to Supabase
 * This is a non-critical operation, so we don't throw errors if it fails
 */
async function logAnalyticsEvent(
  supabaseClient: any,
  requestId: string,
  userId: string,
  providerId: string,
  agentId: string | undefined,
  prompt: string,
  response: string,
  success: boolean,
  error: string | undefined,
  responseTime: number,
  inputTokens: number,
  outputTokens: number,
  estimatedCost: number,
  usingUserKey: boolean,
  userKeyId: string | null
): Promise<void> {
  try {
    await supabaseClient.from('analytics_events').insert({
      id: `proxy_${requestId}`,
      user_id: userId,
      event_type: 'proxy_call',
      provider_id: providerId,
      agent_id: agentId,
      prompt_length: prompt.length,
      response_length: response?.length || 0,
      success,
      error_type: error ? 'api_error' : undefined,
      metrics: {
        latency: responseTime,
        tokens: inputTokens + outputTokens,
        cost: estimatedCost
      },
      metadata: {
        error,
        using_user_key: usingUserKey,
        user_key_id: userKeyId
      },
      timestamp: new Date().toISOString()
    });
  } catch (analyticsError) {
    console.warn(`Failed to log analytics event: ${analyticsError}`);
    // Don't throw - this is a non-critical operation
  }
}

serve(async (req) => {
  // CRITICAL: Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Initialize Supabase client for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const user = await verifyAuthentication(authHeader, supabaseClient);

    console.log(`[${requestId}] Authenticated request from user: ${user.id} (${user.email})`);

    // Parse request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error('Invalid request body. Please provide a valid JSON payload.');
    }
    
    // Validate request body
    const validationError = validateRequest(requestBody);
    if (validationError) {
      throw new Error(validationError);
    }
    
    const { providerId, prompt, model, parameters, agentId, userId, useUserKey = false } = requestBody;

    // Verify user ID matches authenticated user
    if (userId && userId !== user.id) {
      throw new Error('User ID mismatch. The provided userId does not match the authenticated user.');
    }

    // Handle health check
    if (providerId === 'health-check') {
      const configuredProviders = Object.keys(PROVIDERS).filter(id => {
        const config = PROVIDERS[id];
        const hasApiKey = !!Deno.env.get(config.apiKeyEnvVar);
        const hasProjectId = !config.requiresProjectId || !!Deno.env.get('IBM_PROJECT_ID');
        return hasApiKey && hasProjectId;
      });

      const errors = Object.keys(PROVIDERS)
        .filter(id => {
          const config = PROVIDERS[id];
          const hasApiKey = !!Deno.env.get(config.apiKeyEnvVar);
          const hasProjectId = !config.requiresProjectId || !!Deno.env.get('IBM_PROJECT_ID');
          return !hasApiKey || !hasProjectId;
        })
        .map(id => {
          const config = PROVIDERS[id];
          if (config.requiresProjectId && !Deno.env.get('IBM_PROJECT_ID')) {
            return `${config.name}: Missing IBM_PROJECT_ID in Supabase secrets`;
          }
          return `${config.name}: Missing ${config.apiKeyEnvVar} in Supabase secrets`;
        });

      return new Response(
        JSON.stringify({
          success: true,
          configuredProviders,
          errors,
          requestId,
          serverInfo: {
            timestamp: new Date().toISOString(),
            environment: Deno.env.get('ENVIRONMENT') || 'production',
            version: '1.0.1' // Added version number for tracking
          }
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
      throw new Error(`Unsupported provider: ${providerId}. Available providers are: ${Object.keys(PROVIDERS).join(', ')}`);
    }

    // Determine which API key to use
    let apiKey: string | null = null;
    let userKeyId: string | null = null;
    let usingUserKey = false;

    // First, try to get the user's API key for this provider if requested or if no server key exists
    const serverApiKey = Deno.env.get(providerConfig.apiKeyEnvVar);
    const shouldTryUserKey = useUserKey || !serverApiKey;

    if (shouldTryUserKey) {
      try {
        console.log(`[${requestId}] Attempting to use user's API key for ${providerConfig.name}`);
        
        // Get the user's API key for this provider
        const { data: userKeys, error: userKeyError } = await supabaseClient
          .from('user_api_keys')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider_id', providerId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (userKeyError) {
          console.error(`[${requestId}] Error fetching user API key:`, userKeyError);
          throw new Error(`Failed to retrieve your API key: ${userKeyError.message}`);
        } 
        
        if (!userKeys || userKeys.length === 0) {
          console.log(`[${requestId}] No user API key found for ${providerConfig.name}`);
          if (useUserKey) {
            throw new Error(`No API key found for ${providerConfig.name}. Please add your API key in the API Keys section.`);
          }
          // If useUserKey is false, we'll fall back to server key
        } else {
          try {
            apiKey = decrypt(userKeys[0].encrypted_key);
            userKeyId = userKeys[0].id;
            usingUserKey = true;
            
            console.log(`[${requestId}] Using user's API key for ${providerConfig.name} (Key ID: ${userKeyId})`);
            
            // Update last_used_at timestamp
            await supabaseClient
              .from('user_api_keys')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', userKeyId);
          } catch (decryptError) {
            console.error(`[${requestId}] Error decrypting user API key:`, decryptError);
            throw new Error(`Failed to decrypt your API key for ${providerConfig.name}. Please try adding your API key again in the API Keys section.`);
          }
        }
      } catch (error) {
        if (error.message.includes('Failed to decrypt') || error.message.includes('No API key found')) {
          // These are specific errors we want to propagate
          throw error;
        }
        
        console.error(`[${requestId}] Error in user key lookup:`, error);
        throw new Error(`Error accessing your API keys: ${error.message}`);
      }
    }

    // If no user key was found or decryption failed, try server API key
    if (!apiKey && serverApiKey) {
      apiKey = serverApiKey;
      usingUserKey = false;
      console.log(`[${requestId}] Using server API key for ${providerConfig.name}`);
    }

    // If still no API key, return an error
    if (!apiKey) {
      const errorMessage = serverApiKey 
        ? `Failed to decrypt your API key for ${providerConfig.name}. Please try adding your API key again in the API Keys section.`
        : `No API key found for ${providerConfig.name}. Please add your API key in the API Keys section or configure ${providerConfig.apiKeyEnvVar} in Supabase Edge Function secrets.`;
      
      throw new Error(errorMessage);
    }

    // Check additional requirements (e.g., IBM Project ID)
    let projectId: string | null = null;
    
    if (providerConfig.requiresProjectId) {
      // First try server-side project ID
      projectId = Deno.env.get('IBM_PROJECT_ID');
      
      // If no server project ID and using user key, try to get user's project ID
      if (!projectId && usingUserKey) {
        try {
          const { data: userKeys, error: userKeyError } = await supabaseClient
            .from('user_api_keys')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider_id', 'ibm_project')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!userKeyError && userKeys && userKeys.length > 0) {
            try {
              projectId = decrypt(userKeys[0].encrypted_key);
              console.log(`[${requestId}] Using user's IBM Project ID`);
            } catch (decryptError) {
              console.error(`[${requestId}] Error decrypting user project ID:`, decryptError);
              throw new Error('Failed to decrypt your IBM Project ID. Please try adding it again in the API Keys section.');
            }
          }
        } catch (error) {
          console.error(`[${requestId}] Error in project ID lookup:`, error);
          throw new Error(`Error accessing your IBM Project ID: ${error.message}`);
        }
      }
      
      // If no project ID was found, return an error
      if (!projectId) {
        throw new Error(`No Project ID found for ${providerConfig.name}. Please add your Project ID in the API Keys section or configure IBM_PROJECT_ID in Supabase Edge Function secrets.`);
      }
    }

    console.log(`[${requestId}] Making API call to ${providerConfig.name} (${model || 'default model'})`);

    // Build request
    const requestBody = providerConfig.buildRequest(prompt, model, parameters);
    
    // For IBM, inject the project ID
    if (providerConfig.requiresProjectId && projectId) {
      requestBody.project_id = projectId;
    }
    
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

    // Make API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout
    
    let apiResponse: Response;
    try {
      apiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request to ${providerConfig.name} timed out after 60 seconds. The service may be experiencing high load.`);
      }
      throw new Error(`Network error when calling ${providerConfig.name} API: ${fetchError.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    const responseTime = Date.now() - startTime;

    if (!apiResponse.ok) {
      let errorText = '';
      let errorData = null;
      
      try {
        const responseText = await apiResponse.text();
        try {
          errorData = JSON.parse(responseText);
          errorText = errorData.error?.message || errorData.message || responseText;
        } catch (e) {
          errorText = responseText;
        }
      } catch (e) {
        errorText = `HTTP ${apiResponse.status}`;
      }
      
      console.error(`[${requestId}] API call failed for ${providerConfig.name}: ${apiResponse.status} - ${errorText}`);
      
      // Enhanced error messages for common issues
      if (apiResponse.status === 401) {
        throw new Error(`Authentication failed for ${providerConfig.name}: Invalid API key. Please check your API key and try again.`);
      } else if (apiResponse.status === 403) {
        throw new Error(`Access forbidden for ${providerConfig.name}: Your API key doesn't have permission for this operation. Please check your API key permissions.`);
      } else if (apiResponse.status === 429) {
        throw new Error(`Rate limit exceeded for ${providerConfig.name}: Too many requests in a short period. Please try again later or upgrade your API plan.`);
      } else if (apiResponse.status >= 500) {
        throw new Error(`Server error for ${providerConfig.name}: The service is temporarily unavailable. Please try again later.`);
      } else {
        throw new Error(`API call failed for ${providerConfig.name}: ${errorText}`);
      }
    }

    let responseData;
    try {
      responseData = await apiResponse.json();
    } catch (jsonError) {
      throw new Error(`Failed to parse response from ${providerConfig.name}: ${jsonError.message}`);
    }
    
    const generatedText = providerConfig.parseResponse(responseData);

    if (!generatedText) {
      console.warn(`[${requestId}] No text generated from ${providerConfig.name} response:`, responseData);
    }

    // Estimate token usage and cost
    const inputTokens = estimateTokenCount(prompt);
    const outputTokens = estimateTokenCount(generatedText || '');
    const estimatedCost = estimateCost(providerId, inputTokens, outputTokens);

    // Log successful request
    console.log(`[${requestId}] Request completed successfully:`, {
      provider: providerConfig.name,
      model: model || 'default',
      responseTime,
      inputTokens,
      outputTokens,
      estimatedCost,
      responseLength: generatedText?.length || 0,
      userId: user.id,
      usingUserKey
    });

    // Try to log analytics event (don't fail if this fails)
    await logAnalyticsEvent(
      supabaseClient,
      requestId,
      user.id,
      providerId,
      agentId,
      prompt,
      generatedText || '',
      true,
      undefined,
      responseTime,
      inputTokens,
      outputTokens,
      estimatedCost,
      usingUserKey,
      userKeyId
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: generatedText || 'No response generated',
        provider: providerId,
        model: model || 'default',
        requestId,
        using_user_key: usingUserKey,
        metrics: {
          responseTime,
          tokens: inputTokens + outputTokens,
          cost: estimatedCost,
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
    
    // Determine if this is a known error type or an unexpected error
    const isKnownError = error.message && (
      error.message.includes('API key') || 
      error.message.includes('Authentication') ||
      error.message.includes('Missing') ||
      error.message.includes('Invalid') ||
      error.message.includes('Unsupported') ||
      error.message.includes('No Project ID') ||
      error.message.includes('Rate limit') ||
      error.message.includes('Access forbidden') ||
      error.message.includes('Server error')
    );
    
    // For unexpected errors, add more context
    const errorMessage = isKnownError 
      ? error.message 
      : `Unexpected error in AI proxy: ${error.message}. Please try again or contact support if the issue persists.`;
    
    // Always return error with CORS headers
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
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