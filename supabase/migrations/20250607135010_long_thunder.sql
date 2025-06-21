-- Fix user creation and subscription handling

-- First, create or replace the test subscription function
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
    test_customer_id := 'cus_test_' || substring(user_id_param::text, 1, 8);
    
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
    'sub_test_' || substring(user_id_param::text, 1, 8),
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
  
EXCEPTION
  WHEN others THEN
    -- Catch any errors but don't block user creation
    RAISE NOTICE 'Error creating test subscription for %: %', user_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle new user creation
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

  -- Ensure test subscription is created (for development)
  PERFORM create_test_pro_subscription(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the trigger exists and create it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Also create the missing tables if they don't exist
DO $$
BEGIN
  -- First check if the required tables exist, create them if not
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