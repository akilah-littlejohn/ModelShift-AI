/*
  # Create knowledge base processing function

  1. New Functions
    - `process_knowledge_base` - Processes a knowledge base by chunking its content
      - Parameters:
        - `kb_id` - Knowledge base ID to process
      - Returns: Number of chunks created
*/

-- Create a function to process a knowledge base
CREATE OR REPLACE FUNCTION process_knowledge_base(kb_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  kb record;
  chunk_size int := 1000; -- Default chunk size
  overlap int := 200; -- Default overlap between chunks
  chunk_count int := 0;
  content_text text;
  current_pos int := 1;
  chunk_text text;
BEGIN
  -- Get the knowledge base
  SELECT * INTO kb FROM knowledge_bases WHERE id = kb_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Knowledge base with ID % not found', kb_id;
  END IF;
  
  -- Update status to processing
  UPDATE knowledge_bases SET status = 'processing' WHERE id = kb_id;
  
  -- Process based on knowledge base type
  IF kb.type = 'text' THEN
    -- For text type, get the content from the metadata
    content_text := kb.metadata->>'text';
    
    -- Simple chunking by character count with overlap
    WHILE current_pos <= length(content_text) LOOP
      -- Extract chunk
      chunk_text := substring(content_text from current_pos for chunk_size);
      
      -- Insert chunk
      INSERT INTO document_chunks (knowledge_base_id, content, metadata)
      VALUES (kb_id, chunk_text, jsonb_build_object(
        'position', current_pos,
        'chunk_number', chunk_count + 1
      ));
      
      chunk_count := chunk_count + 1;
      current_pos := current_pos + chunk_size - overlap;
      
      -- Avoid infinite loop for very short texts
      IF current_pos <= 1 THEN
        EXIT;
      END IF;
    END LOOP;
    
  ELSIF kb.type = 'url' OR kb.type = 'document' THEN
    -- For URL and document types, the content should already be in document_chunks
    -- Just count how many chunks we have
    SELECT COUNT(*) INTO chunk_count FROM document_chunks WHERE knowledge_base_id = kb_id;
    
    -- If no chunks, create a placeholder with error
    IF chunk_count = 0 THEN
      UPDATE knowledge_bases 
      SET status = 'error', error_message = 'No content found to process'
      WHERE id = kb_id;
      RETURN 0;
    END IF;
  ELSE
    -- Unsupported type
    UPDATE knowledge_bases 
    SET status = 'error', error_message = 'Unsupported knowledge base type'
    WHERE id = kb_id;
    RETURN 0;
  END IF;
  
  -- Update knowledge base with chunk count
  UPDATE knowledge_bases 
  SET chunk_count = chunk_count
  WHERE id = kb_id;
  
  -- If all chunks have embeddings, mark as ready
  IF NOT EXISTS (
    SELECT 1 FROM document_chunks 
    WHERE knowledge_base_id = kb_id AND embedding IS NULL
  ) THEN
    UPDATE knowledge_bases SET status = 'ready' WHERE id = kb_id;
  END IF;
  
  RETURN chunk_count;
END;
$$;