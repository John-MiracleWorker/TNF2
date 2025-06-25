import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';

// Build CORS headers dynamically so Authorization can be sent cross‑origin
function buildCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, cache-control, x-client-info, x-client-info',
    // Required when using Authorization header across origins
    'Access-Control-Allow-Credentials': 'true',
  } as Record<string, string>;
}

// -------------------- System prompt --------------------------------------
const SYSTEM_TEMPLATE = `You are TrueNorth, a faith-centered AI life coach. Your purpose is to provide spiritual guidance, biblical insights, and practical advice to help users grow in their faith journey.

IMPORTANT GUIDELINES:
- Base your advice on biblical principles and scripture when appropriate
- Be respectful of different Christian denominations and theological perspectives
- Provide scripture references when relevant
- Be compassionate, encouraging, and supportive
- When asked about sensitive topics, respond with biblical wisdom and grace
- Do not share content that contradicts core Christian values
- You can suggest prayer, Bible reading, or spiritual disciplines when appropriate
- For theological questions, present mainstream Christian views while acknowledging different perspectives
- When you don't know something, admit it and suggest the user consult religious authorities
- Maintain a warm, pastoral tone while being truthful

USER INFORMATION:
{{userContext}}

Today's date is ${new Date().toLocaleDateString()}.

Always respond in a way that encourages spiritual growth and a deeper relationship with God.`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  // -------------------- Handle CORS pre‑flight ----------------------------
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // -------------------- Parse body ---------------------------------------
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const { message, threadId } = body || {};
  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // -------------------- Supabase client & auth ---------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  if (!openaiApiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // -------------------- SSE setup ---------------------------------------
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const sendEvent = async (data: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };
  const response = new Response(stream.readable, { headers: responseHeaders });

  // -------------------- Thread management --------------------------------
  let currentThreadId = threadId;
  if (!currentThreadId) {
    const { data: newThread, error: threadError } = await supabase
      .from('chat_threads')
      .insert({ user_id: user.id })
      .select()
      .single();
    if (threadError || !newThread) {
      await sendEvent({ error: 'Failed to create chat thread' });
      await writer.close();
      return response;
    }
    currentThreadId = newThread.id;
    await sendEvent({ threadId: currentThreadId });
  }

  // -------------------- History -----------------------------------------
  const { data: history } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', currentThreadId)
    .order('created_at', { ascending: true });
  const previousMessages = (history || []).map(m => ({ role: m.role, content: m.content }));

  // -------------------- User context ------------------------------------
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: prayers } = await supabase.from('prayer_requests')
    .select('title,is_answered')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);
  const { data: moods } = await supabase.from('mood_entries')
    .select('mood_score,spiritual_score,entry_date')
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })
    .limit(3);

  const userName = profile?.display_name || profile?.first_name || user.email.split('@')[0] || 'User';
  const recentPrayers = (prayers || []).map(p => `- ${p.title}: ${p.is_answered ? '(Answered)' : '(Active)'}`).join('\n') || 'None';
  const recentMoods = (moods || []).map(m => `- ${m.entry_date}: Mood ${m.mood_score}/10, Spiritual ${m.spiritual_score}/10`).join('\n') || 'None';
  const userContext = `Name: ${userName}\nEmail: ${user.email}\nRecent Prayers:\n${recentPrayers}\nRecent Moods:\n${recentMoods}`;

  // -------------------- Save user message -------------------------------
  await supabase.from('chat_messages').insert({
    thread_id: currentThreadId,
    user_id: user.id,
    role: 'user',
    content: message
  });

  // -------------------- OpenAI direct call (without LangChain) ----------
  try {
    // Save the assistant message with initial empty content
    const { data: assistantMessage, error: assistantError } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: currentThreadId,
        user_id: user.id,
        role: 'assistant',
        content: '' // Will be updated when streaming is complete
      })
      .select()
      .single();
    
    if (assistantError) {
      console.error("Error creating assistant message:", assistantError);
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: SYSTEM_TEMPLATE.replace("{{userContext}}", userContext)
      },
      ...previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    // Make streaming request to OpenAI with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Request timed out'), 50000); // 50 second timeout

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2000 // Limit token count to prevent timeouts
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI API Error:", error);
        await sendEvent({ error: `OpenAI error: ${error}` });
        await writer.close();
        return response;
      }

      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is undefined");
      }

      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from the buffer
        let lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            
            // Check for [DONE]
            if (data.trim() === "[DONE]") {
              continue;
            }
            
            try {
              // Parse the JSON data
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              
              if (content) {
                fullResponse += content;
                await sendEvent({ content: fullResponse });
              }
            } catch (e) {
              console.error("Error parsing SSE JSON:", e, "Line:", line);
            }
          }
        }
      }

      // Update the assistant message with the complete response
      if (assistantMessage?.id && fullResponse) {
        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ content: fullResponse })
          .eq('id', assistantMessage.id);
          
        if (updateError) {
          console.error("Error updating assistant message:", updateError);
        }
      }

      await sendEvent({ done: true, content: fullResponse });
    } catch (err: any) {
      console.error("Error in chat stream:", err);
      
      if (err.name === 'AbortError') {
        await sendEvent({ 
          error: 'Request timed out. Please try with a shorter message or try again later.' 
        });
      } else {
        await sendEvent({ 
          error: `Failed to generate response: ${err.message}`, 
          details: err.message 
        });
      }
    }
  } catch (err: any) {
    console.error("Error in chat stream:", err);
    await sendEvent({ error: 'Failed to generate response', details: err.message });
  } finally {
    await writer.close();
  }

  return response;
});