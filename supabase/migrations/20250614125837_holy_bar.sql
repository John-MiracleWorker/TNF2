/*
  # Remove Test Community
  
  1. Changes
     - Identifies and deletes the "test" community
     - Removes associated records from community_members table
*/

-- First identify the test community
DO $$
DECLARE
  test_community_id uuid;
  test_community_name text;
BEGIN
  -- Find the community with "test" in the name (case insensitive)
  SELECT id, name INTO test_community_id, test_community_name
  FROM public.faith_communities 
  WHERE name ILIKE '%test%'
  LIMIT 1;
  
  -- If found, display a message and delete it
  IF test_community_id IS NOT NULL THEN
    RAISE NOTICE 'Found test community to delete: "%" with ID %', test_community_name, test_community_id;
    
    -- First delete related records in community_members
    DELETE FROM public.community_members
    WHERE community_id = test_community_id;
    
    -- Then delete the community itself
    DELETE FROM public.faith_communities
    WHERE id = test_community_id;
    
    RAISE NOTICE 'Successfully deleted test community and its members';
  ELSE
    RAISE NOTICE 'No test community found to delete';
  END IF;
END
$$;