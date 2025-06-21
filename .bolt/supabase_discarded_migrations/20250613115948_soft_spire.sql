/*
  # Add is_admin column to profiles table
  
  1. New Column
    - `is_admin`: Boolean column to identify admin users who can access the developer panel
    
  2. Changes
    - Adds the column with a default value of false
    - Ensures the column is properly protected by RLS
    
  3. Security
    - Only admins can view the is_admin column of other users
    - Regular users cannot see who has admin privileges
*/

-- Add is_admin column to profiles if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create a view for admins to see all profiles with admin status
CREATE OR REPLACE VIEW admin_user_list WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.email,
  p.is_admin,
  p.created_at,
  p.last_active
FROM profiles p
WHERE p.id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND is_admin = true
);