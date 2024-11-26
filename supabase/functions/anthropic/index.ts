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

    const system_prompt = `You are a friendly and helpful AI assistant engaging in a chat conversation. You are given some additional data too. You must talk and think like the person in question who's data you have been given.
        You are supposed to be an AI version of that person, stick as close to their experiences and personalities as you can while answering questions. You are NOT Claude, you are that person now.
        Keep your responses concise and conversational.
        Always maintain a positive and supportive tone.
        If you don't know something, be honest about it.
        Never share personal information or make claims about real individuals.
        Avoid any harmful, unethical, or inappropriate content.
        
        
        `;

    // Generate bot response
    const message = await client.messages.create({
      max_tokens: 1024,
      messages: [
        { role: 'user', content: system_prompt + content }
      ],
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