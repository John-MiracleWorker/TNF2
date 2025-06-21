// Supabase Edge Function for monitoring livestreams
// This function can be triggered by a cron job to check if registered streams have ended
// and then start sermon processing for them

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

// Configuration
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

serve(async (req) => {
  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    // For security, ensure this is a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if the YouTube API key is configured
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'YouTube API key not configured' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
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
        
        // Step 2: Find most recent completed livestream
        const recentStreamResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&channelId=${channelId}&eventType=completed&type=video&` +
          `order=date&maxResults=1&key=${YOUTUBE_API_KEY}`
        );
        
        if (!recentStreamResponse.ok) {
          results.push({
            channelId,
            status: 'error',
            message: `YouTube API error: ${await recentStreamResponse.text()}`
          });
          continue;
        }
        
        const recentStreamData = await recentStreamResponse.json();
        
        if (!recentStreamData.items || recentStreamData.items.length === 0) {
          results.push({
            channelId,
            status: 'no_streams',
            message: 'No completed livestreams found'
          });
          continue;
        }
        
        const mostRecentStream = recentStreamData.items[0];
        const videoId = mostRecentStream.id.videoId;
        
        // Step 3: Check if this stream was published recently (within the CHECK_INTERVAL)
        const publishTime = new Date(mostRecentStream.snippet.publishedAt).getTime();
        const currentTime = Date.now();
        
        // Skip if the stream was not recently ended, unless force is true
        if (!forceProcess && currentTime - publishTime > CHECK_INTERVAL) {
          results.push({
            channelId,
            status: 'skipped',
            message: 'Most recent stream was not published recently',
            videoId,
            publishTime: mostRecentStream.snippet.publishedAt
          });
          continue;
        }
        
        // Step 4: Check if we've already processed this video
        const { data: existingSermon, error: sermonCheckError } = await supabaseAdmin
          .from('sermon_summaries')
          .select('id, title')
          .eq('video_url', `https://www.youtube.com/watch?v=${videoId}`)
          .maybeSingle();
        
        if (existingSermon) {
          results.push({
            channelId,
            status: 'already_processed',
            message: 'This livestream has already been processed',
            videoId,
            sermonId: existingSermon.id
          });
          continue;
        }
        
        // Step 5: Call the process-livestream function to process this video
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
              manual: false
            })
          }
        );
        
        if (!processResponse.ok) {
          results.push({
            channelId,
            status: 'processing_error',
            message: `Failed to process livestream: ${await processResponse.text()}`,
            videoId
          });
          continue;
        }
        
        const processResult = await processResponse.json();
        
        results.push({
          channelId,
          status: 'processing_started',
          message: 'Sermon processing has been started',
          videoId,
          sermonId: processResult.sermon_id,
          details: processResult
        });
        
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
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in livestream-monitor:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});