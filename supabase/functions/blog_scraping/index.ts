/// <reference lib="deno.ns" />

import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function "scraper" up and running!`);

interface UrlContent {
  url: string;
  content: string;
}

async function scrapeWebpage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScraperBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Create a DOM parser (available in Deno)
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Remove unwanted elements
    ['script', 'style', 'nav', 'footer', 'header'].forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Try to find main content
    const contentSelectors = [
      'article',
      'main',
      '.content',
      '#content',
      '.post-content',
      '.article-content',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent) {
        content = element.textContent.trim();
        break;
      }
    }

    // Fallback to body if no content found
    if (!content) {
      content = doc.body.textContent?.trim() || '';
    }

    // Clean up whitespace
    return content.replace(/\s+/g, ' ').trim();

  } catch (error) {
    throw new Error(`Error scraping ${url}: ${error.message}`);
  }
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
    const { urls } = await req.json();
    
    if (!Array.isArray(urls)) {
      throw new Error('URLs must be provided as an array');
    }

    const results: UrlContent[] = await Promise.all(
      urls.map(async (url: string) => {
        try {
          const content = await scrapeWebpage(url);
          return { url, content };
        } catch (error) {
          return { url, content: `Error: ${error.message}` };
        }
      })
    );

    return new Response(
      JSON.stringify({ results }), 
      { headers, status: 200 }
    );

  } catch (error) {
    console.error('Error processing URLs:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers, status: 500 }
    );
  }
});