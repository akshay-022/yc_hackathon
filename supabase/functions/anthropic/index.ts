
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const client = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});
console.log(`Function "anthropic" up and running!`)
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

  const { content } = await req.json();

  try {
    const message = await client.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
      model: 'claude-3-haiku-20240307',
    });

    return new Response(JSON.stringify(message), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching from Anthropic API:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from Anthropic API' }), { status: 500 });
  }
}); 