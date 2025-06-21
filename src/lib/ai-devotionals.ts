import { supabase } from './supabase';

export interface AIDevotional {
  id: string;
  user_id: string;
  title: string;
  scripture_reference: string;
  scripture_text: string;
  content: string;
  reflection_questions: string[];
  personalization_context: any;
  created_at: string;
}

export interface DevotionalInteraction {
  id: string;
  devotional_id: string;
  user_id: string;
  interaction_type: 'reflection' | 'question' | 'prayer';
  prompt: string;
  user_response?: string;
  ai_feedback?: string;
  created_at: string;
}

export interface DevotionalPreferences {
  tone?: 'encouraging' | 'challenging' | 'comforting' | 'inspiring';
  length?: 'short' | 'medium' | 'long';
  focus?: 'prayer' | 'scripture' | 'application' | 'reflection';
}

export async function generateAIDevotional(preferences?: DevotionalPreferences): Promise<AIDevotional> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-devotional`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        userId: user.id,
        preferences
      }),
    });

    if (!response.ok) {
      // Try to get the error message from the response
      let errorMessage = 'Failed to generate devotional';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the JSON, use the status text
        errorMessage = `${errorMessage}: ${response.statusText}`;
      }
      
      console.error('Failed to generate devotional:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.devotional) {
      throw new Error('No devotional returned from server');
    }
    
    return data.devotional;
  } catch (error) {
    console.error('Error in generateAIDevotional:', error);
    throw error;
  }
}

export async function getAIDevotionals(): Promise<AIDevotional[]> {
  try {
    const { data, error } = await supabase
      .from('ai_devotionals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI devotionals:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAIDevotionals:', error);
    throw error;
  }
}

export async function getDevotionalInteractions(devotionalId: string): Promise<DevotionalInteraction[]> {
  try {
    const { data, error } = await supabase
      .from('ai_devotional_interactions')
      .select('*')
      .eq('devotional_id', devotionalId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching devotional interactions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDevotionalInteractions:', error);
    throw error;
  }
}

export async function submitDevotionalInteraction(
  devotionalId: string,
  interactionType: DevotionalInteraction['interaction_type'],
  prompt: string,
  userResponse?: string
): Promise<{ interaction: DevotionalInteraction; aiFeedback?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/devotional-interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        devotionalId,
        userId: user.id,
        interactionType,
        prompt,
        userResponse
      }),
    });

    if (!response.ok) {
      // Try to get the error message from the response
      let errorMessage = 'Failed to submit interaction';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the JSON, use the status text
        errorMessage = `${errorMessage}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in submitDevotionalInteraction:', error);
    throw error;
  }
}