// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { VoyageAIClient } from "npm:voyageai";
import { corsHeaders } from '../_shared/cors.ts'
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const client = new VoyageAIClient({
  apiKey: Deno.env.get('VOYAGE_API_KEY')!,
});

// Utility function to split text into chunks of a specified size
function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
console.log(`Function "voyager" up and running!`)
// Function to insert document and chunks into Supabase
async function insertDocumentAndChunks(texts: string[]) {
  const documentId = await insertDocument();

  const results = [];
  for (const text of texts) {
    const textChunks = chunkText(text, 5000);
    for (let i = 0; i < textChunks.length; i++) {
      const data = await client.embed({
        input: textChunks[i],
        model: 'voyage-3-lite', // Use the model passed from the request
      });

      // Store the chunk, its embedding, and its index
      results.push({
        document_id: documentId,
        content: textChunks[i],
        embeddings: data, // Assuming data contains the embedding
        chunk_index: i,
      });
    }
  }

  // Insert all chunks into Supabase
  const { error } = await supabase.from('chunks').insert(results);
  if (error) throw error;
}

// Function to insert a document
async function insertDocument(source: string) {
  const { data, error } = await supabase
    .from('documents')
    .insert({ scrape_source: source })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

Deno.serve(async (req) => {
  // Set CORS headers
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json', // Ensure the content type is set
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers,
    });
  }
  const { texts } = await req.json(); // Expect userId to be passed in the request

  try {
    await insertDocumentAndChunks(texts); // Call the new function to handle everything
    return new Response(JSON.stringify({ message: 'Documents and chunks added successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}); 