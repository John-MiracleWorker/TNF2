import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

serve(async (req) => {
  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      return new Response("ok", {
        headers: {
          'Access-Control-Allow-Origin': 'https://find-true-north.net',
          'Access-Control-Allow-Methods': "POST, OPTIONS",
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://find-true-north.net'
          },
        }
      );
    }

    // Parse request body
    const { youtube_url } = await req.json();

    if (!youtube_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: youtube_url is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://find-true-north.net'
          },
        }
      );
    }

    // Initialize Supabase client with admin rights to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Step 1: Download YouTube video/audio (Placeholder)
    // You will need to use a library or external service here to download the video/audio stream from youtube_url

    // Step 2: Upload to Supabase Storage (Placeholder)
    // Upload the downloaded video/audio file to your 'sermons' storage bucket
    // Get the file path after upload

    // Step 3: Create sermon entry in database (Placeholder)
    // Insert a new row into the 'sermon_summaries' table
    // Include the user_id (get from auth token), title (maybe extract or use placeholder), and the file path from Step 2
    // Get the new sermon_id

    // Step 4: Trigger process-sermon function (Placeholder)
    // Call your process-sermon Supabase Edge Function with the new sermon_id and file path
    // You'll likely need to include the user's auth token in this call as well

    // Example success response - adjust based on actual implementation
    return new Response(
      JSON.stringify({
        success: true,
        message: 'YouTube video ingestion process started.',
        // Include sermon ID or other relevant info if available after step 3
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://find-true-north.net'
        },
      }
    );

  } catch (error) {
    console.error('Error in ingest-youtube-video:', error);

    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://find-true-north.net'
        },
      }
    );
  }
});