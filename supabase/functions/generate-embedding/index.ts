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