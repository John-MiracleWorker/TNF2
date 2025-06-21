import { supabase } from './supabase';
import { SermonSummary } from './types';

/**
 * Get all sermon summaries for the current user
 */
export async function getSermonSummaries(): Promise<SermonSummary[]> {
  try {
    const { data, error } = await supabase
      .from('sermon_summaries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sermon summaries:', error);
      return [];
    }
    
    return data as SermonSummary[];
  } catch (error) {
    console.error('Error in getSermonSummaries:', error);
    return [];
  }
}

/**
 * Get a sermon summary by ID
 */
export async function getSermonSummaryById(id: string): Promise<SermonSummary | null> {
  try {
    const { data, error } = await supabase
      .from('sermon_summaries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching sermon summary:', error);
      return null;
    }
    
    return data as SermonSummary;
  } catch (error) {
    console.error('Error in getSermonSummaryById:', error);
    return null;
  }
}

/**
 * Save a new sermon summary
 */
export async function saveSermonSummary(sermon: SermonSummary): Promise<SermonSummary | null> {
  try {
    // Make sure user_id is set
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const sermonWithUserId = {
      ...sermon,
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('sermon_summaries')
      .insert([sermonWithUserId])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving sermon summary:', error);
      throw error;
    }
    
    return data as SermonSummary;
  } catch (error) {
    console.error('Error in saveSermonSummary:', error);
    throw error;
  }
}

/**
 * Update a sermon summary
 */
export async function updateSermonSummary(sermon: SermonSummary): Promise<SermonSummary | null> {
  try {
    if (!sermon.id) {
      throw new Error('Sermon ID is required for updates');
    }
    
    const { data, error } = await supabase
      .from('sermon_summaries')
      .update(sermon)
      .eq('id', sermon.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating sermon summary:', error);
      throw error;
    }
    
    return data as SermonSummary;
  } catch (error) {
    console.error('Error in updateSermonSummary:', error);
    throw error;
  }
}

/**
 * Delete a sermon summary
 */
export async function deleteSermonSummary(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sermon_summaries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting sermon summary:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteSermonSummary:', error);
    throw error;
  }
}

/**
 * Process a sermon with AI
 */
export async function processSermon(sermonId: string, filePath: string): Promise<any> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated session');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-sermon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sermon_id: sermonId,
        file_path: filePath,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process sermon: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error processing sermon:', error);
    throw error;
  }
}

/**
 * Get sermon processing status
 */
export async function getSermonProcessingStatus(sermonId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('sermon_summaries')
      .select('ai_context')
      .eq('id', sermonId)
      .single();
    
    if (error) {
      console.error('Error fetching sermon status:', error);
      throw error;
    }
    
    return data.ai_context;
  } catch (error) {
    console.error('Error in getSermonProcessingStatus:', error);
    throw error;
  }
}