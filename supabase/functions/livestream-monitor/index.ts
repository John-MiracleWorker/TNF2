// Supabase Edge Function for monitoring livestreams
// This function can be triggered by a cron job to check if registered streams have ended
// and then start sermon processing for them

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

// Configuration
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

serve(async (req) => {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', // Added GET for potential future use, though POST is primary
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders // Use the defined headers
      });
    }

    // For security, ensure this is a POST request
    if (req.method !== 'POST') {
 return new Response(JSON.stringify({ // Ensure CORS headers are included for non-POST methods too
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } // Include CORS headers
      });
    }

    // Check if the YouTube API key is configured
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({
        error: 'YouTube API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } // Include CORS headers
      });
    }

    // Get the list of channels to monitor
    // This could come from a database or from the request
    const requestData = await req.json().catch(() => ({}));
    let channelIds = requestData.channelIds || [];
    let forceProcess = requestData.force || false;

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // If no channels were specified, try to get them from the database
    if (channelIds.length === 0) {
      // This would be a table where you store channel IDs to monitor
      const { data: channels, error } = await supabaseAdmin
        .from('monitored_channels')
        .select('channel_id, platform')
        .eq('is_active', true);

      if (!error && channels && channels.length > 0) {
        channelIds = channels.filter(c => c.platform === 'youtube').map(c => c.channel_id);
      }

      // If still empty, use a default for demo
      if (channelIds.length === 0) {
        // UC_MfzsWz_0AclQlrl1h_dwg is just an example channel ID
        channelIds = ['UC_MfzsWz_0AclQlrl1h_dwg'];
      }
    }

    const results = [];

    // Process each channel
    for (const channelId of channelIds) {
      try {
        // Step 1: Check if the channel was live but is now offline
        // First, check if it's currently live
        const liveCheckResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`
        );

        if (!liveCheckResponse.ok) {
          results.push({
            channelId,
            status: 'error',
            message: `YouTube API error: ${await liveCheckResponse.text()}`
          });
          continue;
        }

        const liveData = await liveCheckResponse.json();

        // If the channel is currently live, skip it
        if (liveData.items && liveData.items.length > 0) {
          results.push({
            channelId,
            status: 'live',
            message: 'Channel is currently live'
          });
          continue;
        }

        // Step 2: Find recent videos
        const recentVideosResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&channelId=${channelId}&type=video&` + // Removed eventType=completed
          `order=date&maxResults=50&key=${YOUTUBE_API_KEY}` // Changed maxResults to 50
        );

        if (!recentStreamResponse.ok) {
          results.push({
 channelId,
 status: 'error',
 message: `YouTube API error: ${await recentVideosResponse.text()}`
          });
          continue;
        }

        const recentStreamData = await recentVideosResponse.json();
        
        if (!recentStreamData.items || recentStreamData.items.length === 0) {
          results.push({
            channelId,
            status: 'no_streams',
            message: 'No completed livestreams found'
          });
          continue;
        }

        // Step 3: Iterate through recent videos and process if not already done
        for (const item of recentStreamData.items) {
          const videoId = item.id.videoId;

          // Check if we've already processed this video
          const { data: existingSermon, error: sermonCheckError } = await supabaseAdmin
            .from('sermon_summaries')
            .select('id, title')
            .eq('video_url', `https://www.youtube.com/watch?v=${videoId}`)
            .maybeSingle();

          if (existingSermon) {
            results.push({
              channelId,
              status: 'already_processed',
              message: 'This video has already been processed',
              videoId,
              sermonId: existingSermon.id
            });
            continue; // Skip to the next video
          }

          // If not processed, call the process-livestream function
          // We add a small delay to avoid hitting rate limits if processing many videos at once
          // await new Promise(resolve => setTimeout(resolve, 1000)); // Optional: Add a delay

          const processResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-livestream`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // No user token here as this is a system process
              },
              body: JSON.stringify({
                videoId,
                channelId,
                manual: false // Indicates this is an automated process
              })
            }
          );

          if (!processResponse.ok) {
            const errorText = await processResponse.text();
            console.error(`Failed to process video ${videoId}:`, errorText);

            // Optionally update the sermon_summaries entry if it was created in process-livestream
            // to reflect the processing error. This might require fetching the record first.

            results.push({
              channelId,
              status: 'processing_error',
              message: `Failed to process video ${videoId}: ${errorText}`,
              videoId
            });
            // Continue to the next video even if one fails
            continue;
          }

          const processResult = await processResponse.json();

          results.push({
            channelId,
            status: 'processing_error',
            message: `Failed to process livestream: ${await processResponse.text()}`,
            videoId
          });
          continue; // This was processing_started message
          results.push({
 channelId,
 status: 'processing_started',
 message: 'Sermon processing has been started',
 videoId,
 sermonId: processResult.sermon_id,
 details: processResult
          });
        }

      } catch (channelError) {
        results.push({
          channelId,
          status: 'error',
          message: `Error processing channel: ${channelError.message}`
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      processed: results.filter(r => r.status === 'processing_started').length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } // Include CORS headers
    });

  } catch (error) {
    console.error('Error in livestream-monitor:', error);

    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } // Include CORS headers
    });
  }
});
