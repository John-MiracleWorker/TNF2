/*
  # Add foreign key relationship between community_members and profiles
  
  1. Changes
    - Adds foreign key constraint from community_members.user_id to profiles.id
    - This enables direct joins between community_members and profiles tables
    - Maintains CASCADE deletion behavior for data consistency
*/

-- Add foreign key constraint using PL/pgSQL to check existence first
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_community_members_profile'
  ) THEN
    -- Add the foreign key constraint if it doesn't exist
    ALTER TABLE public.community_members
    ADD CONSTRAINT fk_community_members_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;