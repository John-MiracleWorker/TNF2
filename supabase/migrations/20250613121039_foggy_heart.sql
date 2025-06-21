/*
  # Add Admin User Support

  1. New Columns
    - `is_admin` (boolean) - Flag to mark users with administrative privileges
    
  2. Security
    - No special security for this column as it's controlled by RLS policies
*/

-- Add is_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create an index to efficiently query for admin users
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON profiles(is_admin);

-- Add a comment explaining the column's purpose
COMMENT ON COLUMN profiles.is_admin IS 'Indicates whether the user has administrative privileges';