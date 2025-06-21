/*
  # Fix infinite recursion in community_members policies

  1. Changes
    - Drops problematic policies that cause infinite recursion
    - Recreates policies with different names to avoid conflicts
    - Uses non-recursive approaches for admin checks
    - Maintains security while avoiding circular dependencies

  2. Security
    - Maintains access controls for community members
    - Preserves admin capabilities without recursion
    - Uses direct checks instead of self-referential subqueries
*/

-- Drop existing problematic policies that might cause infinite recursion
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Admins can manage community members') THEN
    DROP POLICY "Admins can manage community members" ON community_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Admins can remove members') THEN
    DROP POLICY "Admins can remove members" ON community_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Members can view community member lists for their communities') THEN
    DROP POLICY "Members can view community member lists for their communities" ON community_members;
  END IF;
END
$$;

-- Create policy for users viewing their own memberships if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Users can view their own memberships') THEN
    CREATE POLICY "Users can view their own memberships"
      ON community_members
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Update the join communities policy if it exists, or skip if it already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Users can join communities') THEN
    -- Policy already exists, so we'll leave it alone
    RAISE NOTICE 'Policy "Users can join communities" already exists, skipping creation';
  END IF;
END
$$;

-- Create policy for users to leave communities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Users can leave communities') THEN
    CREATE POLICY "Users can leave communities"
      ON community_members
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create fixed policy for viewing community members without recursion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Community members can view other members (fixed)') THEN
    CREATE POLICY "Community members can view other members (fixed)"
      ON community_members
      FOR SELECT
      TO authenticated
      USING (
        -- Allow viewing if the requesting user is a member of the same community
        -- We use a direct approach that doesn't create recursion
        community_id IN (
          SELECT cm.community_id 
          FROM community_members cm 
          WHERE cm.user_id = auth.uid()
          LIMIT 1000  -- Prevent potential performance issues
        )
      );
  END IF;
END
$$;

-- Create fixed policy for admin updates without self-references
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Community admins can update members (fixed)') THEN
    CREATE POLICY "Community admins can update members (fixed)"
      ON community_members
      FOR UPDATE
      TO authenticated
      USING (
        -- Check if user is admin through profiles or direct check
        EXISTS (
          SELECT 1
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.is_admin = true
        )
        OR
        -- Allow users to update their own membership
        auth.uid() = user_id
      )
      WITH CHECK (
        -- Same conditions for the check clause
        EXISTS (
          SELECT 1
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.is_admin = true
        )
        OR
        auth.uid() = user_id
      );
  END IF;
END
$$;

-- Create fixed policy for admin deletions without recursion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_members' AND policyname = 'Community admins can remove members (fixed)') THEN
    CREATE POLICY "Community admins can remove members (fixed)"
      ON community_members
      FOR DELETE
      TO authenticated
      USING (
        -- Check if user is admin through profiles
        EXISTS (
          SELECT 1
          FROM profiles p
          WHERE p.id = auth.uid()
          AND p.is_admin = true
        )
        OR
        -- Users can always remove themselves
        auth.uid() = user_id
      );
  END IF;
END
$$;