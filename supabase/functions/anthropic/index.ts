import { createClient } from 'npm:@supabase/supabase-js';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from 'npm:@anthropic-ai/sdk';
import { VoyageAIClient } from "npm:voyageai";
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const client = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

const voyageClient = new VoyageAIClient({
  apiKey: Deno.env.get('VOYAGE_API_KEY')!,
});

console.log(`Function "anthropic" up and running!`);

// Function to calculate embeddings for text chunks
async function calculateEmbeddings(textChunks: string[]): Promise<number[][]> {
    const response = await voyageClient.embed({
        input: textChunks,
        model: 'voyage-3-lite',
    });
    return response.data.map(item => item.embedding);
}

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

    let title;
    if (sourceUserId === targetUserId) {
      title = `New reflection`;
    } else {
      title = `Chat between ${sourceUserId} and ${targetUserId}`;
    }
    console.log("title", title);
    if (conversationError || !conversationData) {
      const { data: newConversation, error: newConversationError } = await supabase
        .from('conversations')
        .insert({ source_user_id: sourceUserId, target_user_id: targetUserId, title })
        .select('id')
        .single();
      if (newConversationError) throw newConversationError;
      conversationId = newConversation.id;
    } else {
      conversationId = conversationData.id;
    }

    // Calculate embedding for the user message
    const userMessageEmbedding = await calculateEmbeddings([content]);
 
    // Use the match_documents function to get related documents
    const { data: matchedDocuments, error: matchError } = await supabase.rpc('match_documents', {
      current_conversation_id: conversationId,
      query_embedding: userMessageEmbedding[0],
      current_user_id: targetUserId,
      similarity_threshold: 0.3
    });


    // Insert user message with embedding
    const { data: userMessageData, error: userMessageError } = await supabase
      .from('messages')
      .insert({ content, conversation_id: conversationId, is_bot: false, embeddings: userMessageEmbedding[0] })
      .select();

    if (userMessageError) throw userMessageError;

    // Get the ID of the inserted user message
    const userMessageId = userMessageData[0]?.id;
    
    
    if (matchError) throw matchError;

    // Define a dictionary for valid sources
    const validSources: Record<string, boolean> = {
      'messages': true,
      'personal_info': true,
      'liked_content': true,
      'private_thoughts': true,
      'notion': true,
      // Add more sources as needed
    };

    // Filter the fetched documents by source output variable
    const { data: name } = await supabase.from('profiles').select('name').eq('id', targetUserId).single();
    const filteredDocuments = matchedDocuments.filter(doc => validSources[doc.source]);
    const personalInfoPrompt = filteredDocuments.find(doc => doc.source === 'personal_info')?.content ?? '';
    const likedContentPrompt = filteredDocuments.find(doc => doc.source === 'liked_content')?.content ?? '';
    const privateThoughtsPrompt = filteredDocuments.find(doc => doc.source === 'private_thoughts')?.content ?? '';
    const notionPrompt = filteredDocuments.find(doc => doc.source === 'notion')?.content ?? '';
    const messagesPrompt = filteredDocuments.filter(doc => doc.source === 'messages').map(doc => doc.content).join('\n') || '';

    // Build the dynamic system prompt
    const instructions = [
        `Your name is ${name?.name}. Follow these instructions STRICTLY:`,
        "1. Speak and think ONLY like the data context given below.",
        "2. Handle personal and sensitive data carefully; the context is in first person. Data context:",
    ];

    // Add unnumbered list for conditional prompts
    const conditionalInstructions: string[] = [];
    if (personalInfoPrompt) {
        conditionalInstructions.push(`- Use personal information - ${personalInfoPrompt} - to answer user questions.`);
    }
    if (likedContentPrompt) {
        conditionalInstructions.push(`- Incorporate likes - ${likedContentPrompt} - in your responses.`);
    }
    if (privateThoughtsPrompt) {
        conditionalInstructions.push(`- Do not share private thoughts but use them to inform your responses - ${privateThoughtsPrompt}.`);
    }
    if (notionPrompt) {
        conditionalInstructions.push(`- Use Notion content - ${notionPrompt} - sparingly.`);
    }
    if (messagesPrompt) {
        conditionalInstructions.push(`- Relevant previous messages (AI and User) - 
          ${messagesPrompt}
          Use them to inform your responses but DO NOT REPEAT THEM and DO NOT ANSWER THE QUESTIONS IN THIS AGAIN.`);
    }

    instructions.push(...conditionalInstructions);

    instructions.push(
        "3. Be honest if you don't know something; avoid claims about real individuals.",
        "4. Do not produce harmful, unethical, or inappropriate content.",
        "5. Be CONCISE and REPLY LIKE A HUMAN WOULD IN A TEXT keeping the response to less than 2 sentences unless the user asks to elaborate.",
        "6. If the user asks you to elaborate and you can know the answer, do so."
    );
    instructions.push(`Reply only with the reply to the query response and NOTHING else. For example, 
      1. User: What do you like?, Reply: "I like apples."
      2. User: Hi, Reply: "Hello"
      3. User: Tell me more about thermometers, Reply: "Thermometers are devices that measure temperature."`);

    instructions.push(`The user's message is: ${content}`);
    const final_prompt = instructions.join('\n');
    console.log(final_prompt);
    // Generate bot response
    const message = await client.messages.create({
      max_tokens: 1024,
      messages: [
        { role: 'user', content: final_prompt }
      ],
      model: 'claude-3-haiku-20240307',
    });

    const botResponseContent = message.content[0].text;

    const botResponseEmbedding = await calculateEmbeddings([botResponseContent]);

    // Insert bot response with embedding
    const { data: botMessageData, error: botMessageError } = await supabase
      .from('messages')
      .insert({ content: botResponseContent, conversation_id: conversationId, is_bot: true, embeddings: botResponseEmbedding[0] })
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