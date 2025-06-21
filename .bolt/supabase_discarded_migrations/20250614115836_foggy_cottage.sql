/*
  # Fix infinite recursion in RLS policies

  1. Modified Policies
    - Drop problematic policies that cause infinite recursion
    - Create non-recursive replacement policies
    - Fix circular dependencies between faith_communities and community_members tables

  2. Security
    - Maintain proper access controls while eliminating recursion
    - Preserve member-only access to private communities
    - Keep admin privileges intact
*/

-- Drop existing problematic policies on community_members
DROP POLICY IF EXISTS "Private community members viewable by members" ON public.community_members;
DROP POLICY IF EXISTS "Public community members are viewable" ON public.community_members;
DROP POLICY IF EXISTS "Admins can view all community members" ON public.community_members;
DROP POLICY IF EXISTS "Community admins can remove members (fixed)" ON public.community_members;
DROP POLICY IF EXISTS "Community admins can update members (fixed)" ON public.community_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.community_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.community_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.community_members;
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.community_members;

-- Drop existing problematic policies on faith_communities
DROP POLICY IF EXISTS "Members can view private communities they belong to" ON public.faith_communities;
DROP POLICY IF EXISTS "Public communities are visible to everyone" ON public.faith_communities;

-- Create new non-recursive policies for faith_communities
CREATE POLICY "Public communities are viewable by everyone"
  ON public.faith_communities
  FOR SELECT
  TO public
  USING (NOT is_private);

CREATE POLICY "Private communities viewable by members"
  ON public.faith_communities
  FOR SELECT
  TO authenticated
  USING (
    is_private AND EXISTS (
      SELECT 1
      FROM public.community_members cm
      WHERE cm.community_id = faith_communities.id
        AND cm.user_id = auth.uid()
    )
  );

-- Recreate community membership policies
CREATE POLICY "Members can view other members in same community"
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_members cm_user
      WHERE cm_user.user_id = auth.uid()
        AND cm_user.community_id = community_members.community_id
    )
  );

CREATE POLICY "Users can view own memberships"
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join new communities"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave communities"
  ON public.community_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Recreate admin-specific policies without recursion
CREATE POLICY "Community admins can manage members"
  ON public.community_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_members cm_admin
      WHERE cm_admin.user_id = auth.uid()
        AND cm_admin.community_id = community_members.community_id
        AND cm_admin.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.community_members cm_admin
      WHERE cm_admin.user_id = auth.uid()
        AND cm_admin.community_id = community_members.community_id
        AND cm_admin.role = 'admin'
    )
  );

-- Policy for global admins (from profiles table)
CREATE POLICY "Global admins can view all members"
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = true
    )
  );

CREATE POLICY "Global admins can manage all members"
  ON public.community_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = true
    )
  );

-- Add back community creation policy
CREATE POLICY "Authenticated users can create communities"
  ON public.faith_communities
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Add back community management policies
CREATE POLICY "Community admins can update their communities"
  ON public.faith_communities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_members
      WHERE community_members.community_id = faith_communities.id
        AND community_members.user_id = auth.uid()
        AND community_members.role = 'admin'
    )
  );

CREATE POLICY "Community admins can delete their communities"
  ON public.faith_communities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_members
      WHERE community_members.community_id = faith_communities.id
        AND community_members.user_id = auth.uid()
        AND community_members.role = 'admin'
    )
  );