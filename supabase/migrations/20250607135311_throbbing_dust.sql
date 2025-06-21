/*
  # Fix User Creation Trigger and Function
  
  1. Changes
    - Create a simplified user creation trigger that doesn't depend on the test subscription function
    - Remove dependency on create_test_pro_subscription which is causing errors
    - Ensure all required tables are properly initialized for new users
  
  2. Tables Affected
    - profiles
    - user_preferences
    - user_scripture_stats
*/

-- Drop the problematic trigger if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Create a new, simpler function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, display_name, first_name, last_name)
  VALUES (
    NEW.id, 
    split_part(NEW.email, '@', 1), -- Use email username as display name
    NULL,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- Create user preferences
  INSERT INTO public.user_preferences (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- Create scripture stats
  INSERT INTO public.user_scripture_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the new trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Ensure the profiles table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      first_name TEXT,
      last_name TEXT,
      display_name TEXT,
      bio TEXT,
      profile_image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      last_active TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Public profiles are viewable by everyone." 
      ON public.profiles
      FOR SELECT 
      USING (TRUE);

    CREATE POLICY "Users can insert their own profile." 
      ON public.profiles
      FOR INSERT 
      WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can update own profile." 
      ON public.profiles
      FOR UPDATE 
      USING (auth.uid() = id);
  END IF;
END $$;

-- Create a simple function to create test subscriptions (without errors)
-- This is a simplified version that won't cause errors if tables don't exist
CREATE OR REPLACE FUNCTION create_test_pro_subscription(user_id_param UUID)
RETURNS void AS $$
BEGIN
  -- This is a placeholder function that does nothing
  -- It exists just to prevent errors when the function is called
  RAISE NOTICE 'Test subscription function called for user %', user_id_param;
EXCEPTION
  WHEN others THEN
    -- Catch any errors but don't block user creation
    RAISE NOTICE 'Error in test subscription function: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;