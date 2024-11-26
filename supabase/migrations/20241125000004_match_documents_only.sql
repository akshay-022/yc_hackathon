CREATE OR REPLACE FUNCTION match_documents_only(
  query_embedding vector(512),  -- The embedding vector for the query
  current_user_id uuid                  -- The ID of the user to filter document chunks
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
    -- Fetch similar document chunks
    RETURN QUERY
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
      ORDER BY similarity DESC, chunks.created_at DESC
      LIMIT 10
    ) AS chunks_query;
END;
$$;
