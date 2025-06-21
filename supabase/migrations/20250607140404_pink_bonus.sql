/*
  # Fix RLS policy for user_scripture_stats table

  1. Changes
    - Drop existing problematic INSERT policies that are blocking user signup
    - Create a proper INSERT policy for authenticated users to create their own stats

  2. Security
    - Maintains data isolation by ensuring users can only insert their own records
    - Uses proper auth.uid() = user_id check for INSERT operations
*/

-- Drop existing INSERT policies that are causing conflicts
DROP POLICY IF EXISTS "Allow stats creation during signup" ON user_scripture_stats;

-- Create a proper INSERT policy for authenticated users
CREATE POLICY "Users can insert their own scripture stats"
  ON user_scripture_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);