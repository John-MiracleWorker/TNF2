import { supabase } from './supabase';

export interface HabitRecommendation {
  id: string;
  habit_name: string;
  reason: string;
  benefit: string;
  recommended_frequency: 'daily' | 'weekly' | 'monthly';
  recommended_amount: number;
  match_score: number;
  scripture_reference?: string;
  scripture_text?: string;
}

/**
 * Get personalized habit recommendations based on user data
 */
export async function getHabitRecommendations(): Promise<HabitRecommendation[]> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/recommend-habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: Could not fetch habit recommendations`);
    }
    
    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error('Error in getHabitRecommendations:', error);
    throw error;
  }
}

/**
 * Save a spiritual habit from a recommendation
 */
export async function saveRecommendedHabit(recommendationId: string, customFrequency?: string, customAmount?: number): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/save-recommended-habit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        recommendationId,
        customFrequency,
        customAmount
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: Could not save habit`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveRecommendedHabit:', error);
    throw error;
  }
}

/**
 * Export existing functions to save habits directly
 */
export { saveSpiritualHabit } from './supabase';