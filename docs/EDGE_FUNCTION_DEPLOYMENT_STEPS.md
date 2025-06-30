# Edge Function Deployment Steps

## Step-by-Step Instructions

### 1. Deploy the AI Proxy Function

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it `ai-proxy`
5. Copy and paste the following code:

```typescript
import { serve } from "https://deno.land/std@0.224.2/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

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
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] Received request: ${req.method} ${req.url}`);
    
    // Log request headers (without authorization token)
    const headers = Object.fromEntries(req.headers.entries());
    const safeHeaders = { ...headers };
    if (safeHeaders.authorization) {
      safeHeaders.authorization = 'Bearer [REDACTED]';
    }
    console.log(`[${requestId}] Request headers:`, safeHeaders);

    // Initialize Supabase client for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Supabase configuration missing`);
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.');
    }
    
    console.log(`[${requestId}] Initializing Supabase client with URL: ${supabaseUrl.substring(0, 20)}...`);
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    console.log(`[${requestId}] Auth header present: ${!!authHeader}`);
    
    const user = await verifyAuthentication(authHeader, supabaseClient);
    console.log(`[${requestId}] Authenticated user: ${user.id} (${user.email})`);

    // Parse request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json();
      console.log(`[${requestId}] Request body:`, {
        providerId: requestBody.providerId,
        promptLength: requestBody.prompt?.length,
        model: requestBody.model,
        hasParameters: !!requestBody.parameters,
        agentId: requestBody.agentId,
        userId: requestBody.userId,
        useUserKey: requestBody.useUserKey
      });
    } catch (error) {
      console.error(`[${requestId}] Failed to parse request body:`, error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body. Please provide a valid JSON payload.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Validate request body
    const validationError = validateRequest(requestBody);
    if (validationError) {
      console.error(`[${requestId}] Request validation failed: ${validationError}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: validationError 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { providerId, prompt, model, parameters, agentId, userId, useUserKey = true } = requestBody;

    // Verify user ID matches authenticated user
    if (userId && userId !== user.id) {
      console.error(`[${requestId}] User ID mismatch: ${userId} vs ${user.id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User ID mismatch. The provided userId does not match the authenticated user.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle health check
    if (providerId === 'health-check') {
      console.log(`[${requestId}] Processing health check request`);
      
      // For health check, we don't need to check for API keys
      // Just return the status of the service
      return new Response(
        JSON.stringify({
          success: true,
          configuredProviders: [],
          errors: [],
          requestId,
          serverInfo: {
            timestamp: new Date().toISOString(),
            environment: Deno.env.get('ENVIRONMENT') || 'production',
            version: '1.0.1',
            byokEnabled: true
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
      console.error(`[${requestId}] Unsupported provider: ${providerId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unsupported provider: ${providerId}. Available providers are: ${Object.keys(PROVIDERS).join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the user's API key for this provider
    let apiKey: string | null = null;
    let userKeyId: string | null = null;
    let usingUserKey = true;

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
        throw new Error(`No API key found for ${providerConfig.name}. Please add your API key in the API Keys section.`);
      } else {
        try {
          console.log(`[${requestId}] Found user API key:`, {
            keyId: userKeys[0].id,
            provider: userKeys[0].provider_id,
            name: userKeys[0].name,
            isActive: userKeys[0].is_active,
            createdAt: userKeys[0].created_at
          });
          
          apiKey = decrypt(userKeys[0].encrypted_key);
          userKeyId = userKeys[0].id;
          
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
      console.error(`[${requestId}] Error in user key lookup:`, error);
      
      // Return a clear error message to the user
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message || `No API key found for ${providerConfig.name}. Please add your API key in the API Keys section.`,
          provider: providerId,
          requestId,
          metrics: {
            responseTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check additional requirements (e.g., IBM Project ID)
    let projectId: string | null = null;
    
    if (providerConfig.requiresProjectId) {
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
        } else {
          console.error(`[${requestId}] No Project ID found for ${providerConfig.name}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `No Project ID found for ${providerConfig.name}. Please add your Project ID in the API Keys section.`,
              provider: providerId,
              requestId,
              metrics: {
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
              }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } catch (error) {
        console.error(`[${requestId}] Error in project ID lookup:`, error);
        throw new Error(`Error accessing your IBM Project ID: ${error.message}`);
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

    console.log(`[${requestId}] Request details:`, {
      endpoint: endpoint.split('?')[0], // Don't log API key in URL
      method: 'POST',
      headers: Object.keys(headers),
      bodyKeys: Object.keys(requestBody)
    });

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
      
      console.log(`[${requestId}] API response status:`, apiResponse.status);
      console.log(`[${requestId}] API response headers:`, Object.fromEntries(apiResponse.headers.entries()));
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      console.error(`[${requestId}] Fetch error:`, fetchError);
      
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Request to ${providerConfig.name} timed out after 60 seconds. The service may be experiencing high load.`,
            provider: providerId,
            requestId,
            metrics: {
              responseTime: Date.now() - startTime,
              timestamp: new Date().toISOString()
            }
          }),
          { 
            status: 408, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Network error when calling ${providerConfig.name} API: ${fetchError.message}`,
          provider: providerId,
          requestId,
          metrics: {
            responseTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const responseTime = Date.now() - startTime;

    if (!apiResponse.ok) {
      let errorText = '';
      let errorData = null;
      
      try {
        const responseText = await apiResponse.text();
        console.log(`[${requestId}] Error response body:`, responseText.substring(0, 500));
        
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
      let errorMessage = '';
      if (apiResponse.status === 401) {
        errorMessage = `Authentication failed for ${providerConfig.name}: Invalid API key. Please check your API key and try again.`;
      } else if (apiResponse.status === 403) {
        errorMessage = `Access forbidden for ${providerConfig.name}: Your API key doesn't have permission for this operation. Please check your API key permissions.`;
      } else if (apiResponse.status === 429) {
        errorMessage = `Rate limit exceeded for ${providerConfig.name}: Too many requests in a short period. Please try again later or upgrade your API plan.`;
      } else if (apiResponse.status >= 500) {
        errorMessage = `Server error for ${providerConfig.name}: The service is temporarily unavailable. Please try again later.`;
      } else {
        errorMessage = `API call failed for ${providerConfig.name}: ${errorText}`;
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          provider: providerId,
          requestId,
          metrics: {
            responseTime,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: apiResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let responseData;
    try {
      responseData = await apiResponse.json();
      console.log(`[${requestId}] API response data keys:`, Object.keys(responseData));
    } catch (jsonError) {
      console.error(`[${requestId}] Failed to parse JSON response:`, jsonError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to parse response from ${providerConfig.name}: ${jsonError.message}`,
          provider: providerId,
          requestId,
          metrics: {
            responseTime,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
```

6. Click **Deploy**

### 2. Deploy the Generate Embedding Function

1. Go back to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it `generate-embedding`
4. Copy and paste the following code:

```typescript
import { serve } from "https://deno.land/std@0.224.2/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Processing embedding request`);

    // Parse request body
    const { textToEmbed, chunkId, knowledgeBaseId } = await req.json();

    // Validate required parameters
    if (!textToEmbed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: textToEmbed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] Authentication failed:`, authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Authenticated user:`, user.id);

    // Get OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not set in environment variables.');
    }

    console.log(`[${requestId}] Generating embedding for text of length:`, textToEmbed.length);

    // Call OpenAI Embedding API
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: textToEmbed,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.json();
      console.error(`[${requestId}] OpenAI API error:`, errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    console.log(`[${requestId}] Successfully generated embedding vector of length:`, embedding.length);

    // Store embedding in database
    let updateResult;
    
    if (chunkId) {
      // Update specific chunk if chunkId is provided
      console.log(`[${requestId}] Updating embedding for chunk:`, chunkId);
      
      const { data, error } = await supabaseClient
        .from('document_chunks')
        .update({ embedding: embedding })
        .eq('id', chunkId)
        .select();

      if (error) {
        console.error(`[${requestId}] Supabase update error:`, error);
        throw new Error(`Supabase update error: ${error.message}`);
      }
      
      updateResult = { updated: true, chunkId, data };
    } else if (knowledgeBaseId) {
      // Update all chunks for a knowledge base if knowledgeBaseId is provided
      console.log(`[${requestId}] Processing all chunks for knowledge base:`, knowledgeBaseId);
      
      // First, get all chunks without embeddings for this knowledge base
      const { data: chunks, error: fetchError } = await supabaseClient
        .from('document_chunks')
        .select('id, content')
        .eq('knowledge_base_id', knowledgeBaseId)
        .is('embedding', null)
        .limit(1); // Process one at a time to avoid timeouts
      
      if (fetchError) {
        console.error(`[${requestId}] Error fetching chunks:`, fetchError);
        throw new Error(`Error fetching chunks: ${fetchError.message}`);
      }
      
      if (chunks && chunks.length > 0) {
        const chunk = chunks[0];
        console.log(`[${requestId}] Updating embedding for chunk:`, chunk.id);
        
        const { data, error } = await supabaseClient
          .from('document_chunks')
          .update({ embedding: embedding })
          .eq('id', chunk.id)
          .select();
          
        if (error) {
          console.error(`[${requestId}] Supabase update error:`, error);
          throw new Error(`Supabase update error: ${error.message}`);
        }
        
        // Update knowledge base chunk count
        await supabaseClient.rpc('increment_chunk_count', { kb_id: knowledgeBaseId });
        
        updateResult = { 
          updated: true, 
          chunkId: chunk.id, 
          knowledgeBaseId,
          remainingChunks: chunks.length - 1,
          data 
        };
      } else {
        // No more chunks to process, update knowledge base status to ready
        const { error: updateError } = await supabaseClient
          .from('knowledge_bases')
          .update({ status: 'ready' })
          .eq('id', knowledgeBaseId);
          
        if (updateError) {
          console.error(`[${requestId}] Error updating knowledge base status:`, updateError);
          throw new Error(`Error updating knowledge base status: ${updateError.message}`);
        }
        
        updateResult = { 
          updated: false, 
          knowledgeBaseId, 
          message: 'No chunks left to process. Knowledge base marked as ready.' 
        };
      }
    } else {
      throw new Error('Either chunkId or knowledgeBaseId must be provided');
    }

    console.log(`[${requestId}] Embedding operation completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Embedding generated and stored', 
        result: updateResult,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          embeddingDimensions: embedding.length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-embedding Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

5. Click **Deploy**

### 3. Deploy the Search Knowledge Base Function

1. Go back to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it `search-knowledge-base`
4. Copy and paste the following code:

```typescript
import { serve } from "https://deno.land/std@0.224.2/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Processing search request`);

    // Parse request body
    const { query, knowledgeBaseId, limit = 5, similarityThreshold = 0.7 } = await req.json();

    // Validate required parameters
    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!knowledgeBaseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: knowledgeBaseId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Edge Function secrets.');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] Authentication failed:`, authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Authenticated user:`, user.id);

    // Get OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not set in environment variables.');
    }

    console.log(`[${requestId}] Generating embedding for query:`, query);

    // Generate embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.json();
      console.error(`[${requestId}] OpenAI API error:`, errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log(`[${requestId}] Successfully generated query embedding`);

    // Verify knowledge base exists and belongs to user
    const { data: knowledgeBase, error: kbError } = await supabaseClient
      .from('knowledge_bases')
      .select('id, name, user_id, status')
      .eq('id', knowledgeBaseId)
      .eq('user_id', user.id)
      .single();

    if (kbError || !knowledgeBase) {
      console.error(`[${requestId}] Knowledge base not found or access denied:`, kbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Knowledge base not found or access denied' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (knowledgeBase.status !== 'ready') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Knowledge base is not ready for search. Current status: ${knowledgeBase.status}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Searching knowledge base:`, knowledgeBaseId);

    // Perform vector similarity search
    const { data: searchResults, error: searchError } = await supabaseClient.rpc(
      'match_document_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: limit,
        kb_id: knowledgeBaseId
      }
    );

    if (searchError) {
      console.error(`[${requestId}] Search error:`, searchError);
      throw new Error(`Search error: ${searchError.message}`);
    }

    console.log(`[${requestId}] Search completed. Found ${searchResults?.length || 0} results`);

    // Return search results
    return new Response(
      JSON.stringify({ 
        success: true, 
        results: searchResults || [],
        metadata: {
          knowledgeBase: {
            id: knowledgeBase.id,
            name: knowledgeBase.name
          },
          query,
          limit,
          similarityThreshold,
          resultCount: searchResults?.length || 0,
          requestId,
          timestamp: new Date().toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-knowledge-base Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

5. Click **Deploy**

### 4. Deploy the Dynamic AI Proxy Function

1. Go back to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it `dynamic-ai-proxy`
4. Copy and paste the code from `supabase/functions/dynamic-ai-proxy/index.ts` in your project
5. Click **Deploy**

### 5. Configure API Keys as Secrets

1. In the Supabase Dashboard, go to **Settings** → **API**
2. Scroll down to the **Project API keys** section
3. Find the **Secrets** section
4. Add your API keys as secrets with the following names:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `ANTHROPIC_API_KEY` - Your Anthropic Claude API key
   - `IBM_API_KEY` - Your IBM WatsonX API key
   - `IBM_PROJECT_ID` - Your IBM WatsonX Project ID

## Testing the Deployment

After deploying the Edge Functions, you can test them in the application:

1. Go to **Settings** → **Connection Mode**
2. Select **Server Proxy Mode**
3. Click **Check Status**
4. You should see "Server connected" if everything is working correctly

If you encounter any issues, you can use Direct Browser Mode as a fallback:

1. Go to **Settings** → **Connection Mode**
2. Select **Direct Browser Mode**
3. Add your API keys in the **API Keys** section
4. The application will make API calls directly from your browser