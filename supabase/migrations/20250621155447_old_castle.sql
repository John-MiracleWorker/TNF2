-- Create table for monitoring YouTube channels
CREATE TABLE IF NOT EXISTS monitored_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'youtube',
  channel_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_processed_at TIMESTAMPTZ,
  last_video_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add unique constraint on channel_id and platform
ALTER TABLE monitored_channels 
  ADD CONSTRAINT monitored_channels_channel_id_platform_key 
  UNIQUE (channel_id, platform);

-- Enable RLS
ALTER TABLE monitored_channels ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Admins can manage monitored channels"
  ON monitored_channels
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );