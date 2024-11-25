import { createClient } from 'npm:@supabase/supabase-js';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const client = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

console.log(`Function "anthropic" up and running!`);

Deno.serve(async (req) => {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  const { content, sourceUserId, targetUserId, conversationId: initialConversationId } = await req.json();
  
  let conversationId = initialConversationId;

  try {
    // Create or get existing conversation
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('target_user_id', targetUserId)
      .eq('source_user_id', sourceUserId)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversationData) {
      const { data: newConversation, error: newConversationError } = await supabase
        .from('conversations')
        .insert({ source_user_id: sourceUserId, target_user_id: targetUserId })
        .select('id')
        .single();
      if (newConversationError) throw newConversationError;
      conversationId = newConversation.id;
    } else {
      conversationId = conversationData.id;
    }

    // Insert user message
    const { data: userMessageData, error: userMessageError } = await supabase
      .from('messages')
      .insert({ content, conversation_id: conversationId, is_bot: false })
      .select();

    if (userMessageError) throw userMessageError;

    // Get the ID of the inserted user message
    const userMessageId = userMessageData[0]?.id;

    // Generate bot response
    const message = await client.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
      model: 'claude-3-haiku-20240307',
    });

    const botResponseContent = message.content[0].text;

    // Insert bot response
    const { data: botMessageData, error: botMessageError } = await supabase
      .from('messages')
      .insert({ content: botResponseContent, conversation_id: conversationId, is_bot: true })
      .select();

    if (botMessageError) throw botMessageError;

    // Get the ID of the inserted bot response
    const botMessageId = botMessageData[0]?.id;

    return new Response(JSON.stringify({ botResponseContent, conversationId, userMessageId, botMessageId }), { status: 200, headers });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}); 