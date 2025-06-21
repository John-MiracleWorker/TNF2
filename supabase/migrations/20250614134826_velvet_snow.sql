/*
  # Add foreign key relationship for community prayer requests to profiles

  1. Changes
    - Add foreign key constraint between community_prayer_requests.user_id and profiles.id
    - This enables joining prayer requests with user profiles for display

  2. Security
    - No RLS changes needed as existing policies remain intact
*/

-- Add foreign key constraint to allow joining community_prayer_requests with profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_community_prayer_requests_profile'
    AND table_name = 'community_prayer_requests'
  ) THEN
    ALTER TABLE community_prayer_requests
    ADD CONSTRAINT fk_community_prayer_requests_profile
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;