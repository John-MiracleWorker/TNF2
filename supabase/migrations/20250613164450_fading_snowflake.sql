/*
  # Bible Reading Plans Schema
  
  1. New Tables
    - `bible_reading_plans` - For storing reading plan information
    - `plan_daily_readings` - Individual daily readings for each plan
    - `user_reading_progress` - Track user progress through plans
    - `reading_reflections` - Store user reflections and AI feedback
  
  2. Functions
    - Function to complete a reading day and update progress
  
  3. Sample Data
    - Two initial reading plans with daily readings for testing
*/

-- Create bible_reading_plans table
CREATE TABLE IF NOT EXISTS bible_reading_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  theme TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create plan_daily_readings table
CREATE TABLE IF NOT EXISTS plan_daily_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bible_reading_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  reflection_questions TEXT[] DEFAULT '{}',
  prayer_prompt TEXT,
  UNIQUE(plan_id, day_number)
);

-- Create user_reading_progress table
CREATE TABLE IF NOT EXISTS user_reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES bible_reading_plans(id) ON DELETE CASCADE,
  current_day INTEGER DEFAULT 1,
  start_date DATE DEFAULT CURRENT_DATE,
  last_completed_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completion_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Create reading_reflections table
CREATE TABLE IF NOT EXISTS reading_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES bible_reading_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  reflection_text TEXT NOT NULL,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_id, day_number)
);

-- Enable Row Level Security
ALTER TABLE bible_reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_daily_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_reflections ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Bible reading plans are publicly viewable
CREATE POLICY "Anyone can view active reading plans"
  ON bible_reading_plans
  FOR SELECT
  USING (is_active = true);

-- Plan daily readings are publicly viewable
CREATE POLICY "Anyone can view plan daily readings"
  ON plan_daily_readings
  FOR SELECT
  USING (true);

-- User reading progress is private to each user
CREATE POLICY "Users can view their own reading progress"
  ON user_reading_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading progress"
  ON user_reading_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading progress"
  ON user_reading_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Reading reflections are private to each user
CREATE POLICY "Users can view their own reading reflections"
  ON reading_reflections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading reflections"
  ON reading_reflections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading reflections"
  ON reading_reflections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS plan_daily_readings_plan_id_idx ON plan_daily_readings(plan_id);
CREATE INDEX IF NOT EXISTS user_reading_progress_user_id_idx ON user_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS user_reading_progress_plan_id_idx ON user_reading_progress(plan_id);
CREATE INDEX IF NOT EXISTS reading_reflections_user_id_idx ON reading_reflections(user_id);
CREATE INDEX IF NOT EXISTS reading_reflections_plan_id_idx ON reading_reflections(plan_id);

-- Create function to complete a reading day and update progress
CREATE OR REPLACE FUNCTION complete_reading_day(
  p_plan_id UUID,
  p_day_number INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_progress RECORD;
  v_is_completed BOOLEAN;
  v_next_day INTEGER;
BEGIN
  -- Get the plan to know its duration
  SELECT * INTO v_plan FROM bible_reading_plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the user already has progress for this plan
  SELECT * INTO v_progress FROM user_reading_progress 
  WHERE plan_id = p_plan_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new progress entry
    INSERT INTO user_reading_progress (
      user_id,
      plan_id,
      current_day,
      start_date,
      last_completed_date,
      is_completed
    ) VALUES (
      p_user_id,
      p_plan_id,
      p_day_number + 1,
      CURRENT_DATE,
      CURRENT_DATE,
      p_day_number >= v_plan.duration_days
    );
  ELSE
    -- Only update if the day number is valid and hasn't been surpassed yet
    IF p_day_number <= v_progress.current_day THEN
      v_is_completed := p_day_number >= v_plan.duration_days;
      v_next_day := CASE WHEN v_is_completed THEN p_day_number ELSE p_day_number + 1 END;
      
      UPDATE user_reading_progress
      SET 
        current_day = v_next_day,
        last_completed_date = CURRENT_DATE,
        is_completed = CASE WHEN v_is_completed THEN TRUE ELSE is_completed END,
        completion_date = CASE WHEN v_is_completed AND completion_date IS NULL THEN CURRENT_DATE ELSE completion_date END
      WHERE id = v_progress.id;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample reading plans for testing
INSERT INTO bible_reading_plans (title, description, duration_days, theme) VALUES
('7-Day Prayer Journey', 'A week-long journey through Biblical prayers to deepen your prayer life', 7, 'prayer'),
('30-Day Psalms Challenge', 'Immerse yourself in the Psalms for a month of praise, lament, and spiritual growth', 30, 'worship'),
('21-Day New Testament Highlights', 'A three-week tour through key passages of the New Testament', 21, 'new-testament'),
('10-Day Spiritual Renewal', 'Reconnect with God through key passages about renewal and restoration', 10, 'renewal'),
('14-Day Wisdom Journey', 'Explore Biblical wisdom through Proverbs and James', 14, 'wisdom');

-- Insert sample daily readings for the 7-Day Prayer Journey
INSERT INTO plan_daily_readings (plan_id, day_number, title, description, scripture_reference, reflection_questions, prayer_prompt) VALUES
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  1,
  'The Lord''s Prayer',
  'Jesus taught his disciples this model prayer that covers all the essentials of communing with God.',
  'Matthew 6:9-13',
  ARRAY['What aspects of the Lord''s Prayer stand out to you today?', 'Which part of this prayer do you find most challenging to pray sincerely?', 'How might this prayer reshape your own prayers?'],
  'Pray through each section of the Lord''s Prayer slowly, personalizing it to your current circumstances.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  2,
  'Hannah''s Prayer',
  'Hannah''s heartfelt prayer for a child demonstrates the power of passionate, specific requests.',
  '1 Samuel 1:9-20',
  ARRAY['What strikes you about Hannah''s vulnerable prayer?', 'Have you ever prayed for something with this level of emotion?', 'How did Hannah''s faith shape her prayer?'],
  'Bring your deepest desires to God today, with complete honesty and trust in His wisdom.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  3,
  'David''s Prayer of Repentance',
  'After his sin with Bathsheba, David models genuine repentance in this powerful psalm.',
  'Psalm 51:1-17',
  ARRAY['What elements of true repentance do you see in David''s prayer?', 'Why is acknowledging sin before God so important?', 'How does David''s prayer reveal both God''s holiness and mercy?'],
  'Spend time in honest confession today, asking God to reveal areas where repentance is needed.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  4,
  'Solomon''s Prayer for Wisdom',
  'When given a chance to ask for anything, Solomon requests wisdom to lead well.',
  '1 Kings 3:5-15',
  ARRAY['Why do you think Solomon asked for wisdom rather than wealth or power?', 'What would you ask for if God gave you the same opportunity?', 'How might praying for wisdom change your daily decisions?'],
  'Ask God for wisdom in specific areas of your life where you need guidance right now.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  5,
  'Daniel''s Faithful Prayer',
  'Daniel demonstrates unwavering commitment to prayer even when it was dangerous.',
  'Daniel 6:6-13',
  ARRAY['What obstacles to consistent prayer do you face?', 'How did Daniel''s prayer habits strengthen him for trials?', 'What practices could help you develop more consistent prayer?'],
  'Commit to a specific prayer rhythm today, regardless of distractions or challenges.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  6,
  'Jesus in Gethsemane',
  'Jesus models surrendered prayer in his most difficult hour.',
  'Luke 22:39-46',
  ARRAY['What stands out to you about Jesus'' prayer in Gethsemane?', 'How does Jesus balance honest expression with submission to God''s will?', 'When have you had to pray for God''s will over your own desires?'],
  'Pray about something difficult you''re facing, expressing both your desires and your surrender to God''s will.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '7-Day Prayer Journey' LIMIT 1),
  7,
  'Paul''s Prayer for the Church',
  'Paul''s prayers for believers reveal his spiritual priorities and hopes for the church.',
  'Ephesians 3:14-21',
  ARRAY['What specific things does Paul pray for in this passage?', 'How might your prayers for others change if you prayed like Paul?', 'Which part of Paul''s prayer do you most need in your own life?'],
  'Pray this prayer for yourself, then adapt it to pray for several people in your life.'
);

-- Insert sample daily readings for the first 5 days of the 10-Day Spiritual Renewal plan
INSERT INTO plan_daily_readings (plan_id, day_number, title, description, scripture_reference, reflection_questions, prayer_prompt) VALUES
(
  (SELECT id FROM bible_reading_plans WHERE title = '10-Day Spiritual Renewal' LIMIT 1),
  1,
  'New Life in Christ',
  'The foundation of spiritual renewal is understanding our new identity in Christ.',
  '2 Corinthians 5:17-21',
  ARRAY['What does it mean to be a "new creation" in Christ?', 'In what areas of your life do you most need renewal right now?', 'How does being an "ambassador for Christ" change your daily perspective?'],
  'Thank God for making you new in Christ and ask Him to help you embrace your identity as His ambassador.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '10-Day Spiritual Renewal' LIMIT 1),
  2,
  'Renewing Your Mind',
  'Spiritual transformation begins with how we think.',
  'Romans 12:1-2',
  ARRAY['What does it mean to be "transformed by the renewing of your mind"?', 'What patterns of worldly thinking do you notice in yourself?', 'What specific thought patterns need to change in your life?'],
  'Ask God to help you identify thought patterns that need renewal and to fill your mind with His truth.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '10-Day Spiritual Renewal' LIMIT 1),
  3,
  'Letting Go of the Past',
  'Moving forward requires releasing what''s behind.',
  'Philippians 3:12-14',
  ARRAY['What from your past are you still holding onto that hinders your spiritual growth?', 'What does it mean to "press on toward the goal"?', 'How can forgetting what is behind help you move forward?'],
  'Ask God to help you release past regrets, hurts, or failures that are holding you back from spiritual growth.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '10-Day Spiritual Renewal' LIMIT 1),
  4,
  'Restoration After Failure',
  'God specializes in restoring us after we fall.',
  'Psalm 51:10-12',
  ARRAY['When have you experienced God''s restoration after failure?', 'What does having a "clean heart" and "right spirit" mean to you?', 'How does spiritual renewal affect your joy?'],
  'Confess any areas where you feel you''ve failed God, and ask for His complete restoration.'
),
(
  (SELECT id FROM bible_reading_plans WHERE title = '10-Day Spiritual Renewal' LIMIT 1),
  5,
  'Walking in the Spirit',
  'The Holy Spirit empowers our renewed life.',
  'Galatians 5:16-25',
  ARRAY['What difference do you see between the works of the flesh and the fruit of the Spirit?', 'Which aspects of the fruit of the Spirit are strongest in your life? Which need more development?', 'What practical steps can you take to "keep in step with the Spirit"?'],
  'Ask the Holy Spirit to produce His fruit in your life and to guide your daily walk.'
);