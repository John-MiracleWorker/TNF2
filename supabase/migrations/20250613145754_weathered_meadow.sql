/*
  # Fix Mood Entries RLS Policy
  
  1. Changes
    - Drop existing RLS policy for mood_entries table
    - Create a new, properly configured policy that allows users to insert their own mood entries
  
  2. Security
    - Ensure users can only insert mood entries for themselves
    - Maintain existing policies for other operations
*/

-- Drop the existing policy if it's causing issues
DROP POLICY IF EXISTS "Users can CRUD their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can insert their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can select their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can update their own mood entries" ON mood_entries;
DROP POLICY IF EXISTS "Users can delete their own mood entries" ON mood_entries;

-- Create separate policies for each operation
CREATE POLICY "Users can insert their own mood entries"
  ON mood_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own mood entries"
  ON mood_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood entries"
  ON mood_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood entries"
  ON mood_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);