/*
  # Fix Faith Communities RLS Policies

  1. Security Updates
    - Drop conflicting RLS policies on faith_communities table
    - Create a single, clear INSERT policy for authenticated users
    - Ensure users can only create communities with themselves as the creator
    - Keep existing SELECT, UPDATE, DELETE policies intact

  2. Changes
    - Simplify INSERT policies to prevent conflicts
    - Ensure proper user ID validation
*/

-- Drop existing conflicting INSERT policies
DROP POLICY IF EXISTS "Allow community creation for authenticated users" ON faith_communities;
DROP POLICY IF EXISTS "Users can create communities" ON faith_communities;

-- Create a single, clear INSERT policy for authenticated users
CREATE POLICY "Users can create communities" 
  ON faith_communities 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

-- Ensure the trigger function exists and works correctly
CREATE OR REPLACE FUNCTION add_community_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as an admin member of the community
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS community_creator_as_admin ON faith_communities;
CREATE TRIGGER community_creator_as_admin
  AFTER INSERT ON faith_communities
  FOR EACH ROW
  EXECUTE FUNCTION add_community_creator_as_admin();