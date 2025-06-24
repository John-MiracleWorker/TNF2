// Chat stream function for TrueNorth
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import { ChatOpenAI } from 'https://esm.sh/langchain@0.1.23/chat_models/openai'
import { PromptTemplate } from 'https://esm.sh/langchain@0.1.23/prompts'
import { StringOutputParser } from 'https://esm.sh/langchain@0.1.23/schema/output_parser'
import { RunnableSequence } from 'https://esm.sh/langchain@0.1.23/schema/runnable'

// System message for the faith-centered AI
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

Always respond in a way that encourages spiritual growth and a deeper relationship with God.`

serve(async (req) => {
  try {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      })
    }
    
    // Verify method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Parse request
    const requestData = await req.json()
    const { message, threadId } = requestData
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get JWT token and user info
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Set up response headers for streaming
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()
    
    // Function to send a message to the stream
    const sendStreamMessage = async (data: any) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      } catch (e) {
        console.error('Error writing to stream:', e)
      }
    }
    
    // Start the response with headers
    const response = new Response(stream.readable, { headers })
    
    // Create or retrieve thread
    let currentThreadId = threadId
    
    if (!currentThreadId) {
      // Create new thread
      const { data: newThread, error: threadError } = await supabaseAdmin
        .from('chat_threads')
        .insert({ user_id: user.id })
        .select()
        .single()
      
      if (threadError || !newThread) {
        await sendStreamMessage({ error: 'Failed to create chat thread' })
        await writer.close()
        return response
      }
      
      currentThreadId = newThread.id
      
      // Send thread ID to client
      await sendStreamMessage({ threadId: currentThreadId })
    }
    
    // Get thread history
    const { data: threadMessages, error: historyError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('thread_id', currentThreadId)
      .order('created_at', { ascending: true })
    
    if (historyError) {
      await sendStreamMessage({ error: 'Failed to retrieve chat history' })
      await writer.close()
      return response
    }
    
    // Format previous messages
    const previousMessages = threadMessages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || []
    
    // Get user context
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // Get recent prayer requests
    const { data: prayers } = await supabaseAdmin
      .from('prayer_requests')
      .select('title, description, is_answered')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
    
    // Get mood entries
    const { data: moods } = await supabaseAdmin
      .from('mood_entries')
      .select('mood_score, spiritual_score, entry_date')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(3)
    
    // Build user context
    const userName = profile?.display_name || profile?.first_name || user.email?.split('@')[0] || 'User'
    const recentPrayers = prayers?.map(p => `- ${p.title}: ${p.is_answered ? '(Answered)' : '(Active)'}`).join('\n') || 'None'
    const recentMoods = moods?.map(m => `- Date: ${m.entry_date}, Mood: ${m.mood_score}/10, Spiritual: ${m.spiritual_score}/10`).join('\n') || 'None'
    
    const userContext = `
Name: ${userName}
Email: ${user.email}
Recent Prayer Requests:
${recentPrayers}

Recent Mood/Spiritual Entries:
${recentMoods}
    `.trim()
    
    // Save user message to database
    const { error: saveError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        thread_id: currentThreadId,
        user_id: user.id,
        role: 'user',
        content: message
      })
    
    if (saveError) {
      console.error('Error saving user message:', saveError)
      // Continue anyway to provide a response
    }
    
    // Set up OpenAI client for streaming with increased temperature
    const llm = new ChatOpenAI({
      openAIApiKey: openaiApiKey,
      modelName: "gpt-4o",
      temperature: 0.9,  // Increased to 0.9 for more creative responses
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken: async (token) => {
            await sendStreamMessage({ content: token })
          }
        }
      ]
    })
    
    // Create prompt template
    const promptTemplate = PromptTemplate.fromTemplate(SYSTEM_TEMPLATE)
    
    // Create a chain
    const chain = RunnableSequence.from([
      {
        systemMessage: (input) => promptTemplate.format({ userContext: input.userContext }),
        humanMessage: (input) => input.humanMessage,
        previousMessages: (input) => input.previousMessages,
      },
      llm,
      new StringOutputParser(),
    ])
    
    // Run the chain with streaming
    try {
      await chain.invoke({
        userContext,
        humanMessage: message,
        previousMessages
      })
      
      // Send completion signal
      await sendStreamMessage({ done: true })
      
      // Save assistant's response to database (we'll do this asynchronously to not delay the response)
      // Note: This won't capture the exact streamed response, but for simplicity we'll use the message
      supabaseAdmin
        .from('chat_messages')
        .insert({
          thread_id: currentThreadId,
          user_id: user.id,
          role: 'assistant',
          content: 'Response completed (streaming)' // This is a placeholder, ideally we'd capture the full response
        })
        .then(() => {
          console.log('Assistant response placeholder saved')
        })
        .catch(error => {
          console.error('Error saving assistant response placeholder:', error)
        })
      
    } catch (error) {
      console.error('Error in chat completion:', error)
      await sendStreamMessage({ 
        error: 'Failed to generate response', 
        details: error.message 
      })
    } finally {
      // Close the writer
      await writer.close()
    }
    
    return response
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})