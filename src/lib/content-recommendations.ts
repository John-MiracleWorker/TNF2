import { supabase } from './supabase';
import { ContentRecommendation } from './types';

/**
 * Get personalized content recommendations for the current user
 */
export async function getContentRecommendations(): Promise<ContentRecommendation[]> {
  try {
    const { data, error } = await supabase
      .from('content_recommendations')
      .select('*')
      .eq('is_viewed', false)
      .order('relevance_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching content recommendations:', error);
      return [];
    }

    return data as ContentRecommendation[];
  } catch (error) {
    console.error('Error in getContentRecommendations:', error);
    return [];
  }
}

/**
 * Mark a recommendation as viewed
 */
export async function markRecommendationViewed(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_recommendations')
      .update({ is_viewed: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking recommendation as viewed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markRecommendationViewed:', error);
    return false;
  }
}

/**
 * Mark a recommendation as saved or unsaved
 */
export async function saveRecommendation(id: string, saved: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_recommendations')
      .update({ is_saved: saved })
      .eq('id', id);

    if (error) {
      console.error('Error saving recommendation:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveRecommendation:', error);
    return false;
  }
}

/**
 * Generate new content recommendations based on journal analysis
 */
export async function generateContentRecommendations(timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not found in environment variables');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Call the edge function to analyze content and generate recommendations
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-mood-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        timeRange,
        generateRecommendations: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error calling analyze-mood-content: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return !!result.recommendations && result.recommendations.length > 0;
  } catch (error) {
    console.error('Error in generateContentRecommendations:', error);
    return false;
  }
}