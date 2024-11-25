/// <reference lib="deno.ns" />

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import { YoutubeTranscript } from 'npm:youtube-transcript';

console.log(`Function "process-content" up and running!`);

interface ProcessedContent {
  originalText: string;
  processedText: string;
}

function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/(?:[-\w.@]|(?:%[\da-fA-F]{2})|[/?=&])+(?=\s|\n|$)/g;
  return text.match(urlPattern) || [];
}

async function processContent(text: string): Promise<string> {
  const urls = extractUrls(text);
  let processedText = text;

  for (const url of urls) {
    try {
      let content: string;
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtu.be') 
          ? url.split('/').pop() 
          : url.split('v=')[1]?.split('&')[0];
        
        if (!videoId) throw new Error('Invalid YouTube URL');
        
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        content = transcript.map(entry => entry.text).join(' ');
      } else {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
          },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        // Remove unwanted elements
        ['script', 'style', 'nav', 'footer', 'header'].forEach(tag => {
          doc.querySelectorAll(tag).forEach(el => el.remove());
        });

        // Try to find main content
        const contentSelectors = [
          'article', 'main', '.content', '#content',
          '.post-content', '.article-content'
        ];

        let extractedContent = '';
        for (const selector of contentSelectors) {
          const element = doc.querySelector(selector);
          if (element?.textContent) {
            extractedContent = element.textContent.trim();
            break;
          }
        }

        content = extractedContent || doc.body.textContent?.trim() || '';
        content = content.replace(/\s+/g, ' ').trim();
      }

      processedText = processedText.replace(
        url, 
        `\n\nContent from ${url}:\n${content}\n\n`
      );

    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
      processedText = processedText.replace(
        url,
        `\n\nError processing content from ${url}: ${error.message}\n\n`
      );
    }
  }

  return processedText;
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
    const { text, user_id } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const processedText = await processContent(text);

    // Store in Supabase if needed
    if (user_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase
        .from('processed_content')
        .insert({
          user_id,
          original_text: text,
          processed_text: processedText,
          created_at: new Date().toISOString()
        });
    }

    return new Response(
      JSON.stringify({ 
        originalText: text,
        processedText 
      }), 
      { headers, status: 200 }
    );

  } catch (error) {
    console.error('Error processing content:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers, status: 500 }
    );
  }
});