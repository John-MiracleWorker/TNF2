import { supabase } from './supabase';

export interface BibleStudyInteraction {
  id: string;
  study_id: string;
  user_id?: string;
  interaction_type: 'reflection' | 'question' | 'prayer';
  prompt: string;
  user_response?: string;
  ai_feedback?: string;
  created_at: string;
}

export async function getBibleStudyInteractions(studyId: string): Promise<BibleStudyInteraction[]> {
  const { data, error } = await supabase
    .from('bible_study_interactions')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching Bible study interactions:', error);
    return [];
  }

  return data || [];
}

export async function submitBibleStudyInteraction(
  studyId: string,
  interactionType: BibleStudyInteraction['interaction_type'],
  prompt: string,
  userResponse?: string
): Promise<{ interaction: BibleStudyInteraction; aiFeedback?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/bible-study-interaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      studyId,
      userId: user.id,
      interactionType,
      prompt,
      userResponse
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit interaction');
  }

  const data = await response.json();
  return data;
}