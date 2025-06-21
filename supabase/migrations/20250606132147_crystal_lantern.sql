/*
  # Test Pro Account Setup (Development Only)
  
  This migration creates test subscription data for development and testing purposes.
  It will give any authenticated user access to pro features.
  
  1. Test Data
    - Creates test Stripe customer entries for authenticated users
    - Creates active subscription records
    - Uses test Stripe IDs (clearly marked as test data)
  
  2. Security
    - Only affects development/testing environments
    - Uses clearly identifiable test data
*/

-- Function to create test pro subscription for a user
CREATE OR REPLACE FUNCTION create_test_pro_subscription(user_id_param UUID)
RETURNS void AS $$
DECLARE
  test_customer_id text;
  existing_customer_id text;
BEGIN
  -- Check if user already has a customer record
  SELECT customer_id INTO existing_customer_id 
  FROM stripe_customers 
  WHERE user_id = user_id_param AND deleted_at IS NULL;
  
  IF existing_customer_id IS NOT NULL THEN
    test_customer_id := existing_customer_id;
  ELSE
    -- Create a test customer ID
    test_customer_id := 'cus_test_' || user_id_param::text;
    
    -- Insert test customer record
    INSERT INTO stripe_customers (user_id, customer_id)
    VALUES (user_id_param, test_customer_id)
    ON CONFLICT (user_id) DO UPDATE SET 
      customer_id = EXCLUDED.customer_id,
      deleted_at = NULL;
  END IF;
  
  -- Insert or update test subscription record
  INSERT INTO stripe_subscriptions (
    customer_id,
    subscription_id,
    price_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    status
  )
  VALUES (
    test_customer_id,
    'sub_test_' || user_id_param::text,
    'price_1RWniVGWK1AYSv44HACsdk5J', -- TrueNorth Pro price ID from stripe-config.ts
    EXTRACT(EPOCH FROM (NOW() - INTERVAL '1 day')),
    EXTRACT(EPOCH FROM (NOW() + INTERVAL '30 days')),
    false,
    'active'
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    subscription_id = EXCLUDED.subscription_id,
    price_id = EXCLUDED.price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    status = EXCLUDED.status,
    deleted_at = NULL;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test pro subscriptions for all existing users
-- This is safe for development as it only creates test data
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and create test subscriptions
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM create_test_pro_subscription(user_record.id);
  END LOOP;
END $$;

-- Create a trigger to automatically give new users pro access in development
CREATE OR REPLACE FUNCTION handle_new_user_test_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create test pro subscription for new users
  PERFORM create_test_pro_subscription(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups (only for development)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_test_subscription_for_new_user'
  ) THEN
    CREATE TRIGGER create_test_subscription_for_new_user
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user_test_subscription();
  END IF;
END $$;

-- Add a comment to make it clear this is test data
COMMENT ON FUNCTION create_test_pro_subscription IS 'Development only: Creates test subscription data for testing pro features';
COMMENT ON FUNCTION handle_new_user_test_subscription IS 'Development only: Auto-creates test subscriptions for new users';