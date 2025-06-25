import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1';
import { ChatOpenAI } from 'https://esm.sh/langchain@0.1.23/chat_models/openai?deps=langsmith@0.1.67';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder
} from 'https://esm.sh/langchain@0.1.23/prompts?deps=langsmith@0.1.67';
import { LLMChain } from 'https://esm.sh/langchain@0.1.23/chains?deps=langsmith@0.1.67';

// Build CORS headers dynamically so Authorization can be sent cross‑origin
function buildCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
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

  // -------------------- LLM call ----------------------------------------
  const llm = new ChatOpenAI({
    openAIApiKey,
    modelName: 'gpt-4o',
    temperature: 0.9,
    streaming: true,
    callbacks: [{ handleLLMNewToken: async (token: string) => await sendEvent({ content: token }) }]
  });

  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
    new MessagesPlaceholder('previousMessages'),
    HumanMessagePromptTemplate.fromTemplate('{{humanMessage}}'),
  ]);
  const chain = new LLMChain({ llm, prompt });

  try {
    await chain.invoke({ previousMessages, humanMessage: message, userContext });
    await sendEvent({ done: true });
  } catch (err: any) {
    await sendEvent({ error: 'Failed to generate response', details: err.message });
  } finally {
    await writer.close();
  }

  return response;
});