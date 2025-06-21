/*
  # Prayer Community Feature
  
  1. New Table
    - `prayer_interactions` - Tracks when users pray for others' prayer requests
      - `id` (uuid, primary key)
      - `prayer_id` (uuid, foreign key to prayer_requests)
      - `user_id` (uuid, foreign key to users)
      - `prayed_at` (timestamp)
      - Unique constraint on (prayer_id, user_id)
  
  2. Modifications
    - Add prayer_count column to prayer_requests
  
  3. Functions
    - Add function to increment prayer count
  
  4. Security
    - Enable RLS on the prayer_interactions table
    - Add policy for users to track their own prayers
*/

-- Create prayer interactions table
CREATE TABLE IF NOT EXISTS prayer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prayed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prayer_id, user_id)
);

-- Enable RLS
ALTER TABLE prayer_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can track their own prayers"
  ON prayer_interactions
  FOR ALL
  USING (auth.uid() = user_id);

-- Add prayer_count column to prayer_requests table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_requests' AND column_name = 'prayer_count'
  ) THEN
    ALTER TABLE prayer_requests ADD COLUMN prayer_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create function to increment prayer count
CREATE OR REPLACE FUNCTION increment_prayer_count(prayer_id UUID)
RETURNS prayer_requests AS $$
DECLARE
  updated_request prayer_requests;
BEGIN
  UPDATE prayer_requests
  SET prayer_count = COALESCE(prayer_count, 0) + 1
  WHERE id = prayer_id
  RETURNING * INTO updated_request;
  
  RETURN updated_request;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS prayer_interactions_prayer_id_idx ON prayer_interactions(prayer_id);
CREATE INDEX IF NOT EXISTS prayer_interactions_user_id_idx ON prayer_interactions(user_id);