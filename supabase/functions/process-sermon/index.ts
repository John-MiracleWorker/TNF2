import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

// OpenAI client
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
    
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const { sermon_id, file_path } = await req.json();
    
    if (!sermon_id || !file_path) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sermon_id and file_path are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client with admin rights to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Also initialize client with user rights from request token
    let supabaseClient;
    let userId = null;
    
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (token) {
      // Validate the token and get user
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }), 
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      
      // Create a client using the user's JWT for RLS
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_ANON_KEY') || '',
        {
          global: { headers: { Authorization: `Bearer ${token}` } }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // First, get the sermon record to confirm it exists and belongs to this user
    const { data: sermonData, error: sermonError } = await supabaseClient
      .from('sermon_summaries')
      .select('*')
      .eq('id', sermon_id)
      .single();
      
    if (sermonError) {
      return new Response(
        JSON.stringify({ error: `Sermon not found: ${sermonError.message}` }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Update processing status
    await supabaseAdmin
      .from('sermon_summaries')
      .update({ ai_context: { status: 'processing_started', step: 'started' } })
      .eq('id', sermon_id);
    
    // Download the audio/video file from Storage
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from('sermons')
      .download(file_path);
      
    if (fileError || !fileData) {
      await supabaseAdmin
        .from('sermon_summaries')
        .update({ ai_context: { status: 'error', error: `File download failed: ${fileError?.message}` } })
        .eq('id', sermon_id);
        
      return new Response(
        JSON.stringify({ error: `File download failed: ${fileError?.message}` }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Update processing status
    await supabaseAdmin
      .from('sermon_summaries')
      .update({ ai_context: { status: 'processing', step: 'file_downloaded' } })
      .eq('id', sermon_id);
    
    // Step 1: Transcribe audio using OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', new File([fileData], 'audio.mp3', { type: 'audio/mpeg' }));
    formData.append('model', 'whisper-1');
    
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      
      await supabaseAdmin
        .from('sermon_summaries')
        .update({ ai_context: { status: 'error', error: `Transcription failed: ${errorText}` } })
        .eq('id', sermon_id);
        
      return new Response(
        JSON.stringify({ error: `Transcription failed: ${errorText}` }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const transcriptionResult = await whisperResponse.json();
    const transcriptionText = transcriptionResult.text;
    
    // Update processing status
    await supabaseAdmin
      .from('sermon_summaries')
      .update({ 
        transcription_text: transcriptionText,
        ai_context: { status: 'processing', step: 'transcription_completed' } 
      })
      .eq('id', sermon_id);
    
    // Step 2: Use OpenAI GPT to analyze the transcription and generate summary and questions
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a theological assistant analyzing sermon transcripts. Create a well-structured response with three components: 1) A concise summary of the sermon (300-500 words), 2) Five key theological points or takeaways, and 3) Eight thought-provoking follow-up questions that would facilitate deeper discussion of the sermon\'s content. Format your response as JSON with keys "summary", "keyPoints", and "followUpQuestions".'
          },
          {
            role: 'user',
            content: `Here is the transcript of a sermon to analyze: ${transcriptionText}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });
    
    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      
      await supabaseAdmin
        .from('sermon_summaries')
        .update({ ai_context: { status: 'error', error: `AI analysis failed: ${errorText}` } })
        .eq('id', sermon_id);
        
      return new Response(
        JSON.stringify({ error: `AI analysis failed: ${errorText}` }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const gptResult = await gptResponse.json();
    const analysisContent = JSON.parse(gptResult.choices[0].message.content);
    
    // Extract the summary and questions from the AI response
    const summaryText = analysisContent.summary;
    const followUpQuestions = analysisContent.followUpQuestions;
    const keyPoints = analysisContent.keyPoints;
    
    // Step 3: Save the analysis results to the database
    const { error: updateError } = await supabaseAdmin
      .from('sermon_summaries')
      .update({
        summary_text: summaryText,
        follow_up_questions: followUpQuestions,
        ai_context: { 
          status: 'completed', 
          key_points: keyPoints,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', sermon_id);
    
    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to update sermon with analysis: ${updateError.message}` }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        sermon_id,
        summary: summaryText,
        questions: followUpQuestions,
        key_points: keyPoints
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in process-sermon:', error);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});