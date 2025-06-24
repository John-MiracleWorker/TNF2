import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

// OpenAI client
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
    const requestBody = await req.json();
    console.log('Received request body:', requestBody); // Add this log
    const { sermon_id, file_path } = requestBody; // Use the parsed body
    
    if (!sermon_id || !file_path) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: sermon_id and file_path are required",
          received_body: requestBody // Include the received body in the error for debugging
        }),
        {
          status: 400,
          headers: {
          'Content-Type': 'application/json',
 'Access-Control-Allow-Origin': 'https://find-true-north.net'
        } }
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
          JSON.stringify({ error: "Invalid authentication" }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' } }
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
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' },
        }
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

        {
          status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' },

        }
      );
    }
    
    // Update processing status
    await supabaseAdmin
      .from('sermon_summaries')
      .update({ ai_context: { status: "processing_started", step: "started" } })
      .eq('id', sermon_id);
    
    // Download the audio/video file from Storage
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from('sermons')
      .download(file_path);
      
    if (fileError || !fileData) {
      await supabaseAdmin
        .from('sermon_summaries')
        .update({
          ai_context: {
            status: "error",
            error: `File download failed: ${fileError?.message}`,
          },
        })
        .eq('id', sermon_id);

      return new Response(
        JSON.stringify({ error: `File download failed: ${fileError?.message}` }),

        {
          status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' },

          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update processing status
    await supabaseAdmin
      .from("sermon_summaries")
      .update({ ai_context: { status: "processing", step: "file_downloaded" } })
      .eq("id", sermon_id);
    
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
    
    if (!whisperResponse.ok) { // Moved the enhanced error handling here
 let errorBody;
      try {
 errorBody = await whisperResponse.json(); // Try parsing as JSON
      } catch {
 errorBody = await whisperResponse.text(); // Fallback to text if JSON parsing fails
      }

      await supabaseAdmin
        .from('sermon_summaries')
        .update({
          ai_context: {
            status: "error",
            error: `Transcription failed: ${
              typeof errorBody === "object" ? JSON.stringify(errorBody) : errorBody
            }`,
          },
        })
        .eq('id', sermon_id);

      return new Response(
        JSON.stringify({
          error: `Transcription failed: ${
            typeof errorBody === "object" ? JSON.stringify(errorBody) : errorBody
          }`,
        }),
        {
          status: whisperResponse.status, // Use the actual status code
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const transcriptionResult = await whisperResponse.json();
    const transcriptionText = transcriptionResult.text;
    
    // Update processing status
    await supabaseAdmin
      .from('sermon_summaries')
      .update({ 
        transcription_text: transcriptionText,
        ai_context: { status: "processing", step: "transcription_completed" }
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
            content: 'You are a theological assistant analyzing sermon transcripts. Create a well-structured JSON response with the following keys: "summary" (a concise summary of the sermon, 300-500 words), "keyPoints" (five key theological points or takeaways), "applicationToFaith" (how the sermon applies to a user's daily faith walk), "biblicalThemes" (a list of core biblical themes discussed), "biblicalCharacters" (a list of biblical characters mentioned), "historicalContext" (any relevant historical context discussed), and "followUpQuestions" (eight thought-provoking follow-up questions for deeper discussion).'
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
 let errorBody;
      try {
 errorBody = await gptResponse.json(); // Try parsing as JSON
      } catch {
 errorBody = await gptResponse.text(); // Fallback to text if JSON parsing fails
      }

      await supabaseAdmin
        .from('sermon_summaries')
        .update({
          ai_context: {
            status: "error",
            error: `AI analysis failed: ${
              typeof errorBody === "object" ? JSON.stringify(errorBody) : errorBody
            }`,
          },
        })
        .eq('id', sermon_id);

      return new Response(
        JSON.stringify({
          error: `AI analysis failed: ${
            typeof errorBody === "object" ? JSON.stringify(errorBody) : errorBody
          }`,
        }),
        {
          status: gptResponse.status, // Use the actual status code
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const gptResult = await gptResponse.json();
    const analysisContent = JSON.parse(gptResult.choices[0].message.content);
    
    // Extract the analysis results from the AI response
    const summaryText = analysisContent.summary;
    const keyPoints = Array.isArray(analysisContent.keyPoints) ? analysisContent.keyPoints : [];
    const applicationToFaith = analysisContent.applicationToFaith || '';
    const biblicalThemes = Array.isArray(analysisContent.biblicalThemes) ? analysisContent.biblicalThemes : [];
    const biblicalCharacters = Array.isArray(analysisContent.biblicalCharacters) ? analysisContent.biblicalCharacters : [];
    const historicalContext = analysisContent.historicalContext || '';
    let followUpQuestions;
    if (Array.isArray(analysisContent.followUpQuestions)) {
 followUpQuestions = analysisContent.followUpQuestions;
    } else if (typeof analysisContent.followUpQuestions === 'string') {
 // If it's a string, try to parse it as a JSON array
      try {
 followUpQuestions = JSON.parse(analysisContent.followUpQuestions);
      } catch (e) {
        console.error('Failed to parse followUpQuestions string:', analysisContent.followUpQuestions, e);
 followUpQuestions = []; // Default to empty array on error
      }
    } else {
 followUpQuestions = []; // Default to empty array if not array or string
    }

    
    // Step 3: Save the analysis results to the database
    const { error: updateError } = await supabaseAdmin
      .from('sermon_summaries')
      .update({
        summary_text: summaryText,
        key_points: keyPoints, // Now a direct field
        application_to_faith: applicationToFaith,
        biblical_themes: biblicalThemes,
        biblical_characters: biblicalCharacters,
        historical_context: historicalContext,
        follow_up_questions: followUpQuestions,
        ai_context: { 
          status: 'completed', 
          completed_at: new Date().toISOString()
        } // Removed key_points from here
      })
      .eq('id', sermon_id);
    
    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to update sermon with analysis: ${updateError.message}` }),

        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' } }
      );
    }
    
    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        sermon_id,
        summary: summaryText,
        key_points: keyPoints,
        application_to_faith: applicationToFaith,
        biblical_themes: biblicalThemes,
        biblical_characters: biblicalCharacters,
        historical_context: historicalContext,
        questions: followUpQuestions,
      }), 
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' },
      }
    );
    
  } catch (error) {
    console.error('Error in process-sermon:', error);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://find-true-north.net' }
      }
    );
  }
});