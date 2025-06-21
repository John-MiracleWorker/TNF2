/*
  # Add cached insights table

  1. New Tables
    - `user_insights_cache`
      - `user_id` (uuid, primary key, references users.id)
      - `time_range` (text, part of primary key)
      - `insights` (jsonb)
      - `analytics_data` (jsonb)
      - `generated_at` (timestamptz)
  2. Security
    - Enable RLS on `user_insights_cache` table
    - Add policy for users to access their own insights
*/

-- Create table to cache user spiritual insights
CREATE TABLE IF NOT EXISTS user_insights_cache (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  time_range TEXT NOT NULL,
  insights JSONB NOT NULL,
  analytics_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, time_range)
);

-- Enable RLS
ALTER TABLE user_insights_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own insights
CREATE POLICY "Users can read their own insights" 
  ON user_insights_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
  
-- Create policy for users to update their own insights
CREATE POLICY "Users can update their own insights" 
  ON user_insights_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
  
-- Create policy for users to insert their own insights
CREATE POLICY "Users can insert their own insights" 
  ON user_insights_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);