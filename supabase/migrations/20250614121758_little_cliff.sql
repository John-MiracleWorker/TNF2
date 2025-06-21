/*
  # Fix Community Members Infinite Recursion

  1. New Functions
    - `get_my_community_ids` - Safely get community IDs for a user, bypassing RLS
    - `get_community_member_counts` - Safely get member counts for communities, bypassing RLS

  2. Security
    - Functions use SECURITY DEFINER to bypass problematic RLS policies
    - Grant execution to authenticated users only

  This migration fixes the infinite recursion error in community_members RLS policies
  by providing alternative access paths through RPC functions.
*/

-- Function to get community IDs for a given user, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_my_community_ids(p_user_id uuid) 
RETURNS TABLE(community_id uuid, joined_at timestamptz) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT cm.community_id, cm.joined_at
  FROM public.community_members cm
  WHERE cm.user_id = p_user_id
  ORDER BY cm.joined_at DESC;
END;
$function$;

-- Function to get member counts for communities, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_community_member_counts(community_ids uuid[]) 
RETURNS TABLE(community_id uuid, count bigint) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT cm.community_id, COUNT(*) as count
  FROM public.community_members cm
  WHERE cm.community_id = ANY(community_ids)
  GROUP BY cm.community_id;
END;
$function$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_community_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_member_counts(uuid[]) TO authenticated;