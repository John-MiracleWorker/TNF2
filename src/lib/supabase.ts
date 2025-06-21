import { createClient } from '@supabase/supabase-js';
import { handleDatabaseError, withErrorHandling } from './error-handler';
import type { 
  JournalEntry, 
  PrayerRequest, 
  ScriptureMemory, 
  DailyDevotional,
  UserDevotionalProgress,
  SpiritualHabit,
  HabitLog,
  BibleStudyNote,
  MoodEntry,
  Notification,
  ContentRecommendation,
  UserPreferences,
  UserProfile,
  SpiritualGoal
} from './types';

// Safely access environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Add error handling for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file and Netlify environment variables.');
}

// Create the Supabase client with better error handling
let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      // Add fetch options to handle CORS issues or network problems
      fetch: (url, options) => {
        // Create a timeout for fetch requests to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    },
  });
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Provide a fallback client that won't crash the app but will show proper errors
  supabaseClient = {
    auth: {
      getSession: () => Promise.reject(new Error('Supabase client not properly initialized')),
      getUser: () => Promise.reject(new Error('Supabase client not properly initialized')),
      signUp: () => Promise.reject(new Error('Supabase client not properly initialized')),
      signIn: () => Promise.reject(new Error('Supabase client not properly initialized')),
      signOut: () => Promise.reject(new Error('Supabase client not properly initialized')),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.reject(new Error('Supabase client not properly initialized')),
          maybeSingle: () => Promise.reject(new Error('Supabase client not properly initialized')),
          limit: () => Promise.reject(new Error('Supabase client not properly initialized')),
        }),
        order: () => ({
          limit: () => Promise.reject(new Error('Supabase client not properly initialized')),
        }),
      }),
      insert: () => Promise.reject(new Error('Supabase client not properly initialized')),
      update: () => Promise.reject(new Error('Supabase client not properly initialized')),
      delete: () => Promise.reject(new Error('Supabase client not properly initialized')),
    }),
    rpc: () => Promise.reject(new Error('Supabase client not properly initialized')),
  };
}

export const supabase = supabaseClient;

// Auth functions
export async function signUp(email: string, password: string) {
  try {
    console.log('Starting signup process for:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase auth signup error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Database error saving new user')) {
        throw new Error('Database setup error. Please ensure all database migrations have been applied to your Supabase project. Check the README.md for setup instructions.');
      } else if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please try signing in instead.');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Please enter a valid email address.');
      } else if (error.message.includes('Password')) {
        throw new Error('Password must be at least 8 characters long.');
      }
      
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
    
    console.log('Auth signup successful:', data);
    
    // Return early if the signup requires email confirmation or if user creation failed
    if (!data.user || !data.user.id) {
      console.log('User creation pending or failed, returning early');
      return data;
    }
    
    // Wait a bit to ensure auth triggers have completed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to initialize user data, but don't fail the entire signup if these fail
    try {
      console.log('Initializing user profile for:', data.user.id);
      
      // Check if profile already exists (might be created by DB trigger)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: data.user.id, 
            display_name: email.split('@')[0],
          }, {
            onConflict: 'id'
          });
          
        if (profileError) {
          console.warn('Warning: Could not create user profile:', profileError.message);
        } else {
          console.log('User profile created successfully');
        }
      } else {
        console.log('User profile already exists');
      }
      
      // Check if preferences already exist
      const { data: existingPreferences } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (!existingPreferences) {
        const { error: preferencesError } = await supabase
          .from('user_preferences')
          .upsert({ 
            id: data.user.id,
          }, {
            onConflict: 'id'
          });
          
        if (preferencesError) {
          console.warn('Warning: Could not create user preferences:', preferencesError.message);
        } else {
          console.log('User preferences created successfully');
        }
      } else {
        console.log('User preferences already exist');
      }
      
      // Check if scripture stats already exist
      const { data: existingStats } = await supabase
        .from('user_scripture_stats')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (!existingStats) {
        const { error: statsError } = await supabase
          .from('user_scripture_stats')
          .upsert({ 
            user_id: data.user.id,
          }, {
            onConflict: 'user_id'
          });
          
        if (statsError) {
          console.warn('Warning: Could not create user scripture stats:', statsError.message);
        } else {
          console.log('User scripture stats created successfully');
        }
      } else {
        console.log('User scripture stats already exist');
      }
      
    } catch (initError) {
      console.warn('Warning: Error during user initialization (signup still successful):', initError);
      // Don't throw here - the user account was created successfully
    }
    
    console.log('Signup process completed successfully');
    return data;
    
  } catch (error) {
    console.error('Error during signup:', error);
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during registration. Please try again.');
    }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Get current user error:', error);
      throw error;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

// Profile functions
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data as UserProfile;
}

export async function updateProfile(profile: UserProfile) {
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', profile.id)
    .select();
  
  if (error) {
    throw error;
  }
  
  return data[0] as UserProfile;
}

// User preferences functions
export async function getUserPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      return handleDatabaseError(error, null, 'Error fetching user preferences');
    }
    
    return data as UserPreferences;
  } catch (error) {
    return handleDatabaseError(error, null, 'Error fetching user preferences');
  }
}

export async function updateUserPreferences(preferences: UserPreferences) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(preferences)
      .select();
    
    if (error) {
      throw error;
    }
    
    return data[0] as UserPreferences;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

// Journal functions
export async function getJournalEntries() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching journal entries:', error);
    return [];
  }
  
  return data as JournalEntry[];
}

export async function saveJournalEntry(entry: JournalEntry) {
  const { data, error } = await supabase
    .from('journal_entries')
    .insert([entry])
    .select();
  
  if (error) {
    console.error('Error saving journal entry:', error);
    throw error;
  }
  
  return data[0] as JournalEntry;
}

export async function getJournalEntryById(id: string) {
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
}

export async function updateJournalEntry(entry: JournalEntry) {
  const { data, error } = await supabase
    .from('journal_entries')
    .update(entry)
    .eq('id', entry.id)
    .select();
  
  if (error) {
    console.error('Error updating journal entry:', error);
    throw error;
  }
  
  return data[0] as JournalEntry;
}

export async function deleteJournalEntry(id: string) {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting journal entry:', error);
    throw error;
  }
  
  return true;
}

// Prayer request functions
export async function getPrayerRequests() {
  try {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching prayer requests');
    }
    
    return data as PrayerRequest[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching prayer requests');
  }
}

export async function savePrayerRequest(request: PrayerRequest) {
  try {
    // Ensure user_id is set when saving a request
    if (!request.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      request.user_id = user.id;
    }
    
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert([request])
      .select();
    
    if (error) {
      console.error('Error saving prayer request:', error);
      throw error;
    }
    
    return data[0] as PrayerRequest;
  } catch (error) {
    console.error('Error in savePrayerRequest:', error);
    throw error;
  }
}

export async function updatePrayerRequest(request: PrayerRequest) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .update(request)
    .eq('id', request.id)
    .select();
  
  if (error) {
    console.error('Error updating prayer request:', error);
    throw error;
  }
  
  return data[0] as PrayerRequest;
}

export async function deletePrayerRequest(id: string) {
  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting prayer request:', error);
    throw error;
  }
  
  return true;
}

// Community prayer functions
export async function getCommunityPrayers() {
  try {
    // Query prayer requests and profiles separately, then combine
    const { data: prayers, error: prayersError } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('shared', true)
      .order('created_at', { ascending: false });
    
    if (prayersError) {
      return handleDatabaseError(prayersError, [], 'Error fetching community prayers');
    }

    // Get unique user IDs from prayers
    const userIds = [...new Set(prayers.map(prayer => prayer.user_id).filter(Boolean))];
    
    if (userIds.length === 0) {
      return prayers;
    }

    // Fetch profiles for those users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, first_name')
      .in('id', userIds);
    
    if (profilesError) {
      return handleDatabaseError(profilesError, prayers, 'Error fetching user profiles');
    }

    // Create a map of user profiles for quick lookup
    const profileMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);
    
    // Combine prayers with profile data
    const prayersWithProfiles = prayers.map(prayer => ({
      ...prayer,
      profiles: prayer.user_id ? profileMap.get(prayer.user_id) : null
    }));
    
    return prayersWithProfiles;
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching community prayers');
  }
}

export async function prayForRequest(prayerId: string) {
  try {
    // First, check if the user has already prayed for this request
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: existingPrayer, error: checkError } = await supabase
      .from('prayer_interactions')
      .select('id')
      .eq('prayer_id', prayerId)
      .eq('user_id', user.id)
      .limit(1);
    
    if (checkError) {
      throw checkError;
    }
    
    // If already prayed, just return
    if (existingPrayer && existingPrayer.length > 0) {
      return { alreadyPrayed: true };
    }
    
    // Add prayer interaction
    const { error: interactionError } = await supabase
      .from('prayer_interactions')
      .insert({
        prayer_id: prayerId,
        user_id: user.id
      });
    
    if (interactionError) {
      throw interactionError;
    }
    
    // Increment prayer count
    const { data: updatedRequest, error: updateError } = await supabase.rpc(
      'increment_prayer_count',
      { prayer_id: prayerId }
    );
    
    if (updateError) {
      throw updateError;
    }
    
    return { success: true, prayer_count: updatedRequest?.prayer_count || 1 };
  } catch (error) {
    console.error('Error praying for request:', error);
    throw error;
  }
}

export async function hasPrayedFor(prayerId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('prayer_interactions')
      .select('id')
      .eq('prayer_id', prayerId)
      .eq('user_id', user.id)
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking if prayed for request:', error);
    return false;
  }
}

// Scripture memory functions
export async function getScriptureMemories() {
  try {
    const { data, error } = await supabase
      .from('scripture_memory')
      .select('*')
      .order('next_review', { ascending: true });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching scripture memories');
    }
    
    return data as ScriptureMemory[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching scripture memories');
  }
}

export async function saveScriptureMemory(memory: ScriptureMemory) {
  const { data, error } = await supabase
    .from('scripture_memory')
    .insert([memory])
    .select();
  
  if (error) {
    console.error('Error saving scripture memory:', error);
    throw error;
  }
  
  return data[0] as ScriptureMemory;
}

export async function updateScriptureMemory(memory: ScriptureMemory) {
  const { data, error } = await supabase
    .from('scripture_memory')
    .update(memory)
    .eq('id', memory.id)
    .select();
  
  if (error) {
    console.error('Error updating scripture memory:', error);
    throw error;
  }
  
  return data[0] as ScriptureMemory;
}

// Devotional functions
export async function getDailyDevotionals(limit = 7) {
  try {
    const { data, error } = await supabase
      .from('daily_devotionals')
      .select('*')
      .order('publish_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching daily devotionals');
    }
    
    return data as DailyDevotional[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching daily devotionals');
  }
}

export async function getDevotionalById(id: string) {
  const { data, error } = await supabase
    .from('daily_devotionals')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching devotional:', error);
    return null;
  }
  
  return data as DailyDevotional;
}

export async function getUserDevotionalProgress(devotionalId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_devotional_progress')
      .select('*')
      .eq('devotional_id', devotionalId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      return handleDatabaseError(error, null, 'Error fetching devotional progress');
    }
    
    return data as UserDevotionalProgress;
  } catch (error) {
    return handleDatabaseError(error, null, 'Error fetching devotional progress');
  }
}

export async function updateDevotionalProgress(progress: UserDevotionalProgress) {
  const { data, error } = await supabase
    .from('user_devotional_progress')
    .upsert(progress)
    .select();
  
  if (error) {
    console.error('Error updating devotional progress:', error);
    throw error;
  }
  
  return data[0] as UserDevotionalProgress;
}

// Spiritual habits functions
export async function getSpiritualHabits() {
  try {
    const { data, error } = await supabase
      .from('spiritual_habits')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching spiritual habits');
    }
    
    return data as SpiritualHabit[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching spiritual habits');
  }
}

export async function saveSpiritualHabit(habit: SpiritualHabit) {
  // Make sure user_id is set when saving a habit
  if (!habit.user_id) {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    habit.user_id = user.id;
  }

  const { data, error } = await supabase
    .from('spiritual_habits')
    .insert([habit])
    .select();
  
  if (error) {
    console.error('Error saving spiritual habit:', error);
    throw error;
  }
  
  return data[0] as SpiritualHabit;
}

export async function updateSpiritualHabit(habit: SpiritualHabit) {
  const { data, error } = await supabase
    .from('spiritual_habits')
    .update(habit)
    .eq('id', habit.id)
    .select();
  
  if (error) {
    console.error('Error updating spiritual habit:', error);
    throw error;
  }
  
  return data[0] as SpiritualHabit;
}

export async function logHabitCompletion(log: HabitLog) {
  try {
    // Make sure user_id is set when logging a habit
    if (!log.user_id) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      log.user_id = user.id;
    }

    const { data, error } = await supabase
      .from('habit_logs')
      .insert([log])
      .select();
    
    if (error) {
      return handleDatabaseError(error, null, 'Error logging habit completion');
    }
    
    return data[0] as HabitLog;
  } catch (error) {
    return handleDatabaseError(error, null, 'Error logging habit completion');
  }
}

export async function getHabitLogs(habitId: string, startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)
      .gte('completed_date', startDate)
      .lte('completed_date', endDate)
      .order('completed_date', { ascending: true });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching habit logs');
    }
    
    return data as HabitLog[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching habit logs');
  }
}

// Bible study notes functions
export async function getBibleStudyNotes() {
  try {
    const { data, error } = await supabase
      .from('bible_study_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching Bible study notes');
    }
    
    return data as BibleStudyNote[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching Bible study notes');
  }
}

export async function saveBibleStudyNote(note: BibleStudyNote) {
  const { data, error } = await supabase
    .from('bible_study_notes')
    .insert([note])
    .select();
  
  if (error) {
    console.error('Error saving Bible study note:', error);
    throw error;
  }
  
  return data[0] as BibleStudyNote;
}

export async function updateBibleStudyNote(note: BibleStudyNote) {
  const { data, error } = await supabase
    .from('bible_study_notes')
    .update(note)
    .eq('id', note.id)
    .select();
  
  if (error) {
    console.error('Error updating Bible study note:', error);
    throw error;
  }
  
  return data[0] as BibleStudyNote;
}

export async function deleteBibleStudyNote(id: string) {
  const { error } = await supabase
    .from('bible_study_notes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting Bible study note:', error);
    throw error;
  }
  
  return true;
}

// Mood entries functions
export async function getMoodEntries(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date', { ascending: true });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching mood entries');
    }
    
    return data as MoodEntry[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching mood entries');
  }
}

export async function saveMoodEntry(entry: MoodEntry) {
  // Ensure user_id is set
  if (!entry.user_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    entry.user_id = user.id;
  }
  
  const { data, error } = await supabase
    .from('mood_entries')
    .insert([entry])
    .select();
  
  if (error) {
    console.error('Error saving mood entry:', error);
    throw error;
  }
  
  return data[0] as MoodEntry;
}

// Notifications functions
export async function getNotifications() {
  try {
    // First check if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session for notifications');
        return [];
      }
    } catch (sessionError) {
      console.error('Error checking session for notifications:', sessionError);
      return [];
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching notifications');
    }
    
    return data as Notification[];
  } catch (error) {
    // Gracefully handle errors and return empty array instead of throwing
    console.error('Error getting notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
  
  return data[0] as Notification;
}

// Content recommendations functions
export async function getContentRecommendations() {
  try {
    const { data, error } = await supabase
      .from('content_recommendations')
      .select('*')
      .eq('is_viewed', false)
      .order('relevance_score', { ascending: false });
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching content recommendations');
    }
    
    return data as ContentRecommendation[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching content recommendations');
  }
}

export async function markRecommendationViewed(id: string) {
  const { data, error } = await supabase
    .from('content_recommendations')
    .update({ is_viewed: true })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error marking recommendation as viewed:', error);
    throw error;
  }
  
  return data[0] as ContentRecommendation;
}

export async function saveRecommendation(id: string, saved: boolean) {
  const { data, error } = await supabase
    .from('content_recommendations')
    .update({ is_saved: saved })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error saving recommendation:', error);
    throw error;
  }
  
  return data[0] as ContentRecommendation;
}

// Create a function to add a notification (for testing)
export async function createTestNotification(title: string, message: string, type: string = 'info', actionLink?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const notification: Notification = {
      user_id: user.id,
      title,
      message,
      type,
      is_read: false,
      action_link: actionLink
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();
    
    if (error) {
      console.error('Error creating test notification:', error);
      throw error;
    }
    
    return data[0] as Notification;
  } catch (error) {
    console.error('Error creating test notification:', error);
    throw error;
  }
}

// Function to add prayer request from reading plan to prayer journal
export async function savePrayerRequestFromReadingPlan(
  planTitle: string, 
  dayNumber: number,
  prayerPrompt: string, 
  tags: string[] = []
): Promise<PrayerRequest> {
  try {
    // Ensure user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create the prayer request
    const prayer: PrayerRequest = {
      user_id: user.id,
      title: `${planTitle} - Day ${dayNumber}`,
      description: prayerPrompt,
      is_answered: false,
      shared: false,
      tags: [...tags, 'reading-plan', 'prayer-focus']
    };
    
    // Save it to the database
    return await savePrayerRequest(prayer);
  } catch (error) {
    console.error('Error saving prayer from reading plan:', error);
    throw error;
  }
}

// Spiritual Goals functions
export async function getSpiritualGoals(includeCompleted: boolean = false) {
  try {
    let query = supabase
      .from('spiritual_goals')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Optionally filter out completed goals
    if (!includeCompleted) {
      query = query.eq('is_completed', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return handleDatabaseError(error, [], 'Error fetching spiritual goals');
    }
    
    return data as SpiritualGoal[];
  } catch (error) {
    return handleDatabaseError(error, [], 'Error fetching spiritual goals');
  }
}

export async function createSpiritualGoal(goal: SpiritualGoal) {
  try {
    // Ensure user_id is set
    if (!goal.user_id) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      goal.user_id = user.id;
    }

    const { data, error } = await supabase
      .from('spiritual_goals')
      .insert([goal])
      .select();
    
    if (error) {
      console.error('Error creating spiritual goal:', error);
      throw error;
    }
    
    return data[0] as SpiritualGoal;
  } catch (error) {
    console.error('Error in createSpiritualGoal:', error);
    throw error;
  }
}

export async function updateSpiritualGoal(goalId: string, updates: Partial<SpiritualGoal>) {
  try {
    const { data, error } = await supabase
      .from('spiritual_goals')
      .update(updates)
      .eq('id', goalId)
      .select();
    
    if (error) {
      console.error('Error updating spiritual goal:', error);
      throw error;
    }
    
    return data[0] as SpiritualGoal;
  } catch (error) {
    console.error('Error in updateSpiritualGoal:', error);
    throw error;
  }
}

export async function deleteSpiritualGoal(goalId: string) {
  try {
    const { error } = await supabase
      .from('spiritual_goals')
      .delete()
      .eq('id', goalId);
    
    if (error) {
      console.error('Error deleting spiritual goal:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteSpiritualGoal:', error);
    throw error;
  }
}