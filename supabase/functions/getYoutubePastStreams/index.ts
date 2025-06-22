// Supabase Edge Function to fetch past livestreams for a YouTube channel
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Configuration
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders, // Use the defined headers
      });
    }

    // For security, ensure this is a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        }
      );
    }

    // Check if the YouTube API key is configured
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'YouTube API key not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        }
      );
    }

    // Get channelId from the request body
    const requestData = await req.json().catch(() => ({}));
    const channelId = requestData.channelId;

    if (!channelId) {
      return new Response(
        JSON.stringify({
          error: 'Missing channelId in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        }
      );
    }

    // Fetch completed livestreams
    const youtubeApiUrl =
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&channelId=${channelId}&eventType=completed&type=video&` +
      `order=date&maxResults=50&key=${YOUTUBE_API_KEY}`; // Increased maxResults for more videos

    const youtubeResponse = await fetch(youtubeApiUrl);

    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      console.error(`YouTube API error: ${youtubeResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch videos from YouTube API',
          details: errorText,
        }),
        {
          status: youtubeResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
        }
      );
    }

    const youtubeData = await youtubeResponse.json();

    // Process and return the list of videos
    const pastStreams = youtubeData.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.medium.url, // Or default, high depending on preference
    }));

    return new Response(
      JSON.stringify({
        success: true,
        channelId,
        pastStreams,
        count: pastStreams.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
      }
    );
  } catch (error) {
    console.error('Error in getYoutubePastStreams:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: {},
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Include CORS headers
      }
    );
  }
});