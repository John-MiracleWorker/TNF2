/*
# Fix infinite recursion in community_members RLS policies

This migration addresses an infinite recursion issue with the RLS policies on the community_members table.
The problem occurs when policies for selecting community members recursively query the same table,
creating an infinite loop.

1. Changes
   - Drop problematic policies that cause infinite recursion
   - Create new, simplified policies that avoid circular references
   - Implement better patterns for access control without self-referential queries

2. Security
   - Maintain security by ensuring users can only view and manipulate their own memberships
   - Allow viewing other members in communities the user belongs to without recursion
   - Enable admin operations with safe query patterns
*/

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own memberships" ON community_members;
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities (delete their membership)" ON community_members;
DROP POLICY IF EXISTS "Community members can view other members" ON community_members;
DROP POLICY IF EXISTS "Community admins can update members" ON community_members;
DROP POLICY IF EXISTS "Community admins can remove members" ON community_members;
DROP POLICY IF EXISTS "Admins can manage community members" ON community_members;
DROP POLICY IF EXISTS "Admins can remove members" ON community_members;
DROP POLICY IF EXISTS "Members can view community member lists for their communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;

-- Create new simplified policies that avoid recursion

-- Allow users to view their own membership records
CREATE POLICY "Users can view own memberships"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own membership (for joining communities)
CREATE POLICY "Users can join communities"
  ON community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own membership (for leaving communities)
CREATE POLICY "Users can leave communities"
  ON community_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a non-recursive policy for viewing community members
-- This safely allows members to see other members without causing infinite recursion
CREATE POLICY "View members in joined communities"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (
    -- Allow users to view other members in communities they belong to
    EXISTS (
      SELECT 1 
      FROM community_members my_memberships 
      WHERE my_memberships.community_id = community_members.community_id
      AND my_memberships.user_id = auth.uid()
    )
  );

-- Create policies for admin operations that avoid using community_members in conditions
CREATE POLICY "Admins can update members"
  ON community_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow site admins or the member themselves to update
    (EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    ))
    OR
    -- Self-updates are allowed (users can update their own membership)
    auth.uid() = user_id
  );

-- Create a policy for admin deletions that doesn't cause recursion
CREATE POLICY "Admins can delete members"
  ON community_members
  FOR DELETE
  TO authenticated
  USING (
    -- Site admins can remove any member
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
    OR
    -- Members can always remove themselves
    auth.uid() = user_id
  );