/*
  # Fix Journal Entries Privacy and Pro User Status
  
  1. Changes:
    - Drop the overly permissive journal entries policies that allow all users to see all entries
    - Ensure only users who created journal entries can see them
    - Make pro subscription feature configurable rather than applying to all users
  
  2. Security:
    - Strengthen row level security on journal entries
    - Make explicit policies for journal entry access
    - Add an environment flag for enabling test subscriptions
*/

-- 1. Fix journal entries privacy
-- First drop the overly permissive policies
DROP POLICY IF EXISTS "Allow public read access to journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Allow authenticated users to insert journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update their own journal entries" ON journal_entries;

-- 2. Ensure the restrictive policies exist and are correct
DO $$
BEGIN
  -- Check for and create the correct SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'journal_entries' 
    AND policyname = 'Users can view their own journal entries.'
  ) THEN
    CREATE POLICY "Users can view their own journal entries."
      ON journal_entries
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;
  
  -- Check for and create the correct INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'journal_entries' 
    AND policyname = 'Users can insert their own journal entries.'
  ) THEN
    CREATE POLICY "Users can insert their own journal entries."
      ON journal_entries
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  -- Check for and create the correct UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'journal_entries' 
    AND policyname = 'Users can update their own journal entries.'
  ) THEN
    CREATE POLICY "Users can update their own journal entries."
      ON journal_entries
      FOR UPDATE
      TO public
      USING (auth.uid() = user_id);
  END IF;
  
  -- Check for and create the correct DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'journal_entries' 
    AND policyname = 'Users can delete their own journal entries.'
  ) THEN
    CREATE POLICY "Users can delete their own journal entries."
      ON journal_entries
      FOR DELETE
      TO public
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Make test pro subscription creation optional and off by default
-- Create a function to toggle test pro subscriptions for development
CREATE OR REPLACE FUNCTION toggle_test_pro_subscriptions(enabled BOOLEAN)
RETURNS void AS $$
BEGIN
  IF enabled THEN
    -- Enable the trigger for automatic test subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'create_test_subscription_for_new_user'
    ) THEN
      CREATE TRIGGER create_test_subscription_for_new_user
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user_test_subscription();
    END IF;
  ELSE
    -- Disable the trigger for automatic test subscriptions
    DROP TRIGGER IF EXISTS create_test_subscription_for_new_user ON auth.users;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable automatic test pro subscriptions by default
SELECT toggle_test_pro_subscriptions(false);