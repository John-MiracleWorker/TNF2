import { supabase } from './supabase';
import { SpiritualGoal, GoalMilestone, GoalReflection, GoalPreferences } from './types';

/**
 * Get all spiritual goals for the current user
 */
export async function getSpiritualGoals(): Promise<SpiritualGoal[]> {
  try {
    const { data, error } = await supabase
      .from('spiritual_goals')
      .select(`
        *,
        milestones:goal_milestones(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching spiritual goals:', error);
      return [];
    }
    
    return data as SpiritualGoal[];
  } catch (error) {
    console.error('Error in getSpiritualGoals:', error);
    return [];
  }
}

/**
 * Get a specific spiritual goal by ID
 */
export async function getSpiritualGoalById(id: string): Promise<SpiritualGoal | null> {
  try {
    const { data, error } = await supabase
      .from('spiritual_goals')
      .select(`
        *,
        milestones:goal_milestones(*),
        reflections:goal_reflections(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching spiritual goal:', error);
      return null;
    }
    
    return data as SpiritualGoal;
  } catch (error) {
    console.error('Error in getSpiritualGoalById:', error);
    return null;
  }
}

/**
 * Save a new spiritual goal
 */
export async function saveSpiritualGoal(goal: SpiritualGoal): Promise<SpiritualGoal | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Ensure user_id is set
    const goalWithUserId = {
      ...goal,
      user_id: user.id
    };
    
    // Save the goal
    const { data, error } = await supabase
      .from('spiritual_goals')
      .insert([goalWithUserId])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving spiritual goal:', error);
      throw error;
    }
    
    // If there are milestones, save them too
    if (goal.milestones && goal.milestones.length > 0 && data.id) {
      const milestonesToSave = goal.milestones.map(milestone => ({
        ...milestone,
        goal_id: data.id
      }));
      
      const { error: milestonesError } = await supabase
        .from('goal_milestones')
        .insert(milestonesToSave);
      
      if (milestonesError) {
        console.error('Error saving goal milestones:', milestonesError);
        // Continue even if milestone saving fails
      }
    }
    
    return data as SpiritualGoal;
  } catch (error) {
    console.error('Error in saveSpiritualGoal:', error);
    throw error;
  }
}

/**
 * Update an existing spiritual goal
 */
export async function updateSpiritualGoal(goal: SpiritualGoal): Promise<SpiritualGoal | null> {
  try {
    if (!goal.id) {
      throw new Error('Goal ID is required for updates');
    }
    
    // Update the goal
    const { data, error } = await supabase
      .from('spiritual_goals')
      .update({
        title: goal.title,
        description: goal.description,
        target_date: goal.target_date,
        status: goal.status,
        progress: goal.progress,
        category: goal.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', goal.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating spiritual goal:', error);
      throw error;
    }
    
    return data as SpiritualGoal;
  } catch (error) {
    console.error('Error in updateSpiritualGoal:', error);
    throw error;
  }
}

/**
 * Delete a spiritual goal
 */
export async function deleteSpiritualGoal(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('spiritual_goals')
      .delete()
      .eq('id', id);
    
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

/**
 * Save a milestone for a goal
 */
export async function saveGoalMilestone(milestone: GoalMilestone): Promise<GoalMilestone | null> {
  try {
    if (!milestone.goal_id) {
      throw new Error('Goal ID is required for milestone');
    }
    
    const { data, error } = await supabase
      .from('goal_milestones')
      .insert([milestone])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving goal milestone:', error);
      throw error;
    }
    
    return data as GoalMilestone;
  } catch (error) {
    console.error('Error in saveGoalMilestone:', error);
    throw error;
  }
}

/**
 * Update a milestone
 */
export async function updateGoalMilestone(milestone: GoalMilestone): Promise<GoalMilestone | null> {
  try {
    if (!milestone.id) {
      throw new Error('Milestone ID is required for updates');
    }
    
    const { data, error } = await supabase
      .from('goal_milestones')
      .update({
        title: milestone.title,
        description: milestone.description,
        target_date: milestone.target_date,
        is_completed: milestone.is_completed,
        completed_at: milestone.is_completed ? new Date().toISOString() : null
      })
      .eq('id', milestone.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating goal milestone:', error);
      throw error;
    }
    
    // If milestone is completed, update the goal progress
    if (milestone.is_completed && milestone.goal_id) {
      await updateGoalProgress(milestone.goal_id);
    }
    
    return data as GoalMilestone;
  } catch (error) {
    console.error('Error in updateGoalMilestone:', error);
    throw error;
  }
}

/**
 * Delete a milestone
 */
export async function deleteGoalMilestone(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting goal milestone:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteGoalMilestone:', error);
    throw error;
  }
}

/**
 * Save a reflection for a goal
 */
export async function saveGoalReflection(reflection: GoalReflection): Promise<GoalReflection | null> {
  try {
    if (!reflection.goal_id) {
      throw new Error('Goal ID is required for reflection');
    }
    
    const { data, error } = await supabase
      .from('goal_reflections')
      .insert([reflection])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving goal reflection:', error);
      throw error;
    }
    
    return data as GoalReflection;
  } catch (error) {
    console.error('Error in saveGoalReflection:', error);
    throw error;
  }
}

/**
 * Get reflections for a goal
 */
export async function getGoalReflections(goalId: string): Promise<GoalReflection[]> {
  try {
    const { data, error } = await supabase
      .from('goal_reflections')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching goal reflections:', error);
      return [];
    }
    
    return data as GoalReflection[];
  } catch (error) {
    console.error('Error in getGoalReflections:', error);
    return [];
  }
}

/**
 * Update goal progress based on completed milestones
 */
export async function updateGoalProgress(goalId: string): Promise<SpiritualGoal | null> {
  try {
    // Get all milestones for the goal
    const { data: milestones, error: milestonesError } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId);
    
    if (milestonesError) {
      console.error('Error fetching milestones for progress update:', milestonesError);
      throw milestonesError;
    }
    
    // Calculate progress percentage
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.is_completed).length;
    
    let progress = 0;
    let status = 'not_started';
    
    if (totalMilestones > 0) {
      progress = Math.round((completedMilestones / totalMilestones) * 100);
      
      if (progress === 0) {
        status = 'not_started';
      } else if (progress < 100) {
        status = 'in_progress';
      } else {
        status = 'completed';
      }
    }
    
    // Update the goal
    const { data, error } = await supabase
      .from('spiritual_goals')
      .update({
        progress,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating goal progress:', error);
      throw error;
    }
    
    return data as SpiritualGoal;
  } catch (error) {
    console.error('Error in updateGoalProgress:', error);
    throw error;
  }
}

/**
 * Generate an AI spiritual goal
 */
export async function generateAIGoal(preferences: GoalPreferences): Promise<SpiritualGoal | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL configuration');
    }
    
    // Call the edge function to generate a goal
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-spiritual-goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        userId: user.id,
        preferences
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate goal: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return result.goal as SpiritualGoal;
  } catch (error) {
    console.error('Error generating AI goal:', error);
    throw error;
  }
}

/**
 * Get AI feedback on a goal reflection
 */
export async function getAIFeedbackOnReflection(
  goalId: string, 
  reflectionContent: string
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL configuration');
    }
    
    // Get the goal details for context
    const goal = await getSpiritualGoalById(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Call OpenAI directly for now (in production, this would be an edge function)
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn('OpenAI API key not available, skipping AI feedback');
      return null;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a wise spiritual mentor providing feedback on a Christian's reflection about their spiritual goal. 
            Your feedback should be encouraging, insightful, and biblically grounded.`
          },
          {
            role: 'user',
            content: `Here is a spiritual goal that someone is working on:
            
            Title: ${goal.title}
            Description: ${goal.description}
            Category: ${goal.category}
            
            They've written this reflection about their progress:
            "${reflectionContent}"
            
            Please provide brief, encouraging feedback (2-3 sentences) that:
            1. Acknowledges their effort and insights
            2. Offers biblical wisdom related to their reflection
            3. Provides gentle guidance for continued growth
            
            Keep your response under 150 words and focus on being supportive and insightful.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });
    
    if (!response.ok) {
      console.error('Error getting AI feedback:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error getting AI feedback on reflection:', error);
    return null;
  }
}