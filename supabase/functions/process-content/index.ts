/// <reference lib="deno.ns" />

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import { YoutubeTranscript } from 'npm:youtube-transcript';
import { google } from 'npm:googleapis';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

console.log(`Function "process-content" up and running!`);

interface ProcessedContent {
  originalText: string;
  processedText: string;
}

function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/(?:[-\w.@]|(?:%[\da-fA-F]{2})|[/?=&])+(?=\s|\n|$)/g;
  return text.match(urlPattern) || [];
}

async function getYoutubeVideoDetails(videoId: string): Promise<string> {
  const youtube = google.youtube('v3');
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');

  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  try {
    // Get video details
    const videoResponse = await youtube.videos.list({
      key: apiKey,
      part: ['snippet'],
      id: [videoId],
    });

    const video = videoResponse.data.items?.[0];
    if (!video) {
      throw new Error('Video not found');
    }

    // Get video comments (optional)
    const commentsResponse = await youtube.commentThreads.list({
      key: apiKey,
      part: ['snippet'],
      videoId: videoId,
      maxResults: 25,
      order: 'relevance',
    });

    const comments = commentsResponse.data.items || [];

    // Combine video information
    const videoInfo = [
      `Title: ${video.snippet?.title || 'No title'}`,
      `Description: ${video.snippet?.description || 'No description'}`,
      '\nTop Comments:',
      ...comments.map(comment => 
        `- ${comment.snippet?.topLevelComment?.snippet?.textDisplay || ''}`
      ).slice(0, 5)
    ].join('\n');

    return videoInfo;

  } catch (error) {
    console.error('YouTube API Error:', error);
    throw new Error(`Failed to fetch YouTube video data: ${error.message}`);
  }
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
        
        // Use new YouTube data fetching function
        content = await getYoutubeVideoDetails(videoId);
      } else {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
          },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        
        if (!doc) throw new Error("Failed to parse HTML");

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

        content = extractedContent || doc.body?.textContent?.trim() || '';
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