import { createClient } from 'npm:@supabase/supabase-js';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const { user_id, content, conversation_id = null } = await req.json();

    // Validate required fields
    if (!user_id || !content) {
      throw new Error('Missing required fields: user_id and content are required');
    }

    // Call the anthropic edge function
    const { data: responseData, error: responseError } = await supabase.functions.invoke('anthropic', {
      body: { 
        content,
        sourceUserId: null,  // null for public chat
        targetUserId: user_id,
        conversationId: conversation_id  // Will be null if not provided in request
      }
    });

    if (responseError) throw responseError;

    return new Response(
      JSON.stringify({
        reply: {
          content: responseData.botResponseContent,
          conversation_id: responseData.conversationId,
          is_bot: true,
          created_at: new Date().toISOString()
        }
      }),
      { headers }
    );

  } catch (error) {
    console.error('Error in public chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
});