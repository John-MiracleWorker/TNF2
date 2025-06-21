/*
  # Enhanced TrueNorth Features Schema

  1. New Tables
    - `users_auth` - Extended user authentication data
    - `prayer_requests` - For tracking prayer requests
    - `scripture_memory` - For scripture memorization
    - `daily_devotionals` - For storing daily devotionals
    - `spiritual_habits` - For tracking spiritual disciplines
    - `bible_study_notes` - For Bible study notes
    - `mood_entries` - For tracking spiritual/emotional wellbeing
    - `notifications` - For user notifications/reminders
    - `content_recommendations` - For personalized content suggestions

  2. Modifications
    - Enhanced journal_entries table with additional fields
    - Enhanced profiles table with additional user preferences

  3. Security
    - Added appropriate RLS policies for each table
*/

-- 1. Extended user authentication data
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_preferences JSONB DEFAULT '{"prayer_reminders": true, "bible_reading": true, "journal_prompts": true}'::JSONB,
  theme VARCHAR(20) DEFAULT 'light',
  verse_translation VARCHAR(20) DEFAULT 'NIV',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = id);

-- 2. Prayer Requests Tracking
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  answered_date TIMESTAMPTZ,
  answered_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  shared BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}'
);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own prayer requests"
  ON prayer_requests
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared prayer requests"
  ON prayer_requests
  FOR SELECT
  USING (shared = true);

-- 3. Scripture Memory
CREATE TABLE IF NOT EXISTS scripture_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  translation VARCHAR(20) DEFAULT 'NIV',
  memorized_level INTEGER DEFAULT 0, -- 0-5 scale of memorization
  last_practiced TIMESTAMPTZ DEFAULT now(),
  next_review TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  tags TEXT[] DEFAULT '{}'
);

ALTER TABLE scripture_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own scripture memory entries"
  ON scripture_memory
  FOR ALL
  USING (auth.uid() = user_id);

-- 4. Daily Devotionals
CREATE TABLE IF NOT EXISTS daily_devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  scripture_text TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  publish_date DATE DEFAULT CURRENT_DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_devotionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view devotionals"
  ON daily_devotionals
  FOR SELECT
  USING (true);

-- 5. User Devotional Progress
CREATE TABLE IF NOT EXISTS user_devotional_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  devotional_id UUID REFERENCES daily_devotionals(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  favorite BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE user_devotional_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own devotional progress"
  ON user_devotional_progress
  FOR ALL
  USING (auth.uid() = user_id);

-- 6. Spiritual Habits
CREATE TABLE IF NOT EXISTS spiritual_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  goal_frequency TEXT NOT NULL, -- 'daily', 'weekly', etc.
  goal_amount INTEGER DEFAULT 1,
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE spiritual_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own spiritual habits"
  ON spiritual_habits
  FOR ALL
  USING (auth.uid() = user_id);

-- 7. Habit Logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES spiritual_habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE DEFAULT CURRENT_DATE,
  amount INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own habit logs"
  ON habit_logs
  FOR ALL
  USING (auth.uid() = user_id);

-- 8. Bible Study Notes
CREATE TABLE IF NOT EXISTS bible_study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_favorite BOOLEAN DEFAULT false
);

ALTER TABLE bible_study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own Bible study notes"
  ON bible_study_notes
  FOR ALL
  USING (auth.uid() = user_id);

-- 9. Mood & Spiritual Wellbeing Tracker
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  spiritual_score INTEGER NOT NULL CHECK (spiritual_score BETWEEN 1 AND 10),
  prayer_time BOOLEAN DEFAULT false,
  bible_reading BOOLEAN DEFAULT false,
  church_attendance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  entry_date DATE DEFAULT CURRENT_DATE
);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own mood entries"
  ON mood_entries
  FOR ALL
  USING (auth.uid() = user_id);

-- 10. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'prayer', 'scripture', 'devotional', etc.
  is_read BOOLEAN DEFAULT false,
  action_link TEXT, -- Optional link to navigate to
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 11. Content Recommendations
CREATE TABLE IF NOT EXISTS content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'devotional', 'scripture', 'prayer', etc.
  content_id UUID, -- Can reference various content tables
  is_viewed BOOLEAN DEFAULT false,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  relevance_score FLOAT DEFAULT 0.0
);

ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
  ON content_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON content_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Update journal_entries table with new fields
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mood_score INTEGER,
ADD COLUMN IF NOT EXISTS spiritual_score INTEGER,
ADD COLUMN IF NOT EXISTS related_scripture TEXT;

-- Update profiles table with additional fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_preferences_updated_at') THEN
    CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prayer_requests_updated_at') THEN
    CREATE TRIGGER prayer_requests_updated_at
    BEFORE UPDATE ON prayer_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bible_study_notes_updated_at') THEN
    CREATE TRIGGER bible_study_notes_updated_at
    BEFORE UPDATE ON bible_study_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;