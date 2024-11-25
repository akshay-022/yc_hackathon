/// <reference lib="deno.ns" />

import { corsHeaders } from '../_shared/cors.ts'
import { YoutubeTranscript } from 'npm:youtube-transcript';

console.log(`Function "youtube" up and running!`)

function extractVideoId(url: string): string {
  try {
    if (url.includes('youtu.be')) {
      return url.split('/').pop() || '';
    } else if (url.includes('youtube.com')) {
      return url.split('v=')[1]?.split('&')[0] || '';
    }
    throw new Error('Invalid YouTube URL');
  } catch (error) {
    throw new Error(`Error extracting video ID: ${error.message}`);
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
    const { url } = await req.json();
    if (!url) {
      throw new Error('URL is required');
    }

    const videoId = extractVideoId(url);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(entry => entry.text).join(' ');

    return new Response(
      JSON.stringify({ transcript: transcriptText }), 
      { headers, status: 200 }
    );

  } catch (error) {
    console.error('Error processing YouTube transcript:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers, status: 500 }
    );
  }
});