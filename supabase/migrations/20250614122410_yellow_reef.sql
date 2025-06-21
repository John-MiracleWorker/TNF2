/*
  # Fix Community RLS Infinite Recursion

  1. New Functions
    - `get_community_member_counts` - Get member counts for communities (SECURITY DEFINER)
    - `get_my_community_ids` - Get community IDs where user is a member (SECURITY DEFINER)
    - `check_community_membership` - Check if user is member of community (SECURITY DEFINER)
    - `check_community_admin` - Check if user is admin of community (SECURITY DEFINER)

  2. Policy Updates
    - Replace recursive policies with calls to SECURITY DEFINER functions
    - Ensure no circular dependencies in RLS evaluation

  3. Changes
    - All RLS policies now use helper functions to avoid recursion
    - Functions run with elevated privileges to bypass RLS on internal queries
*/

-- Drop existing RPC functions if they exist
DROP FUNCTION IF EXISTS get_community_member_counts(uuid[]);
DROP FUNCTION IF EXISTS get_my_community_ids(uuid);
DROP FUNCTION IF EXISTS check_community_membership(uuid, uuid);
DROP FUNCTION IF EXISTS check_community_admin(uuid, uuid);

-- Function to get member counts for communities (bypasses RLS)
CREATE OR REPLACE FUNCTION get_community_member_counts(community_ids uuid[])
RETURNS TABLE(community_id uuid, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.community_id, COUNT(cm.id)::bigint
  FROM community_members cm
  WHERE cm.community_id = ANY(community_ids)
  GROUP BY cm.community_id;
$$;

-- Function to get community IDs where user is a member (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_community_ids(p_user_id uuid)
RETURNS TABLE(community_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.community_id
  FROM community_members cm
  WHERE cm.user_id = p_user_id;
$$;

-- Function to check if user is member of community (bypasses RLS)
CREATE OR REPLACE FUNCTION check_community_membership(p_user_id uuid, p_community_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM community_members cm 
    WHERE cm.user_id = p_user_id 
    AND cm.community_id = p_community_id
  );
$$;

-- Function to check if user is admin of community (bypasses RLS)
CREATE OR REPLACE FUNCTION check_community_admin(p_user_id uuid, p_community_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM community_members cm 
    WHERE cm.user_id = p_user_id 
    AND cm.community_id = p_community_id 
    AND cm.role = 'admin'
  );
$$;

-- Drop and recreate RLS policies for community_members to avoid recursion
DROP POLICY IF EXISTS "Community admins can manage members" ON community_members;
DROP POLICY IF EXISTS "Global admins can manage all members" ON community_members;
DROP POLICY IF EXISTS "Global admins can view all members" ON community_members;
DROP POLICY IF EXISTS "Members can view other members in same community" ON community_members;
DROP POLICY IF EXISTS "Users can join new communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON community_members;

-- Recreate policies using SECURITY DEFINER functions to avoid recursion
CREATE POLICY "Users can view own memberships"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join new communities"
  ON community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave communities"
  ON community_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Community admins can manage members"
  ON community_members
  FOR ALL
  TO authenticated
  USING (check_community_admin(auth.uid(), community_id))
  WITH CHECK (check_community_admin(auth.uid(), community_id));

CREATE POLICY "Global admins can manage all members"
  ON community_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS(
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 
      FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  );

CREATE POLICY "Members can view other members in same community"
  ON community_members
  FOR SELECT
  TO authenticated
  USING (check_community_membership(auth.uid(), community_id));

-- Update faith_communities policies to avoid potential recursion
DROP POLICY IF EXISTS "Private communities viewable by members" ON faith_communities;

CREATE POLICY "Private communities viewable by members"
  ON faith_communities
  FOR SELECT
  TO authenticated
  USING (
    is_private AND check_community_membership(auth.uid(), id)
  );

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION get_community_member_counts(uuid[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_my_community_ids(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_community_membership(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_community_admin(uuid, uuid) TO authenticated, anon;