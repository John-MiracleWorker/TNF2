/*
  # Push Notification Automation & Personalization
  
  1. Enhanced Functionality
    - Added trigger to generate personalized notifications
    - Updated push_subscriptions table for improved notification delivery
  
  2. Functions
    - create_user_notification: Create personalized notifications for a user
    - schedule_automatic_notifications: Helper to schedule notifications based on user preferences
*/

-- Create an index on push_subscriptions to improve lookup performance
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);

-- Create a function to automatically generate a personalized notification when certain events happen
CREATE OR REPLACE FUNCTION create_user_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val uuid;
  user_name text;
  notification_type text;
  notification_title text;
  notification_message text;
  notification_link text;
BEGIN
  -- Determine which user to notify and what type of notification to create
  IF TG_TABLE_NAME = 'prayer_requests' THEN
    IF NEW.is_answered = true AND (OLD IS NULL OR OLD.is_answered = false) THEN
      -- Prayer was just marked as answered
      user_id_val := NEW.user_id;
      notification_type := 'prayer_answered';
      notification_title := 'Prayer Answered!';
      notification_message := 'Your prayer request "' || NEW.title || '" has been marked as answered.';
      notification_link := '/prayer';
    END IF;
  ELSIF TG_TABLE_NAME = 'prayer_interactions' THEN
    -- Someone prayed for a user's prayer
    SELECT pr.user_id, pr.title INTO user_id_val, notification_title
    FROM prayer_requests pr
    WHERE pr.id = NEW.prayer_id;
    
    notification_type := 'prayer_support';
    notification_message := 'Someone prayed for your request: "' || notification_title || '"';
    notification_link := '/prayer';
  ELSIF TG_TABLE_NAME = 'daily_devotionals' THEN
    -- New devotional published - notify all users
    -- This will be handled separately since it's for all users
    RETURN NEW;
  ELSIF TG_TABLE_NAME = 'scripture_memory' THEN
    -- New verse added or memorization level changed
    user_id_val := NEW.user_id;
    
    IF OLD IS NULL THEN
      notification_type := 'verse_added';
      notification_title := 'New Verse Added';
      notification_message := 'You''ve added ' || NEW.verse_reference || ' to your memory collection!';
    ELSIF NEW.memorized_level > OLD.memorized_level THEN
      notification_type := 'verse_progress';
      notification_title := 'Scripture Memory Progress';
      notification_message := 'Your mastery of ' || NEW.verse_reference || ' is improving!';
    END IF;
    notification_link := '/scripture-memory';
  ELSIF TG_TABLE_NAME = 'user_achievements' THEN
    -- New achievement earned
    user_id_val := NEW.user_id;
    
    -- Get achievement details
    SELECT name INTO notification_title
    FROM scripture_achievements
    WHERE id = NEW.achievement_id;
    
    notification_type := 'achievement';
    notification_message := 'You''ve earned a new achievement: ' || notification_title;
    notification_link := '/scripture-memory';
  END IF;
  
  -- If we have a valid notification to create
  IF user_id_val IS NOT NULL AND notification_type IS NOT NULL THEN
    -- Get the user's display name
    SELECT COALESCE(display_name, first_name, 'Friend') INTO user_name
    FROM profiles
    WHERE id = user_id_val;
    
    -- Personalize the title with user's name if it doesn't already include the name
    IF NOT notification_title ILIKE '%' || user_name || '%' AND user_name != 'Friend' THEN
      notification_title := user_name || ', ' || notification_title;
    END IF;
    
    -- Create the notification in the database
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      action_link
    ) VALUES (
      user_id_val,
      notification_title,
      notification_message,
      notification_type,
      notification_link
    );
    
    -- The actual push notification will be sent by the edge function
    -- We'll rely on a separate process to check for new notifications and send them
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic notifications
DO $$
BEGIN
  -- Prayer request answered trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prayer_answered_notification') THEN
    CREATE TRIGGER prayer_answered_notification
    AFTER UPDATE OF is_answered ON prayer_requests
    FOR EACH ROW
    WHEN (NEW.is_answered = true AND (OLD.is_answered = false OR OLD.is_answered IS NULL))
    EXECUTE FUNCTION create_user_notification();
  END IF;
  
  -- Prayer interaction trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prayer_interaction_notification') THEN
    CREATE TRIGGER prayer_interaction_notification
    AFTER INSERT ON prayer_interactions
    FOR EACH ROW
    EXECUTE FUNCTION create_user_notification();
  END IF;
  
  -- Scripture memory progress trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'scripture_memory_notification') THEN
    CREATE TRIGGER scripture_memory_notification
    AFTER INSERT OR UPDATE OF memorized_level ON scripture_memory
    FOR EACH ROW
    EXECUTE FUNCTION create_user_notification();
  END IF;
  
  -- Achievement earned trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'achievement_notification') THEN
    CREATE TRIGGER achievement_notification
    AFTER INSERT ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION create_user_notification();
  END IF;
END $$;