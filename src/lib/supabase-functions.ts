import { supabase } from './supabase';

// Generic function to call any Supabase edge function with proper error handling
export async function callEdgeFunction(
  functionName: string,
  payload: any,
  options: { 
    expectBinary?: boolean,
    authenticated?: boolean,
    timeoutMs?: number
  } = {}
): Promise<any> {
  const {
    expectBinary = false,
    authenticated = true,
    timeoutMs = 10000,
  } = options;
  
  try {
    // Get Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL configuration');
    }

    // Set up request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication if needed
    if (authenticated) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required to call this function');
      }
      
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Make the request
      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle non-200 responses
      if (!response.ok) {
        // Special handling for subscription required (402 Payment Required)
        if (response.status === 402) {
          return { error: 'subscription_required', status: 402 };
        }
        
        // Try to get error details from response
        const errorDetails = await response.text();
        let errorMessage = `Function error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorDetails);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          // If not JSON, use text as is
          errorMessage = errorDetails || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Return the binary response directly if expected
      if (expectBinary) {
        return response;
      }
      
      // Otherwise, parse JSON
      return await response.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw e;
    }
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
}

// Text-to-Speech using OpenAI
export async function generateOpenAITTS(text: string, voice: string): Promise<Response> {
  return callEdgeFunction('openai-tts', { text, voice }, { expectBinary: true });
}