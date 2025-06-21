/*
  # Public Sermon Analysis Access
  
  1. Changes
    - Update RLS policy to make sermon analysis publicly available to all users
    - Drop the existing policy that restricts access to only the creator
*/

-- Drop existing Select policy
DROP POLICY IF EXISTS "Users can select their own sermon summaries" ON sermon_summaries;

-- Create new public access policy
CREATE POLICY "Anyone can view sermon summaries" 
  ON sermon_summaries
  FOR SELECT
  USING (true);

-- Keep the insert/update/delete policies restricted to the owner
-- These policies remain unchanged