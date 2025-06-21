/*
  # Create push_subscriptions Table

  1. New Table
    - `push_subscriptions`: Stores push notification subscription data
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `endpoint` (text) - Push subscription endpoint URL
      - `subscription_json` (jsonb) - Full subscription data including keys
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Ensures table exists for storing push notification subscriptions
    - Creates unique constraint on user_id + endpoint
    - Creates indexes for faster lookups
    
  3. Security
    - Enables Row Level Security
    - Adds appropriate policies
*/

-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  subscription_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);