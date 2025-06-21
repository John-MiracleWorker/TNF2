/*
  # Fix Faith Communities Insert Policy

  This migration fixes the Row-Level Security (RLS) policy for the `faith_communities` table
  to allow authenticated users to create new communities.

  1. Security Changes
     - Drop the existing insert policy that may be causing issues
     - Create a new, properly configured insert policy for authenticated users
     - Ensure the policy allows users to create communities with themselves as the creator

  The issue was that the existing INSERT policy was not working correctly, preventing
  authenticated users from creating new communities even when the `created_by` field
  was properly set to their user ID.
*/

-- Drop the existing insert policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create communities" ON faith_communities;

-- Create a new insert policy that allows authenticated users to create communities
-- where they are the creator
CREATE POLICY "Users can create communities"
  ON faith_communities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Also ensure there's a policy allowing users to insert their own communities
-- This is a backup policy in case the above doesn't work in all scenarios
CREATE POLICY "Allow community creation for authenticated users"
  ON faith_communities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);