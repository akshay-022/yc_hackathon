import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { createClient } from 'npm:@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Notion and Supabase clients
const notion = new Client({
  auth: Deno.env.get('NOTION_TOKEN')!,
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

console.log(`Function "notion_sync" up and running!`)

interface NotionPage {
  id: string;
  properties: {
    [key: string]: any;
  };
}

async function getAllPagesAndDatabases(): Promise<string[]> {
  try {
    const pages: string[] = [];
    let nextCursor: string | undefined;

    while (true) {
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        start_cursor: nextCursor,
        page_size: 100,
      });

      for (const page of response.results) {
        const pageText = await extractTextFromBlocks(page.id);
        if (pageText.trim().length > 0) {
          pages.push(pageText);
        }
      }

      if (!response.has_more) break;
      nextCursor = response.next_cursor;
    }

    return pages;
  } catch (error) {
    console.error('Error fetching Notion pages:', error);
    throw error;
  }
}

async function extractTextFromBlocks(blockId: string): Promise<string> {
  const textContent: string[] = [];
  let nextCursor: string | undefined;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: nextCursor,
      page_size: 100,
    });

    for (const block of response.results) {
      const blockType = block.type;
      if (['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item'].includes(blockType)) {
        const richText = block[blockType]?.rich_text || [];
        const text = richText.map((t: any) => t.plain_text || '').join(' ');
        if (text) {
          textContent.push(text);
        }
      }

      // Recursively get text from child blocks
      if (block.has_children) {
        const childText = await extractTextFromBlocks(block.id);
        if (childText) {
          textContent.push(childText);
        }
      }
    }

    if (!response.has_more) break;
    nextCursor = response.next_cursor;
  }

  return textContent.join(' ');
}

Deno.serve(async (req) => {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error('Missing user_id');
    }

    // Get the user's Notion token from Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notion_access_token')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.notion_access_token) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Notion token not found. Please reconnect your Notion account.' 
        }),
        { headers, status: 400 }
      );
    }

    // Initialize Notion client with user's token
    const notion = new Client({
      auth: profile.notion_access_token,
    });

    console.log('Fetching Notion pages...');
    const pages = await getAllPagesAndDatabases();
    console.log(`Found ${pages.length} pages`);

    if (pages.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No Notion pages found',
          pages_processed: 0 
        }),
        { headers, status: 200 }
      );
    }

    const allContent = pages.join('\n\n');
    console.log('Processing content...');

    // Process the content using voyage function
    const processResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/voyage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: allContent,
        userId: user_id,
        source: 'notion'
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error('Voyage processing error:', errorText);
      throw new Error(`Failed to process content: ${errorText}`);
    }

    const result = await processResponse.json();
    console.log('Content processed successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Notion sync completed successfully',
        pages_processed: pages.length,
        result
      }),
      { headers, status: 200 }
    );

  } catch (error) {
    console.error('Error in notion sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { headers, status: 500 }
    );
  }
});