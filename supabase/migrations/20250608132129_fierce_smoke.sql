/*
  # Voice Usage Logs

  1. New Table
    - `voice_usage_logs`: Track ElevenLabs voice usage
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `characters` (integer) - text length processed 
      - `voice_id` (text) - ElevenLabs voice ID
      - `model_id` (text) - ElevenLabs model ID used
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for tracking user usage
*/

-- Create voice usage logs table
CREATE TABLE IF NOT EXISTS voice_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  characters INTEGER NOT NULL,
  voice_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE voice_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice usage logs"
  ON voice_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add dev_simulate_pro column to profiles for development testing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dev_simulate_pro'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dev_simulate_pro BOOLEAN DEFAULT false;
  END IF;
END $$;