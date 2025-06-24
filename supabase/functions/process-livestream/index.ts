// Supabase Edge Function for processing YouTube livestreams after they end
// This function is designed to be triggered either:
// 1. By a scheduled job after a stream ends
// 2. By a manual trigger or webhook from YouTube

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

// Configuration
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds between retries

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
    
    // Only allow POST method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const { channelId, videoId, manual = false } = await req.json();
    
    // Either channelId or videoId must be provided
    if (!channelId && !videoId) {
      return new Response(
        JSON.stringify({ error: 'Either channelId or videoId must be provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client with admin rights
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Also get user from the request if available
    let userId = null;
    
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (token) {
      // Validate the token and get user
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        userId = user.id;
      }
    }
    
    // Get the video to process
    let targetVideoId = videoId;
    
    // If videoId wasn't provided but channelId was, find the latest completed livestream
    if (!targetVideoId && channelId) {
      try {
        // Get the most recent completed livestream for this channel
        const recentStreamResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&channelId=${channelId}&eventType=completed&type=video&` +
          `order=date&maxResults=1&key=${YOUTUBE_API_KEY}`
        );
        
        if (!recentStreamResponse.ok) {
          throw new Error(`YouTube API error: ${await recentStreamResponse.text()}`);
        }
        
        const recentStreamData = await recentStreamResponse.json();
        
        if (recentStreamData.items && recentStreamData.items.length > 0) {
          targetVideoId = recentStreamData.items[0].id.videoId;
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'No completed livestreams found for this channel',
              details: 'Try again later or specify a videoId' 
            }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (apiError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch livestream from YouTube API',
            details: apiError.message
          }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Now that we have the video ID, check if it's already been processed
    const { data: existingSermon, error: sermonCheckError } = await supabaseAdmin
      .from('sermon_summaries')
      .select('id, title')
      .eq('video_url', `https://www.youtube.com/watch?v=${targetVideoId}`)
      .maybeSingle();
    
    if (existingSermon) {
      // Trigger process-sermon again for existing sermons, in case it failed previously
      console.log(`Retriggering processing for existing sermon ID: ${existingSermon.id}`);
      const processSermonResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-sermon`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Pass the user's token if available
          },
          body: JSON.stringify({
            sermon_id: existingSermon.id,
            // Simulating a file path for demonstration
            file_path: `sermons/${existingSermon.id}.mp3`, 
          }),
        }
      );

      if (!processSermonResponse.ok) {
        const errorText = await processSermonResponse.text();
        console.error(`Failed to reprocess sermon ${existingSermon.id}:`, errorText);
        return new Response(
          JSON.stringify({ 
            error: `Failed to reprocess existing sermon: ${errorText}`,
            sermon_id: existingSermon.id
          }), 
          { status: processSermonResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const processSermonResult = await processSermonResponse.json();

      return new Response(
        JSON.stringify({ 
          message: 'This livestream has already been processed, re-triggered analysis.',
          sermon_id: existingSermon.id,
          title: existingSermon.title,
          analysis_status: processSermonResult
        }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get video details from YouTube
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `part=snippet,contentDetails&id=${targetVideoId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!videoResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch video details from YouTube API',
          details: await videoResponse.text()
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const videoData = await videoResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Video not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const videoDetails = videoData.items[0];
    const videoTitle = videoDetails.snippet.title;
    const videoDescription = videoDetails.snippet.description;
    const publishedAt = videoDetails.snippet.publishedAt;
    
    // Create a new sermon summary record
    const { data: newSermon, error: createError } = await supabaseAdmin
      .from('sermon_summaries')
      .insert([
        {
          user_id: userId || (await getAdminUserId(supabaseAdmin)), // Fall back to an admin user
          title: videoTitle,
          description: videoDescription,
          sermon_date: new Date(publishedAt).toISOString().split('T')[0],
          video_url: `https://www.youtube.com/watch?v=${targetVideoId}`,
          ai_context: {
            status: 'processing_started',
            step: 'created_from_livestream',
            source: manual ? 'manual_trigger' : 'automated_monitoring',
            youtube_video_id: targetVideoId
          }
        }
      ])
      .select()
      .single();
    
    if (createError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create sermon record',
          details: createError.message
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Simulate the audio file path
    const simulatedFilePath = `sermons/${newSermon.id}.mp3`;

    // Immediately trigger the process-sermon function with the new sermon_id and simulated file_path
    const processSermonResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-sermon`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Pass the user's token if available
        },
        body: JSON.stringify({
          sermon_id: newSermon.id,
          file_path: simulatedFilePath,
        }),
      }
    );

    if (!processSermonResponse.ok) {
      const errorText = await processSermonResponse.text();
      console.error(`Failed to trigger process-sermon for new sermon ${newSermon.id}:`, errorText);
      // Update sermon record with error status
      await supabaseAdmin
        .from('sermon_summaries')
        .update({ 
          ai_context: { 
            status: 'error', 
            error: `Failed to trigger AI analysis: ${errorText}` 
          } 
        })
        .eq('id', newSermon.id);

      return new Response(
        JSON.stringify({ 
          error: `Failed to trigger AI analysis for new sermon: ${errorText}`,
          sermon_id: newSermon.id
        }), 
        { status: processSermonResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const processSermonResult = await processSermonResponse.json();

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sermon record created and AI analysis triggered',
        sermon_id: newSermon.id,
        video_id: targetVideoId,
        analysis_status: processSermonResult
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in process-livestream:', error);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get an admin user ID if no user is provided
async function getAdminUserId(supabaseAdmin: any): Promise<string> {
  // Try to find an admin user
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .limit(1)
    .single();
  
  if (data?.id) {
    return data.id;
  }
  
  // If no admin found, get the first user
  const { data: firstUser } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .limit(1)
    .single();
  
  if (firstUser?.id) {
    return firstUser.id;
  }
  
  throw new Error('No users found in the system');
}