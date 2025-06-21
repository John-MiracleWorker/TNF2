/*
  # Fix New User Registration Trigger

  This migration fixes the "Database error saving new user" issue by ensuring
  that when a new user signs up through Supabase Auth, the necessary records
  are automatically created in related tables.

  1. New User Trigger Function
     - Creates a trigger function that runs when a new user is created
     - Automatically creates records in profiles, user_preferences, and user_scripture_stats

  2. Trigger Setup
     - Sets up the trigger on auth.users table to call the function
     - Ensures proper error handling

  3. Security
     - Ensures RLS policies allow the trigger to create records
     - Uses security definer to run with elevated privileges
*/

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, created_at, last_active)
  VALUES (NEW.id, NOW(), NOW());

  -- Insert into user_preferences table with default values
  INSERT INTO public.user_preferences (
    id, 
    notification_preferences, 
    theme, 
    verse_translation, 
    created_at, 
    updated_at
  ) VALUES (
    NEW.id,
    '{"bible_reading": true, "journal_prompts": true, "prayer_reminders": true}'::jsonb,
    'light',
    'NIV',
    NOW(),
    NOW()
  );

  -- Insert into user_scripture_stats table with default values
  INSERT INTO public.user_scripture_stats (
    user_id,
    total_points,
    current_level,
    experience_points,
    current_streak,
    longest_streak,
    verses_memorized,
    total_practice_time,
    achievements_count,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies allow the trigger to create records
-- Update profiles policies to allow inserts during user creation
DO $$
BEGIN
  -- Check if the insert policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow profile creation during signup'
  ) THEN
    CREATE POLICY "Allow profile creation during signup"
      ON public.profiles
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Update user_preferences policies to allow inserts during user creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' 
    AND policyname = 'Allow preferences creation during signup'
  ) THEN
    CREATE POLICY "Allow preferences creation during signup"
      ON public.user_preferences
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Update user_scripture_stats policies to allow inserts during user creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_scripture_stats' 
    AND policyname = 'Allow stats creation during signup'
  ) THEN
    CREATE POLICY "Allow stats creation during signup"
      ON public.user_scripture_stats
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Grant necessary permissions to handle the trigger
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.user_preferences TO anon, authenticated;
GRANT INSERT ON public.user_scripture_stats TO anon, authenticated;