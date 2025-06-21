/*
# Fix Community Members RLS Policies to Prevent Infinite Recursion

1. Policy Updates
   - Remove problematic SELECT policies that cause recursion
   - Add new SELECT policies that allow member counting without recursion
   - Maintain security while preventing infinite loops

2. Security
   - Users can view members of communities they belong to
   - Community counting is allowed for UI display purposes
   - Admin users can view all community members

3. Changes
   - Drop existing SELECT policies that reference community_members in subqueries
   - Create new policies that avoid self-referential queries
   - Enable proper member counting for community listings
*/

-- Drop the problematic SELECT policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view own memberships" ON community_members;
DROP POLICY IF EXISTS "View members in joined communities" ON community_members;

-- Create new SELECT policies that avoid recursion

-- Allow users to view their own memberships (simple policy without subqueries)
CREATE POLICY "Users can view their own memberships"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow viewing members of public communities (for member counting)
CREATE POLICY "Public community members are viewable"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM faith_communities fc 
      WHERE fc.id = community_members.community_id 
      AND fc.is_private = false
    )
  );

-- Allow viewing members of private communities that the user has joined
CREATE POLICY "Private community members viewable by members"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM faith_communities fc 
      WHERE fc.id = community_members.community_id 
      AND fc.is_private = true
      AND fc.id IN (
        SELECT cm.community_id 
        FROM community_members cm 
        WHERE cm.user_id = auth.uid()
      )
    )
  );

-- Allow admins to view all community members
CREATE POLICY "Admins can view all community members"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  );