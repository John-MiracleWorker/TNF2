import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') as string;
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { channelId } = await req.json();

  if (!channelId) {
    return new Response(JSON.stringify({ error: 'channelId is required' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10&type=video&eventType=completed`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API Error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from YouTube API', details: errorText }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    const data = await response.json();

    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: new Date(item.snippet.publishedAt),
      thumbnail: item.snippet.thumbnails.high.url,
    }));

    return new Response(JSON.stringify({ videos }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Consider restricting this in production
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching past videos:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});