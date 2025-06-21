/*
  # Create Sermon Analysis Tables

  1. New Tables
    - `sermon_summaries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `sermon_date` (date)
      - `audio_url` (text)
      - `video_url` (text)
      - `transcription_text` (text)
      - `summary_text` (text)
      - `follow_up_questions` (text array)
      - `ai_context` (jsonb)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `sermon_summaries` table
    - Add policies for CRUD operations
    
  3. Changes
    - Add indexes for performance
*/

-- Create sermon_summaries table for storing analyzed sermon data
CREATE TABLE IF NOT EXISTS sermon_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sermon_date DATE DEFAULT CURRENT_DATE,
  audio_url TEXT,
  video_url TEXT,
  transcription_text TEXT,
  summary_text TEXT,
  follow_up_questions TEXT[],
  ai_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS sermon_summaries_user_id_idx ON sermon_summaries(user_id);
CREATE INDEX IF NOT EXISTS sermon_summaries_created_at_idx ON sermon_summaries(created_at DESC);

-- Enable row level security
ALTER TABLE sermon_summaries ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can select their own sermon summaries"
  ON sermon_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sermon summaries"
  ON sermon_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sermon summaries"
  ON sermon_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sermon summaries"
  ON sermon_summaries
  FOR DELETE
  USING (auth.uid() = user_id);