/*
  # Push Notifications Subscription Storage
  
  1. New Table
    - `push_subscriptions` - Store web push notification tokens
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `endpoint` (text) - Push subscription endpoint URL
      - `subscription_json` (jsonb) - Complete subscription data
      - `created_at`, `updated_at` (timestamptz)
      - Unique constraint on (user_id, endpoint)
  
  2. Indexes
    - Index on user_id for faster lookups
    - Index on endpoint for deduplication
  
  3. Security
    - RLS policies for CRUD operations
*/

-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_user_id_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions 
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key 
    UNIQUE(user_id, endpoint);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies conditionally
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can view their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own push subscriptions"
      ON push_subscriptions
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can insert their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can insert their own push subscriptions"
      ON push_subscriptions
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can update their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can update their own push subscriptions"
      ON push_subscriptions
      FOR UPDATE
      TO public
      USING (auth.uid() = user_id);
  END IF;

  -- DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'push_subscriptions' 
    AND policyname = 'Users can delete their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can delete their own push subscriptions"
      ON push_subscriptions
      FOR DELETE
      TO public
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);