/*
  # Add AI Bible Studies

  1. New Tables
    - `ai_bible_studies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `title` (text)
      - `scripture_reference` (text)
      - `scripture_text` (text)
      - `content` (text)
      - `reflection_questions` (text[])
      - `personalization_context` (jsonb)
      - `user_notes` (text)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `ai_bible_studies` table
    - Add policies for users to CRUD their own Bible studies
*/

-- Create the ai_bible_studies table
CREATE TABLE IF NOT EXISTS ai_bible_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  scripture_reference text NOT NULL,
  scripture_text text NOT NULL,
  content text NOT NULL,
  reflection_questions text[] DEFAULT '{}',
  personalization_context jsonb DEFAULT '{}',
  user_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ai_bible_studies_user_id_idx ON ai_bible_studies(user_id);
CREATE INDEX IF NOT EXISTS ai_bible_studies_created_at_idx ON ai_bible_studies(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_bible_studies ENABLE ROW LEVEL SECURITY;

-- Define RLS policies
-- Users can insert their own Bible studies
CREATE POLICY "Users can create their own AI Bible studies" 
ON ai_bible_studies FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own Bible studies
CREATE POLICY "Users can view their own AI Bible studies" 
ON ai_bible_studies FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can update their own Bible studies (primarily for notes)
CREATE POLICY "Users can update their own AI Bible studies" 
ON ai_bible_studies FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own Bible studies
CREATE POLICY "Users can delete their own AI Bible studies" 
ON ai_bible_studies FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);