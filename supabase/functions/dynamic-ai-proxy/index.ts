import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers must be included in all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DynamicProviderRequest {
  // Provider config passed from frontend
  providerConfig: {
    id: string;
    name: string;
    apiConfig: {
      baseUrl: string;
      endpointPath: string;
      method: string;
      headers: Record<string, string>;
      authHeaderName?: string;
      authHeaderPrefix?: string;
      apiKeyInUrlParam?: boolean;
      urlParamName?: string;
      requestBodyStructure: any;
      promptJsonPath: string;
      modelJsonPath?: string;
      parametersJsonPath?: string;
      projectIdJsonPath?: string;
      responseJsonPath: string;
      errorJsonPath?: string;
    };
  };
  
  // Request data
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
  agentId?: string;
  userId?: string;
  
  // API keys (encrypted or from secure storage)
  apiKeys: Record<string, string>;
}

interface DynamicResponse {
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

// Utility functions for dynamic JSON path manipulation
function setValueAtPath(obj: any, path: string, value: any): any {
  const keys = path.split(/[.\[\]]+/).filter(Boolean);
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = isNaN(parseInt(keys[i + 1])) ? {} : [];
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

function getValueAtPath(obj: any, path: string): any {
  const keys = path.split(/[.\[\]]+/).filter(Boolean);
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

function mergeAtPath(obj: any, path: string, value: Record<string, any>): any {
  if (!path) {
    return { ...obj, ...value };
  }
  
  const existing = getValueAtPath(obj, path) || {};
  const merged = { ...existing, ...value };
  
  return setValueAtPath(JSON.parse(JSON.stringify(obj)), path, merged);
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
      console.error(`[${requestId}] Authentication failed:`, authError);
      throw new Error('Invalid authentication token');
    }

    console.log(`[${requestId}] Authenticated request from user: ${user.email}`);

    // Parse dynamic request
    const {
      providerConfig,
      prompt,
      model,
      parameters,
      agentId,
      userId,
      apiKeys
    }: DynamicProviderRequest = await req.json();

    // Validate request
    if (!providerConfig || !prompt || !apiKeys) {
      throw new Error('Missing required fields: providerConfig, prompt, and apiKeys');
    }

    // Verify user ID matches authenticated user
    if (userId && userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    const { apiConfig } = providerConfig;

    console.log(`[${requestId}] Making dynamic API call to ${providerConfig.name}`);

    // Build endpoint URL dynamically
    let endpoint = `${apiConfig.baseUrl}${apiConfig.endpointPath}`;
    
    // Handle API key in URL parameter (e.g., Gemini)
    if (apiConfig.apiKeyInUrlParam && apiConfig.urlParamName) {
      const separator = endpoint.includes('?') ? '&' : '?';
      endpoint += `${separator}${apiConfig.urlParamName}=${apiKeys.apiKey}`;
    }

    // Build headers dynamically
    const headers: Record<string, string> = { ...apiConfig.headers };
    
    // Add authentication header if not using URL parameter
    if (!apiConfig.apiKeyInUrlParam && apiConfig.authHeaderName) {
      const authValue = `${apiConfig.authHeaderPrefix || ''}${apiKeys.apiKey}`;
      headers[apiConfig.authHeaderName] = authValue;
    }

    // Build request body dynamically
    let requestBody = JSON.parse(JSON.stringify(apiConfig.requestBodyStructure));
    
    // Set the prompt
    requestBody = setValueAtPath(requestBody, apiConfig.promptJsonPath, prompt);
    
    // Set custom model if provided
    if (model && apiConfig.modelJsonPath) {
      requestBody = setValueAtPath(requestBody, apiConfig.modelJsonPath, model);
    }
    
    // Set project ID if required (IBM specific)
    if (apiConfig.projectIdJsonPath && apiKeys.projectId) {
      requestBody = setValueAtPath(requestBody, apiConfig.projectIdJsonPath, apiKeys.projectId);
    }
    
    // Merge custom parameters
    if (parameters && apiConfig.parametersJsonPath) {
      requestBody = mergeAtPath(requestBody, apiConfig.parametersJsonPath, parameters);
    } else if (parameters) {
      // If no specific path, merge at root level
      requestBody = { ...requestBody, ...parameters };
    }

    console.log(`[${requestId}] Request details:`, {
      endpoint,
      method: apiConfig.method,
      hasAuth: !!headers[apiConfig.authHeaderName || 'Authorization'],
      bodyKeys: Object.keys(requestBody)
    });

    // Make the dynamic API request
    const apiResponse = await fetch(endpoint, {
      method: apiConfig.method,
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;

    if (!apiResponse.ok) {
      let errorText = '';
      let errorDetails = null;
      
      try {
        const errorData = await apiResponse.json();
        
        // Try to extract error using dynamic path
        if (apiConfig.errorJsonPath) {
          const extractedError = getValueAtPath(errorData, apiConfig.errorJsonPath);
          if (extractedError) {
            errorText = extractedError;
          }
        }
        
        if (!errorText) {
          errorText = errorData.error?.message || errorData.message || `HTTP ${apiResponse.status}`;
        }
        
        errorDetails = errorData;
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
    
    // Extract response using dynamic path
    const generatedText = getValueAtPath(responseData, apiConfig.responseJsonPath);

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
        event_type: 'dynamic_proxy_call',
        provider_id: providerConfig.id,
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
          proxy_mode: true,
          dynamic_provider: true,
          provider_name: providerConfig.name
        },
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.warn(`[${requestId}] Failed to log analytics:`, logError);
      // Don't fail the request if logging fails
    }

    const response: DynamicResponse = {
      success: true,
      response: generatedText || 'No response generated',
      provider: providerConfig.id,
      model: model || 'default',
      metrics: {
        latency: responseTime,
        tokens: Math.ceil((prompt.length + (generatedText?.length || 0)) / 4),
        cost: 0 // Calculate based on provider pricing if available
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        dynamic_provider: true
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error(`[${requestId}] Dynamic AI Proxy error:`, error);
    
    // Always return error with CORS headers
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        provider: 'unknown',
        metrics: {
          latency: responseTime,
          tokens: 0,
          cost: 0
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          dynamic_provider: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});