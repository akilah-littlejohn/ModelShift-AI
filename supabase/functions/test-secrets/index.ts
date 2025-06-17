import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TestSecretsRequest {
  providers: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { providers }: TestSecretsRequest = await req.json();

    const results: Record<string, any> = {};

    for (const provider of providers) {
      switch (provider) {
        case 'openai':
          const openaiKey = Deno.env.get('OPENAI_API_KEY');
          results.openai = {
            configured: !!openaiKey,
            success: !!openaiKey,
            message: openaiKey ? 'API key configured' : 'API key not set'
          };
          break;

        case 'anthropic':
          const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
          results.anthropic = {
            configured: !!anthropicKey,
            success: !!anthropicKey,
            message: anthropicKey ? 'API key configured' : 'API key not set'
          };
          break;

        case 'gemini':
          const geminiKey = Deno.env.get('GEMINI_API_KEY');
          results.gemini = {
            configured: !!geminiKey,
            success: !!geminiKey,
            message: geminiKey ? 'API key configured' : 'API key not set'
          };
          break;

        case 'ibm':
          const ibmKey = Deno.env.get('IBM_API_KEY');
          const ibmProjectId = Deno.env.get('IBM_PROJECT_ID');
          results.ibm = {
            configured: !!(ibmKey && ibmProjectId),
            success: !!(ibmKey && ibmProjectId),
            message: (ibmKey && ibmProjectId) ? 'API key and project ID configured' : 
                    !ibmKey ? 'API key not set' : 'Project ID not set'
          };
          break;

        default:
          results[provider] = {
            configured: false,
            success: false,
            message: 'Unknown provider'
          };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Test secrets error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});