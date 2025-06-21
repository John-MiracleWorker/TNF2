/*
  # AI Goal Setting Feature
  
  1. New Tables
    - `spiritual_goals` - For storing user's spiritual goals
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text) - Goal title
      - `description` (text) - Detailed goal description
      - `target_date` (date) - Target completion date
      - `status` (text) - 'not_started', 'in_progress', 'completed', 'abandoned'
      - `progress` (integer) - 0-100 percentage of completion
      - `category` (text) - 'prayer', 'bible_study', 'service', 'worship', etc.
      - `is_ai_generated` (boolean) - Whether this goal was AI-generated
      - `ai_context` (jsonb) - Context used by AI to generate this goal
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `goal_milestones` - For tracking progress toward goals
      - `id` (uuid, primary key)
      - `goal_id` (uuid, foreign key to spiritual_goals)
      - `title` (text) - Milestone title
      - `description` (text) - Milestone description
      - `target_date` (date) - Target date for this milestone
      - `is_completed` (boolean) - Whether milestone is completed
      - `completed_at` (timestamptz) - When milestone was completed
      - `created_at` (timestamptz)
      
    - `goal_reflections` - For user reflections on goal progress
      - `id` (uuid, primary key)
      - `goal_id` (uuid, foreign key to spiritual_goals)
      - `content` (text) - Reflection content
      - `ai_feedback` (text) - AI feedback on reflection
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own goals
*/

-- Create spiritual_goals table
CREATE TABLE IF NOT EXISTS spiritual_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  category TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create goal_milestones table
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES spiritual_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create goal_reflections table
CREATE TABLE IF NOT EXISTS goal_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES spiritual_goals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE spiritual_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_reflections ENABLE ROW LEVEL SECURITY;

-- Create policies for spiritual_goals
CREATE POLICY "Users can view their own spiritual goals"
  ON spiritual_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spiritual goals"
  ON spiritual_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spiritual goals"
  ON spiritual_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spiritual goals"
  ON spiritual_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for goal_milestones
CREATE POLICY "Users can view their own goal milestones"
  ON goal_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_milestones.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own goal milestones"
  ON goal_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_milestones.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goal milestones"
  ON goal_milestones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_milestones.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal milestones"
  ON goal_milestones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_milestones.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

-- Create policies for goal_reflections
CREATE POLICY "Users can view their own goal reflections"
  ON goal_reflections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_reflections.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own goal reflections"
  ON goal_reflections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_reflections.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goal reflections"
  ON goal_reflections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_reflections.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal reflections"
  ON goal_reflections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spiritual_goals
      WHERE spiritual_goals.id = goal_reflections.goal_id
      AND spiritual_goals.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS spiritual_goals_user_id_idx ON spiritual_goals(user_id);
CREATE INDEX IF NOT EXISTS spiritual_goals_category_idx ON spiritual_goals(category);
CREATE INDEX IF NOT EXISTS spiritual_goals_status_idx ON spiritual_goals(status);
CREATE INDEX IF NOT EXISTS goal_milestones_goal_id_idx ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS goal_reflections_goal_id_idx ON goal_reflections(goal_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_spiritual_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_spiritual_goals_timestamp
BEFORE UPDATE ON spiritual_goals
FOR EACH ROW
EXECUTE FUNCTION update_spiritual_goals_updated_at();