/*
  # Fix Faith Communities RLS Policy

  This migration fixes the Row-Level Security policy for the faith_communities table
  to ensure authenticated users can create new communities.

  ## Changes
  1. Drop and recreate the INSERT policy for faith_communities
  2. Ensure the policy correctly allows authenticated users to create communities
  3. Add a backup policy for user profile creation if needed

  ## Security
  - Users can only create communities where they are the creator
  - All other existing policies remain unchanged
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create communities" ON faith_communities;

-- Recreate the INSERT policy with explicit user check
CREATE POLICY "Authenticated users can create communities" 
ON faith_communities 
FOR INSERT 
TO authenticated 
WITH CHECK (created_by = auth.uid());

-- Ensure RLS is enabled on the table
ALTER TABLE faith_communities ENABLE ROW LEVEL SECURITY;

-- Also ensure there's a policy that allows users to create their own profiles if needed
-- (this might be needed since community creation might depend on profile existence)
DO $$
BEGIN
  -- Check if the profiles table exists and add INSERT policy if needed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Drop and recreate the profile INSERT policy to ensure consistency
    DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
    
    CREATE POLICY "Users can insert their own profile." 
    ON profiles 
    FOR INSERT 
    TO public 
    WITH CHECK (id = auth.uid());
  END IF;
END $$;