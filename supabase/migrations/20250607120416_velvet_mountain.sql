/*
  # Gamified Scripture Memory System

  1. New Tables
    - `user_scripture_stats` - Track user progress, streaks, points, level
    - `scripture_achievements` - Define available achievements
    - `user_achievements` - Track which achievements users have earned
    - `scripture_practice_sessions` - Log practice sessions for analytics
    - `scripture_challenges` - Weekly/monthly challenges

  2. Enhancements
    - Add gamification fields to existing scripture_memory table
    - Create views for leaderboards and progress tracking

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user data access
*/

-- User Scripture Statistics
CREATE TABLE IF NOT EXISTS user_scripture_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  verses_memorized INTEGER DEFAULT 0,
  total_practice_time INTEGER DEFAULT 0, -- in minutes
  last_practice_date DATE,
  achievements_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scripture Achievements
CREATE TABLE IF NOT EXISTS scripture_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Lucide icon name
  category TEXT NOT NULL, -- 'milestone', 'streak', 'practice', 'special'
  points_reward INTEGER DEFAULT 0,
  unlock_criteria JSONB NOT NULL, -- {type: 'verses_memorized', target: 10}
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES scripture_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Practice Sessions
CREATE TABLE IF NOT EXISTS scripture_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scripture_memory_id UUID REFERENCES scripture_memory(id) ON DELETE CASCADE,
  practice_type TEXT NOT NULL, -- 'review', 'game', 'quiz', 'typing'
  accuracy_score FLOAT, -- 0.0 to 1.0
  time_spent INTEGER, -- in seconds
  points_earned INTEGER DEFAULT 0,
  mistakes_made INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scripture Challenges
CREATE TABLE IF NOT EXISTS scripture_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'weekly', 'monthly', 'special'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_criteria JSONB NOT NULL, -- {type: 'memorize_verses', target: 3}
  points_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES scripture_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE user_scripture_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scripture stats"
  ON user_scripture_stats FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own practice sessions"
  ON scripture_practice_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own challenge progress"
  ON user_challenge_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievements"
  ON scripture_achievements FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view active challenges"
  ON scripture_challenges FOR SELECT
  USING (is_active = true);

-- Add gamification fields to scripture_memory
ALTER TABLE scripture_memory 
ADD COLUMN IF NOT EXISTS mastery_score FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS practice_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

-- Insert default achievements
INSERT INTO scripture_achievements (code, name, description, icon, category, points_reward, unlock_criteria, rarity) VALUES
('first_verse', 'First Steps', 'Memorize your first Bible verse', 'Trophy', 'milestone', 100, '{"type": "verses_memorized", "target": 1}', 'common'),
('verse_collector', 'Verse Collector', 'Memorize 5 Bible verses', 'Award', 'milestone', 250, '{"type": "verses_memorized", "target": 5}', 'common'),
('memory_champion', 'Memory Champion', 'Memorize 10 Bible verses', 'Crown', 'milestone', 500, '{"type": "verses_memorized", "target": 10}', 'rare'),
('scripture_scholar', 'Scripture Scholar', 'Memorize 25 Bible verses', 'GraduationCap', 'milestone', 1000, '{"type": "verses_memorized", "target": 25}', 'epic'),
('living_word', 'Living Word', 'Memorize 50 Bible verses', 'Zap', 'milestone', 2500, '{"type": "verses_memorized", "target": 50}', 'legendary'),

('faithful_three', 'Faithful Three', 'Practice for 3 days in a row', 'Flame', 'streak', 150, '{"type": "streak", "target": 3}', 'common'),
('weekly_warrior', 'Weekly Warrior', 'Practice for 7 days in a row', 'Sword', 'streak', 300, '{"type": "streak", "target": 7}', 'rare'),
('monthly_master', 'Monthly Master', 'Practice for 30 days in a row', 'Shield', 'streak', 1000, '{"type": "streak", "target": 30}', 'epic'),
('unstoppable', 'Unstoppable', 'Practice for 100 days in a row', 'Infinity', 'streak', 5000, '{"type": "streak", "target": 100}', 'legendary'),

('quick_learner', 'Quick Learner', 'Achieve 90% accuracy in practice', 'Target', 'practice', 200, '{"type": "accuracy", "target": 0.9}', 'common'),
('perfect_practice', 'Perfect Practice', 'Complete a practice session with 100% accuracy', 'Star', 'practice', 300, '{"type": "accuracy", "target": 1.0}', 'rare'),
('speed_reader', 'Speed Reader', 'Complete practice in under 60 seconds', 'Zap', 'practice', 250, '{"type": "speed", "target": 60}', 'common'),

('early_bird', 'Early Bird', 'Practice before 8 AM', 'Sunrise', 'special', 100, '{"type": "time_of_day", "target": "morning"}', 'common'),
('night_owl', 'Night Owl', 'Practice after 10 PM', 'Moon', 'special', 100, '{"type": "time_of_day", "target": "night"}', 'common'),
('weekend_warrior', 'Weekend Warrior', 'Practice on weekends', 'Calendar', 'special', 150, '{"type": "day_type", "target": "weekend"}', 'common');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_scripture_stats_user_id_idx ON user_scripture_stats(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS scripture_practice_sessions_user_id_idx ON scripture_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS scripture_practice_sessions_date_idx ON scripture_practice_sessions(created_at);

-- Create leaderboard view
CREATE VIEW scripture_leaderboard WITH (security_invoker = true) AS
SELECT 
  uss.user_id,
  p.display_name,
  p.first_name,
  uss.total_points,
  uss.current_level,
  uss.verses_memorized,
  uss.longest_streak,
  uss.achievements_count,
  ROW_NUMBER() OVER (ORDER BY uss.total_points DESC) as rank
FROM user_scripture_stats uss
LEFT JOIN profiles p ON uss.user_id = p.id
ORDER BY uss.total_points DESC
LIMIT 100;

-- Function to calculate level from experience points
CREATE OR REPLACE FUNCTION calculate_level(exp_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level = floor(sqrt(exp_points / 100)) + 1
  -- This means: Level 1 = 0-99 XP, Level 2 = 100-399 XP, Level 3 = 400-899 XP, etc.
  RETURN FLOOR(SQRT(exp_points / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_scripture_stats(
  p_user_id UUID,
  p_points_earned INTEGER DEFAULT 0,
  p_practice_completed BOOLEAN DEFAULT false,
  p_verse_memorized BOOLEAN DEFAULT false
)
RETURNS void AS $$
DECLARE
  current_stats user_scripture_stats%ROWTYPE;
  new_level INTEGER;
BEGIN
  -- Get or create user stats
  SELECT * INTO current_stats
  FROM user_scripture_stats
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_scripture_stats (user_id, total_points, experience_points)
    VALUES (p_user_id, p_points_earned, p_points_earned)
    RETURNING * INTO current_stats;
  ELSE
    -- Update existing stats
    UPDATE user_scripture_stats
    SET 
      total_points = total_points + p_points_earned,
      experience_points = experience_points + p_points_earned,
      verses_memorized = CASE WHEN p_verse_memorized THEN verses_memorized + 1 ELSE verses_memorized END,
      last_practice_date = CASE WHEN p_practice_completed THEN CURRENT_DATE ELSE last_practice_date END,
      current_streak = CASE 
        WHEN p_practice_completed AND (last_practice_date IS NULL OR last_practice_date = CURRENT_DATE - INTERVAL '1 day') 
        THEN current_streak + 1
        WHEN p_practice_completed AND last_practice_date != CURRENT_DATE - INTERVAL '1 day'
        THEN 1
        ELSE current_streak
      END,
      longest_streak = CASE 
        WHEN p_practice_completed THEN GREATEST(longest_streak, current_streak + 1)
        ELSE longest_streak
      END,
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO current_stats;
  END IF;
  
  -- Calculate new level
  new_level := calculate_level(current_stats.experience_points);
  
  -- Update level if changed
  IF new_level != current_stats.current_level THEN
    UPDATE user_scripture_stats
    SET current_level = new_level
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create weekly challenges
INSERT INTO scripture_challenges (title, description, challenge_type, start_date, end_date, target_criteria, points_reward) VALUES
('Weekly Memory Challenge', 'Memorize 3 new verses this week', 'weekly', 
  date_trunc('week', CURRENT_DATE), 
  date_trunc('week', CURRENT_DATE) + INTERVAL '6 days',
  '{"type": "memorize_verses", "target": 3}', 500),
('Practice Makes Perfect', 'Complete 5 practice sessions this week', 'weekly',
  date_trunc('week', CURRENT_DATE),
  date_trunc('week', CURRENT_DATE) + INTERVAL '6 days', 
  '{"type": "practice_sessions", "target": 5}', 300);