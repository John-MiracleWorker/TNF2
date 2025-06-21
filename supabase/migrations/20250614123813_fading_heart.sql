/*
  # Fix faith_communities INSERT policy

  1. Security
    - Drop the existing INSERT policy that's causing issues
    - Create a new INSERT policy that properly allows authenticated users to create communities
    - Ensure the policy check uses the correct syntax and comparison order

  The issue was with the RLS policy preventing authenticated users from inserting into faith_communities.
  This migration fixes the INSERT policy to properly allow community creation.
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create communities" ON faith_communities;

-- Create a new INSERT policy that works correctly
CREATE POLICY "Users can create communities"
  ON faith_communities
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());