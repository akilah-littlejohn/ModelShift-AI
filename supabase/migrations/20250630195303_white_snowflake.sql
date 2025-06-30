/*
  # Create vector similarity search function

  1. New Functions
    - `match_document_chunks` - Performs vector similarity search on document chunks
      - Parameters:
        - `query_embedding` - The embedding vector to match against
        - `match_threshold` - Similarity threshold (0.0 to 1.0)
        - `match_count` - Maximum number of results to return
        - `kb_id` - Knowledge base ID to search within
      - Returns: Array of matching document chunks with similarity scores
*/

-- Create a function to match document chunks using vector similarity
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  kb_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  knowledge_base_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    document_chunks.knowledge_base_id,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 
    document_chunks.embedding IS NOT NULL
    AND (kb_id IS NULL OR document_chunks.knowledge_base_id = kb_id)
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create a function to increment the chunk count for a knowledge base
CREATE OR REPLACE FUNCTION increment_chunk_count(kb_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE knowledge_bases
  SET chunk_count = chunk_count + 1
  WHERE id = kb_id;
END;
$$;