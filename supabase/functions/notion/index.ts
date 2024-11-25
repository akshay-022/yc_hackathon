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

async function getNotionPages(databaseId: string): Promise<NotionPage[]> {
  try {
    const pages = [];
    let cursor: string | undefined;
    
    while (true) {
      const { results, next_cursor } = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
      });
      
      pages.push(...results);
      
      if (!next_cursor) break;
      cursor = next_cursor;
    }
    
    return pages;
  } catch (error) {
    console.error('Error fetching Notion pages:', error);
    throw error;
  }
}

async function processPage(page: NotionPage, userId: string) {
  // Get page content
  const blocks = await getPageBlocks(page.id);
  const content = await extractContent(blocks);
  
  // Call the voyage function to process content
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/voyage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: [content],
      userId: userId,
      source: `notion-${page.id}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to process page with voyage: ${response.statusText}`);
  }

  return await response.json();
}

async function getPageBlocks(pageId: string) {
  const blocks = [];
  let cursor: string | undefined;
  
  while (true) {
    const { results, next_cursor } = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    
    blocks.push(...results);
    
    if (!next_cursor) break;
    cursor = next_cursor;
  }
  
  return blocks;
}

async function extractContent(blocks: any[]): Promise<string> {
  let content = '';
  
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      content += block.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
    }
    // Add other block types as needed
  }
  
  return content;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { database_id, user_id } = await req.json();

    if (!database_id || !user_id) {
      throw new Error('Missing required parameters');
    }

    const pages = await getNotionPages(database_id);
    const results = [];

    for (const page of pages) {
      const result = await processPage(page, user_id);
      results.push(result);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notion sync completed successfully', 
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in notion_sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});