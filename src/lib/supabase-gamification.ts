import { supabase } from './supabase';
import type { 
  UserStats, 
  Achievement, 
  UserAchievement, 
  PracticeSession, 
  Challenge, 
  UserChallengeProgress 
} from './gamification';

// User Stats
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_scripture_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

export async function updateUserStats(
  userId: string,
  pointsEarned: number = 0,
  practiceCompleted: boolean = false,
  verseMemorized: boolean = false
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_scripture_stats', {
      p_user_id: userId,
      p_points_earned: pointsEarned,
      p_practice_completed: practiceCompleted,
      p_verse_memorized: verseMemorized
    });

    if (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}

// Achievements
export async function getAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('scripture_achievements')
      .select('*')
      .order('points_reward', { ascending: true });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:scripture_achievements(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }
}

export async function awardAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId
      })
      .select(`
        *,
        achievement:scripture_achievements(*)
      `)
      .single();

    if (error) {
      console.error('Error awarding achievement:', error);
      return null;
    }

    // Update achievements count in user stats
    await supabase
      .from('user_scripture_stats')
      .update({
        achievements_count: supabase.sql`achievements_count + 1`
      })
      .eq('user_id', userId);

    return data;
  } catch (error) {
    console.error('Error awarding achievement:', error);
    return null;
  }
}

// Practice Sessions
export async function savePracticeSession(session: PracticeSession): Promise<PracticeSession | null> {
  try {
    const { data, error } = await supabase
      .from('scripture_practice_sessions')
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error('Error saving practice session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error saving practice session:', error);
    return null;
  }
}

export async function getPracticeHistory(userId: string, limit: number = 10): Promise<PracticeSession[]> {
  try {
    const { data, error } = await supabase
      .from('scripture_practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching practice history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching practice history:', error);
    return [];
  }
}

// Challenges
export async function getActiveChallenges(): Promise<Challenge[]> {
  try {
    const { data, error } = await supabase
      .from('scripture_challenges')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('end_date', { ascending: true });

    if (error) {
      console.error('Error fetching challenges:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return [];
  }
}

export async function getUserChallengeProgress(userId: string): Promise<UserChallengeProgress[]> {
  try {
    const { data, error } = await supabase
      .from('user_challenge_progress')
      .select(`
        *,
        challenge:scripture_challenges(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching challenge progress:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching challenge progress:', error);
    return [];
  }
}

export async function updateChallengeProgress(
  userId: string, 
  challengeId: string, 
  progress: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_challenge_progress')
      .upsert({
        user_id: userId,
        challenge_id: challengeId,
        current_progress: progress,
        completed: false
      }, {
        onConflict: 'user_id,challenge_id'
      });

    if (error) {
      console.error('Error updating challenge progress:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    throw error;
  }
}

// Leaderboard
export async function getLeaderboard(limit: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('scripture_leaderboard')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export async function getUserRank(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('scripture_leaderboard')
      .select('rank')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user rank:', error);
      return null;
    }

    return data?.rank || null;
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return null;
  }
}