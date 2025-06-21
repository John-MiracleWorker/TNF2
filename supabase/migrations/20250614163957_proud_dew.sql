/*
  # Add Whisper usage logs table
  
  1. New Tables
    - `whisper_usage_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `duration_seconds` (integer)
      - `model` (text)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on the new table
    - Add policy for users to view their own logs
*/

-- Create table for Whisper usage logs
CREATE TABLE IF NOT EXISTS whisper_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE whisper_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own logs
CREATE POLICY "Users can view their own Whisper usage logs" 
  ON whisper_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);