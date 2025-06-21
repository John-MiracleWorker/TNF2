/*
  # Fix infinite recursion in community_members RLS policies

  1. Problem
    - The SELECT policy "Community members can view other members (fixed)" creates infinite recursion
    - It queries community_members table within the policy condition for the same table
    - This causes circular dependency when trying to fetch community data

  2. Solution
    - Drop the problematic recursive policy
    - Simplify the SELECT policies to avoid self-referential queries
    - Keep policies that directly reference auth.uid() without subqueries on the same table

  3. Updated Policies
    - Users can view their own memberships (direct uid check)
    - Remove the recursive policy that checks membership via subquery
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Community members can view other members (fixed)" ON community_members;

-- Drop the duplicate policy to clean up
DROP POLICY IF EXISTS "Users can view their own memberships" ON community_members;

-- Create a single, simple SELECT policy that doesn't cause recursion
CREATE POLICY "Users can view their own memberships" 
  ON community_members 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Also ensure the other policies don't have recursion issues
-- Keep the existing policies that work correctly:
-- - "Users can join communities" (INSERT)
-- - "Users can leave communities" (DELETE with user_id = auth.uid())
-- - Admin policies can be handled at application level when needed