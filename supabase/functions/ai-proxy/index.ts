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
  projectId?: string; // For IBM WatsonX
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (optional, for RLS if needed, but not for API keys)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role key for server-side access
    );

    // Parse request body
    const { providerId, prompt, model, parameters, projectId }: RequestBody = await req.json();

    if (!providerId || !prompt) {
      throw new Error('Missing required fields: providerId and prompt');
    }

    let apiKey: string | undefined;
    let responseData: any;
    let endpoint: string;
    let headers: Record<string, string>;
    let body: Record<string, any>;

    switch (providerId) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY not set in Supabase secrets.');

        endpoint = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        };
        body = {
          model: model || 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
          ...parameters,
        };
        break;

      case 'gemini':
        apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY not set in Supabase secrets.');

        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;
        headers = {
          'Content-Type': 'application/json',
        };
        body = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            topP: 1,
            maxOutputTokens: 1000,
            ...parameters,
          },
        };
        break;

      case 'claude':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in Supabase secrets.');

        endpoint = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          // Note: 'anthropic-dangerous-direct-browser-access' header is not needed for server-side calls
        };
        body = {
          model: model || 'claude-3-sonnet-20240229',
          max_tokens: parameters?.max_tokens || 1000,
          messages: [{ role: 'user', content: prompt }],
          temperature: parameters?.temperature || 0.7,
          ...parameters,
        };
        break;

      case 'ibm':
        apiKey = Deno.env.get('IBM_API_KEY');
        const ibmProjectId = projectId || Deno.env.get('IBM_PROJECT_ID');
        if (!apiKey) throw new Error('IBM_API_KEY not set in Supabase secrets.');
        if (!ibmProjectId) throw new Error('IBM_PROJECT_ID not set in Supabase secrets or request.');

        endpoint = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        };
        body = {
          input: prompt,
          model_id: model || 'ibm/granite-13b-chat-v2',
          project_id: ibmProjectId,
          parameters: {
            temperature: 0.7,
            max_new_tokens: 500,
            ...parameters,
          },
        };
        break;

      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }

    console.log(`Making API call to ${providerId} at ${endpoint}`);

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      let errorText = '';
      try {
        errorText = await apiResponse.text();
      } catch (e) {
        errorText = `HTTP ${apiResponse.status}`;
      }
      
      console.error(`API call failed for ${providerId}: ${apiResponse.status} - ${errorText}`);
      
      // Enhanced error messages for common issues
      if (apiResponse.status === 401) {
        throw new Error(`Authentication failed for ${providerId}: Invalid API key`);
      } else if (apiResponse.status === 403) {
        throw new Error(`Access forbidden for ${providerId}: Check API key permissions`);
      } else if (apiResponse.status === 429) {
        throw new Error(`Rate limit exceeded for ${providerId}: Too many requests`);
      } else if (apiResponse.status >= 500) {
        throw new Error(`Server error for ${providerId}: Service temporarily unavailable`);
      } else {
        throw new Error(`API call failed for ${providerId}: ${errorText || `HTTP ${apiResponse.status}`}`);
      }
    }

    responseData = await apiResponse.json();

    let generatedText: string | undefined;
    switch (providerId) {
      case 'openai':
        generatedText = responseData?.choices?.[0]?.message?.content;
        break;
      case 'gemini':
        generatedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        break;
      case 'claude':
        generatedText = responseData?.content?.[0]?.text;
        break;
      case 'ibm':
        generatedText = responseData?.results?.[0]?.generated_text;
        break;
    }

    if (!generatedText) {
      console.warn(`No text generated from ${providerId} response:`, responseData);
      generatedText = 'No response generated';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: generatedText,
        provider: providerId,
        model: model || 'default'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('AI Proxy Edge Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        provider: 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});