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
console.log(`Function "voyage" up and running!`)

// Function to insert document and chunks into Supabase
async function insertDocumentAndChunks(texts: string[], userId: string, source: string) {
  const summary = texts.join(' '); // Create a summary from the texts
  const documentId = await insertDocument(userId, source, summary); // Insert document and get its ID

  const results = [];
  const allTextChunks: string[] = []; // Array to hold all text chunks

  for (const text of texts) {
    const textChunks = chunkText(text, 5000);
    allTextChunks.push(...textChunks); // Add all chunks to the array
  }

  // Send all text chunks at once
  const response = await client.embed({
    input: allTextChunks, // Send all chunks in one request
    model: 'voyage-3-lite', // Use the model passed from the request
  });

  // Extract embeddings from the response
  const embeddings = response.data.map(item => item.embedding); // Get the embedding arrays

  // Store the chunk, its embedding, and its index
  for (let i = 0; i < allTextChunks.length; i++) {
    results.push({
      document_id: documentId,
      content: allTextChunks[i],
      embeddings: embeddings[i], // Use the extracted embeddings
      chunk_index: i,
    });
  }

  // Insert all results into Supabase
  const { error } = await supabase.from('chunks').insert(results);
  if (error) throw error;

  // Return the newly created document
  return await getDocumentById(documentId);
}

// Function to insert a document
async function insertDocument(userId: string, source: string, summary: string) {
  const { data, error } = await supabase
    .from('documents')
    .insert({ scrape_source: source, user_id: userId, summary: summary })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// Function to get a document by ID
async function getDocumentById(documentId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*') // Select all fields
    .eq('id', documentId)
    .single();
  if (error) throw error;
  return data; // Return the document data
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
  
  const { content, userId, source } = await req.json(); // Expect userId to be passed in the request

  try {
    const document = await insertDocumentAndChunks(content, userId, source); // Call the new function to handle everything
    return new Response(JSON.stringify({ message: 'Documents and chunks added successfully', document: document }), { status: 200, headers });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}); 