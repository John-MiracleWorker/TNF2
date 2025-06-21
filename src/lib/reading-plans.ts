import { supabase } from './supabase';

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  duration_days: number;
  theme?: string;
  is_premium: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface DailyReading {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  description: string;
  scripture_reference: string;
  reflection_questions: string[];
  prayer_prompt?: string;
}

export interface ReadingProgress {
  id?: string;
  user_id?: string;
  plan_id: string;
  current_day: number;
  start_date?: string;
  last_completed_date?: string;
  is_completed: boolean;
  completion_date?: string;
  created_at?: string;
}

export interface ReadingReflection {
  id?: string;
  user_id?: string;
  plan_id: string;
  day_number: number;
  reflection_text: string;
  ai_feedback?: string;
  created_at?: string;
}

export interface ReadingPlanPreferences {
  topic?: string;
  duration?: number;
  focus?: 'study' | 'reflection' | 'prayer' | 'application' | 'devotional';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  theme?: string;
  specificBook?: string;
  specificPassage?: string;
}

// Get all available reading plans
export async function getReadingPlans(includePremium: boolean = false): Promise<ReadingPlan[]> {
  try {
    let query = supabase
      .from('bible_reading_plans')
      .select('*')
      .eq('is_active', true);
      
    if (!includePremium) {
      query = query.eq('is_premium', false);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching reading plans:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getReadingPlans:', error);
    return [];
  }
}

// Get a single reading plan by ID
export async function getReadingPlanById(planId: string): Promise<ReadingPlan | null> {
  try {
    const { data, error } = await supabase
      .from('bible_reading_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (error) {
      console.error('Error fetching reading plan:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getReadingPlanById:', error);
    return null;
  }
}

// Get daily readings for a plan
export async function getPlanDailyReadings(planId: string): Promise<DailyReading[]> {
  try {
    const { data, error } = await supabase
      .from('plan_daily_readings')
      .select('*')
      .eq('plan_id', planId)
      .order('day_number', { ascending: true });
      
    if (error) {
      console.error('Error fetching daily readings:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getPlanDailyReadings:', error);
    return [];
  }
}

// Get a specific day's reading
export async function getDailyReading(planId: string, dayNumber: number): Promise<DailyReading | null> {
  try {
    const { data, error } = await supabase
      .from('plan_daily_readings')
      .select('*')
      .eq('plan_id', planId)
      .eq('day_number', dayNumber)
      .single();
      
    if (error) {
      console.error('Error fetching daily reading:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getDailyReading:', error);
    return null;
  }
}

// Get user's progress for a reading plan
export async function getUserReadingProgress(planId: string): Promise<ReadingProgress | null> {
  try {
    const { data, error } = await supabase
      .from('user_reading_progress')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching reading progress:', error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error('Error in getUserReadingProgress:', error);
    return null;
  }
}

// Get user's progress across all reading plans
export async function getAllUserReadingProgress(): Promise<ReadingProgress[]> {
  try {
    const { data, error } = await supabase
      .from('user_reading_progress')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching all reading progress:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllUserReadingProgress:', error);
    return [];
  }
}

// Start a reading plan for the current user
export async function startReadingPlan(planId: string): Promise<ReadingProgress | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Check if user already has progress for this plan
    const existingProgress = await getUserReadingProgress(planId);
    
    if (existingProgress) {
      return existingProgress; // User already started this plan
    }
    
    // Create new progress entry
    const progress: ReadingProgress = {
      user_id: user.id,
      plan_id: planId,
      current_day: 1,
      is_completed: false
    };
    
    const { data, error } = await supabase
      .from('user_reading_progress')
      .insert(progress)
      .select()
      .single();
      
    if (error) {
      console.error('Error starting reading plan:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in startReadingPlan:', error);
    throw error;
  }
}

// Update user's reading progress
export async function updateReadingProgress(
  planId: string, 
  currentDay: number, 
  isCompleted: boolean = false
): Promise<ReadingProgress | null> {
  try {
    const updates: Partial<ReadingProgress> = {
      current_day: currentDay,
      last_completed_date: new Date().toISOString(),
    };
    
    if (isCompleted) {
      updates.is_completed = true;
      updates.completion_date = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('user_reading_progress')
      .update(updates)
      .eq('plan_id', planId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating reading progress:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateReadingProgress:', error);
    throw error;
  }
}

// Complete a day of a reading plan
export async function completeReadingDay(planId: string, dayNumber: number): Promise<ReadingProgress | null> {
  try {
    // Get the plan to know its duration
    const plan = await getReadingPlanById(planId);
    if (!plan) return null;
    
    const progress = await getUserReadingProgress(planId);
    if (!progress) return null;
    
    // Only update if the day number is valid and hasn't been surpassed yet
    if (dayNumber <= progress.current_day) {
      const isCompleted = dayNumber >= plan.duration_days;
      const nextDay = isCompleted ? dayNumber : dayNumber + 1;
      
      return updateReadingProgress(planId, nextDay, isCompleted);
    }
    
    return progress;
  } catch (error) {
    console.error('Error in completeReadingDay:', error);
    return null;
  }
}

// Save a reflection for a daily reading
export async function saveReflection(
  planId: string,
  dayNumber: number,
  reflectionText: string
): Promise<ReadingReflection | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Check if a reflection already exists
    const { data: existingReflection, error: checkError } = await supabase
      .from('reading_reflections')
      .select('id')
      .eq('plan_id', planId)
      .eq('day_number', dayNumber)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing reflection:', checkError);
      throw checkError;
    }
    
    if (existingReflection?.id) {
      // Update existing reflection
      const { data, error } = await supabase
        .from('reading_reflections')
        .update({ reflection_text: reflectionText })
        .eq('id', existingReflection.id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating reflection:', error);
        throw error;
      }
      
      return data;
    } else {
      // Create new reflection
      const reflection: ReadingReflection = {
        user_id: user.id,
        plan_id: planId,
        day_number: dayNumber,
        reflection_text: reflectionText,
      };
      
      const { data, error } = await supabase
        .from('reading_reflections')
        .insert(reflection)
        .select()
        .single();
        
      if (error) {
        console.error('Error saving reflection:', error);
        throw error;
      }
      
      return data;
    }
  } catch (error) {
    console.error('Error in saveReflection:', error);
    throw error;
  }
}

// Get user's reflection for a specific day
export async function getReflection(planId: string, dayNumber: number): Promise<ReadingReflection | null> {
  try {
    const { data, error } = await supabase
      .from('reading_reflections')
      .select('*')
      .eq('plan_id', planId)
      .eq('day_number', dayNumber)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching reflection:', error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error('Error in getReflection:', error);
    return null;
  }
}

// Generate a custom reading plan based on user preferences
export async function generateCustomReadingPlan(preferences: ReadingPlanPreferences): Promise<{plan: ReadingPlan, progress: ReadingProgress} | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No authenticated session');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-reading-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: session.user.id,
        topic: preferences.topic,
        duration: preferences.duration || 7,
        focus: preferences.focus || 'reflection',
        difficulty: preferences.difficulty || 'intermediate',
        theme: preferences.theme,
        specificBook: preferences.specificBook,
        specificPassage: preferences.specificPassage,
        isPremium: false // Only admins can create premium plans
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate reading plan: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating custom reading plan:', error);
    throw error;
  }
}