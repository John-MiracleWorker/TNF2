/*
  # AI Devotionals Schema

  1. New Tables
    - `ai_devotionals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `title` (text)
      - `scripture_reference` (text)
      - `scripture_text` (text)
      - `content` (text)
      - `reflection_questions` (text array)
      - `personalization_context` (jsonb) - stores what data was used to personalize
      - `created_at` (timestamp)
    - `ai_devotional_interactions`
      - `id` (uuid, primary key)
      - `devotional_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `interaction_type` (text) - 'reflection', 'question', 'prayer'
      - `prompt` (text) - what the AI asked/prompted
      - `user_response` (text) - user's response
      - `ai_feedback` (text) - AI's response to user
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own devotionals and interactions
*/

-- Create AI devotionals table
CREATE TABLE IF NOT EXISTS ai_devotionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  scripture_reference text NOT NULL,
  scripture_text text NOT NULL,
  content text NOT NULL,
  reflection_questions text[] DEFAULT '{}',
  personalization_context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create AI devotional interactions table
CREATE TABLE IF NOT EXISTS ai_devotional_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devotional_id uuid REFERENCES ai_devotionals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  prompt text NOT NULL,
  user_response text,
  ai_feedback text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_devotionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_devotional_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for ai_devotionals
CREATE POLICY "Users can view their own AI devotionals"
  ON ai_devotionals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI devotionals"
  ON ai_devotionals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI devotionals"
  ON ai_devotionals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI devotionals"
  ON ai_devotionals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for ai_devotional_interactions
CREATE POLICY "Users can view their own devotional interactions"
  ON ai_devotional_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own devotional interactions"
  ON ai_devotional_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devotional interactions"
  ON ai_devotional_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS ai_devotionals_user_id_idx ON ai_devotionals(user_id);
CREATE INDEX IF NOT EXISTS ai_devotionals_created_at_idx ON ai_devotionals(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_devotional_interactions_devotional_id_idx ON ai_devotional_interactions(devotional_id);
CREATE INDEX IF NOT EXISTS ai_devotional_interactions_user_id_idx ON ai_devotional_interactions(user_id);