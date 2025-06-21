/*
  # Bible Study Interactions

  1. New Table
    - `bible_study_interactions`
      - `id` (uuid, primary key)
      - `study_id` (uuid, foreign key to ai_bible_studies)
      - `user_id` (uuid, foreign key to users)
      - `interaction_type` (text) - 'reflection', 'question', 'prayer'
      - `prompt` (text) - what the AI asked/prompted
      - `user_response` (text) - user's response
      - `ai_feedback` (text) - AI's response to user
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create Bible study interactions table
CREATE TABLE IF NOT EXISTS bible_study_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES ai_bible_studies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  prompt text NOT NULL,
  user_response text,
  ai_feedback text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bible_study_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Bible study interactions"
  ON bible_study_interactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Bible study interactions"
  ON bible_study_interactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Bible study interactions"
  ON bible_study_interactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS bible_study_interactions_study_id_idx ON bible_study_interactions(study_id);
CREATE INDEX IF NOT EXISTS bible_study_interactions_user_id_idx ON bible_study_interactions(user_id);