/*
  # Faith Communities Feature

  1. New Tables
    - `faith_communities` - For small groups and communities
    - `community_members` - For tracking membership in communities
    - `community_prayer_circles` - For prayer sharing groups
    - `community_reading_plans` - For synchronized reading plans
    - `community_challenges` - For group spiritual challenges
  
  2. Security
    - Enable RLS on all tables
    - Create appropriate policies for community access
    - Ensure private data remains secure
*/

-- Faith Communities Table
CREATE TABLE IF NOT EXISTS faith_communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_private boolean DEFAULT false,
  join_code text, -- Code for joining private communities
  member_limit integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on faith_communities
ALTER TABLE faith_communities ENABLE ROW LEVEL SECURITY;

-- Community Members Table
CREATE TABLE IF NOT EXISTS community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (community_id, user_id)
);

-- Enable RLS on community_members
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Prayer Circles Table
CREATE TABLE IF NOT EXISTS community_prayer_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_private boolean DEFAULT false, -- Whether only circle members can see
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on community_prayer_circles
ALTER TABLE community_prayer_circles ENABLE ROW LEVEL SECURITY;

-- Prayer Circle Members Table
CREATE TABLE IF NOT EXISTS prayer_circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES community_prayer_circles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('leader', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- Enable RLS on prayer_circle_members
ALTER TABLE prayer_circle_members ENABLE ROW LEVEL SECURITY;

-- Community Reading Plans Table
CREATE TABLE IF NOT EXISTS community_reading_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  reading_plan_id uuid REFERENCES bible_reading_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (community_id, reading_plan_id)
);

-- Enable RLS on community_reading_plans
ALTER TABLE community_reading_plans ENABLE ROW LEVEL SECURITY;

-- Community Challenges Table
CREATE TABLE IF NOT EXISTS community_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  challenge_type text CHECK (challenge_type IN ('prayer', 'scripture', 'devotional', 'custom')),
  target_value integer,
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on community_challenges
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;

-- Challenge Participants Table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES community_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_progress integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE (challenge_id, user_id)
);

-- Enable RLS on challenge_participants
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Community Prayer Requests Table
CREATE TABLE IF NOT EXISTS community_prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  circle_id uuid REFERENCES community_prayer_circles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_anonymous boolean DEFAULT false,
  is_answered boolean DEFAULT false,
  answered_date timestamptz,
  answered_notes text,
  prayer_count integer DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on community_prayer_requests
ALTER TABLE community_prayer_requests ENABLE ROW LEVEL SECURITY;

-- Community Prayer Interactions Table
CREATE TABLE IF NOT EXISTS community_prayer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid REFERENCES community_prayer_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prayed_at timestamptz DEFAULT now(),
  UNIQUE (prayer_id, user_id)
);

-- Enable RLS on community_prayer_interactions
ALTER TABLE community_prayer_interactions ENABLE ROW LEVEL SECURITY;

-- Community Messages Table
CREATE TABLE IF NOT EXISTS community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on community_messages
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Community Announcements Table
CREATE TABLE IF NOT EXISTS community_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES faith_communities(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on community_announcements
ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;

--
-- ROW LEVEL SECURITY POLICIES
--

-- Faith Communities Policies
CREATE POLICY "Public communities are visible to everyone"
  ON faith_communities
  FOR SELECT
  USING (NOT is_private);

CREATE POLICY "Members can view private communities they belong to"
  ON faith_communities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = faith_communities.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create communities"
  ON faith_communities
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Community admins can update their communities"
  ON faith_communities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = faith_communities.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Community admins can delete their communities"
  ON faith_communities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = faith_communities.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Community Members Policies
CREATE POLICY "Members can view community member lists for their communities"
  ON community_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members AS cm
      WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join communities"
  ON community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage community members"
  ON community_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_members.community_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can leave communities (delete their membership)"
  ON community_members
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can remove members"
  ON community_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_members.community_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Prayer Circles Policies
CREATE POLICY "Community members can view prayer circles"
  ON community_prayer_circles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_prayer_circles.community_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can create prayer circles"
  ON community_prayer_circles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_prayer_circles.community_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Circle creators and community admins can update circles"
  ON community_prayer_circles
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_prayer_circles.community_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Circle creators and community admins can delete circles"
  ON community_prayer_circles
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_prayer_circles.community_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create similar policies for the remaining tables...

-- Add a trigger to automatically add the creator as an admin member when creating a community
CREATE OR REPLACE FUNCTION add_community_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_creator_as_admin
  AFTER INSERT ON faith_communities
  FOR EACH ROW
  EXECUTE FUNCTION add_community_creator_as_admin();

-- Add a trigger to automatically increment prayer_count when a prayer interaction is created
CREATE OR REPLACE FUNCTION increment_community_prayer_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_prayer_requests
  SET prayer_count = prayer_count + 1
  WHERE id = NEW.prayer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_community_prayer_count_trigger
  AFTER INSERT ON community_prayer_interactions
  FOR EACH ROW
  EXECUTE FUNCTION increment_community_prayer_count();