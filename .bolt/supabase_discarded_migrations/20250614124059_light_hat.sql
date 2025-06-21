/*
  # Add Foreign Key Relationship for Community Members and Profiles

  1. Schema Update
    - Add foreign key constraint between `community_members.user_id` and `profiles.id`
    - This enables direct joins between community members and their profile data
  
  2. Security
    - No RLS changes needed as existing policies remain in effect
    - Maintains data integrity with CASCADE delete behavior

  3. Changes
    - Establishes direct relationship for Supabase PostgREST joins
    - Allows `community_members` queries to directly select from `profiles`
*/

-- Add foreign key constraint from community_members.user_id to profiles.id
-- This is safe because profiles.id = users.id (enforced by existing FK)
-- and community_members.user_id references users.id
ALTER TABLE IF EXISTS public.community_members
ADD CONSTRAINT IF NOT EXISTS fk_community_members_profile
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;