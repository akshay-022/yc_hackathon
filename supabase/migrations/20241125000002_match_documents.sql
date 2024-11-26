CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(512),  -- The embedding vector for the query
  current_conversation_id bigint,       -- The ID of the conversation to filter messages
  current_user_id uuid,                  -- The ID of the user to filter document chunks
  similarity_threshold float              -- The threshold for similarity score
)
RETURNS TABLE (
  id bigint,                    -- The ID of the matched message or document
  content text,                 -- The content of the matched message or document
  similarity float,             -- The similarity score of the match
  source text                   -- Source of the content ('messages' or scrape source)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  (
    -- Fetch similar messages
    SELECT *
    FROM (
      SELECT 
        messages.id,
        CASE
          WHEN messages.is_bot THEN 'AI: ' || messages.content
          ELSE 'User: ' || messages.content
        END AS content,
        1 - (messages.embeddings <=> query_embedding) AS similarity,
        'messages' AS source
      FROM messages
      WHERE messages.conversation_id = current_conversation_id
        AND messages.is_bot = false
        AND (1 - (messages.embeddings <=> query_embedding)) > similarity_threshold
      ORDER BY similarity DESC, messages.created_at DESC 
      LIMIT 3
    ) AS messages_query

    UNION ALL

    -- Fetch similar document chunks
    SELECT *
    FROM (
      SELECT 
        chunks.id,
        chunks.content,
        1 - (chunks.embeddings <=> query_embedding) AS similarity,
        documents.scrape_source AS source
      FROM chunks AS chunks
      JOIN documents AS documents ON chunks.document_id = documents.id
      WHERE documents.user_id = current_user_id
        AND documents.scrape_source IN ('personal_info', 'liked_content', 'private_thoughts', 'notion')
        AND (1 - (chunks.embeddings <=> query_embedding)) > similarity_threshold
      ORDER BY similarity DESC, chunks.created_at DESC
      LIMIT 10
    ) AS chunks_query
  );
END;
$$;
