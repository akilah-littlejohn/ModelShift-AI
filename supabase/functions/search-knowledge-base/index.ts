import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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