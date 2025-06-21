import { supabase } from './supabase';
import { JournalEntry } from './types';

/**
 * Get all journal entries for the current user
 */
export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    console.log('Fetching journal entries');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching journal entries:', error);
      return [];
    }
    
    return data as JournalEntry[];
  } catch (error) {
    console.error('Error in getJournalEntries:', error);
    return [];
  }
}

/**
 * Save a new journal entry
 */
export async function saveJournalEntry(entry: JournalEntry): Promise<JournalEntry | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    const entryWithUserId = {
      ...entry,
      user_id: userData.user.id
    };
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([entryWithUserId])
      .select();
    
    if (error) {
      console.error('Error saving journal entry:', error);
      return null;
    }
    
    return data[0] as JournalEntry;
  } catch (error) {
    console.error('Error in saveJournalEntry:', error);
    return null;
  }
}

/**
 * Get a journal entry by ID
 */
export async function getJournalEntryById(id: string): Promise<JournalEntry | null> {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching journal entry:', error);
      return null;
    }
    
    return data as JournalEntry;
  } catch (error) {
    console.error('Error in getJournalEntryById:', error);
    return null;
  }
}

/**
 * Update an existing journal entry
 */
export async function updateJournalEntry(entry: JournalEntry): Promise<JournalEntry | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Ensure we only update entries owned by this user
    const entryWithUserId = {
      ...entry,
      user_id: userData.user.id
    };
    
    const { data, error } = await supabase
      .from('journal_entries')
      .update(entryWithUserId)
      .eq('id', entry.id)
      .eq('user_id', userData.user.id) // Extra protection
      .select();
    
    if (error) {
      console.error('Error updating journal entry:', error);
      return null;
    }
    
    return data[0] as JournalEntry;
  } catch (error) {
    console.error('Error in updateJournalEntry:', error);
    return null;
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(id: string): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id); // Ensure we only delete user's own entries
    
    if (error) {
      console.error('Error deleting journal entry:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteJournalEntry:', error);
    return false;
  }
}