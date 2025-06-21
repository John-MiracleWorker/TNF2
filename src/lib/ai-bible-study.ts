import { supabase } from './supabase';

export interface AIBibleStudy {
  id?: string;
  user_id?: string;
  title: string;
  scripture_reference: string;
  scripture_text: string;
  content: string;
  reflection_questions: string[];
  personalization_context?: any;
  user_notes?: string;
  created_at?: string;
}

export interface BibleStudyPreferences {
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: 'interpretation' | 'application' | 'theology' | 'historical' | 'character';
}

export async function generateAIBibleStudy(preferences?: BibleStudyPreferences): Promise<AIBibleStudy> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-bible-study`, {
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate Bible study');
  }

  const data = await response.json();
  return data.bibleStudy;
}

export async function getAIBibleStudies(): Promise<AIBibleStudy[]> {
  const { data, error } = await supabase
    .from('ai_bible_studies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateAIBibleStudyNotes(studyId: string, notes: string): Promise<AIBibleStudy> {
  const { data, error } = await supabase
    .from('ai_bible_studies')
    .update({ user_notes: notes })
    .eq('id', studyId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAIBibleStudy(studyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_bible_studies')
    .delete()
    .eq('id', studyId);

  if (error) {
    throw error;
  }

  return true;
}