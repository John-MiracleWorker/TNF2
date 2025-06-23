// Supabase Edge Function for fetching past videos from a YouTube channel

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Configuration
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';

serve(async (req) => {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }

    // Only allow POST method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the YouTube API key is configured
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    // Parse request body
    const { channelId } = await req.json().catch(() => ({}));

    if (!channelId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: channelId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch videos from YouTube Data API
    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&key=${YOUTUBE_API_KEY}`
    );

    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      return new Response(
        JSON.stringify({ error: `YouTube API error: ${errorText}` }),
        { status: youtubeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const youtubeData = await youtubeResponse.json();

    // Return the list of videos
    return new Response(
      JSON.stringify({
        success: true,
        videos: youtubeData.items || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-past-videos:', error);

    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});