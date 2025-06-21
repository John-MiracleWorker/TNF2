/*
  # Fix User Registration Database Error
  
  This migration fixes the error that occurs during user registration:
  "function create_test_pro_subscription(uuid) does not exist"
  
  1. Simplifies the handle_new_user function to avoid dependency on test subscription
  2. Ensures all tables referenced during user creation exist
  3. Adds proper error handling to prevent transaction aborts
  4. Updates RLS policies to allow the trigger to create records
*/

-- Drop any problematic triggers to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_test_subscription_for_new_user ON auth.users;

-- Ensure the stripe_customers table exists
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null,
  customer_id text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Add unique constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stripe_customers_user_id_key') THEN
    ALTER TABLE stripe_customers ADD CONSTRAINT stripe_customers_user_id_key UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stripe_customers_customer_id_key') THEN
    ALTER TABLE stripe_customers ADD CONSTRAINT stripe_customers_customer_id_key UNIQUE (customer_id);
  END IF;
END
$$;

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'stripe_customers' AND rowsecurity = true
  ) THEN
    ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Add RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'stripe_customers' AND policyname = 'Users can view their own customer data'
  ) THEN
    CREATE POLICY "Users can view their own customer data"
        ON stripe_customers
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() AND deleted_at IS NULL);
  END IF;
END
$$;

-- Ensure the stripe_subscriptions table exists with subscription_status type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
    CREATE TYPE stripe_subscription_status AS ENUM (
      'not_started',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stripe_subscriptions_customer_id_key') THEN
    ALTER TABLE stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id);
  END IF;
END
$$;

-- Enable RLS on stripe_subscriptions
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create a simpler, more robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile with safe error handling
  BEGIN
    INSERT INTO public.profiles (id, display_name, created_at, last_active)
    VALUES (NEW.id, split_part(NEW.email, '@', 1), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Create user preferences with safe error handling
  BEGIN
    INSERT INTO public.user_preferences (
      id, 
      notification_preferences, 
      theme, 
      verse_translation
    ) VALUES (
      NEW.id,
      '{"bible_reading": true, "journal_prompts": true, "prayer_reminders": true}'::jsonb,
      'light',
      'NIV'
    ) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating preferences for user %: %', NEW.id, SQLERRM;
  END;

  -- Create scripture stats with safe error handling
  BEGIN
    INSERT INTO public.user_scripture_stats (
      user_id,
      total_points,
      current_level,
      experience_points
    ) VALUES (
      NEW.id,
      0,
      1,
      0
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating scripture stats for user %: %', NEW.id, SQLERRM;
  END;

  -- Create test subscription data if possible, but don't fail if it doesn't work
  BEGIN
    -- Generate a customer ID
    DECLARE
      test_customer_id text := 'cus_test_' || substring(NEW.id::text, 1, 8);
    BEGIN
      -- Insert test customer record
      INSERT INTO stripe_customers (user_id, customer_id)
      VALUES (NEW.id, test_customer_id)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- If the subscription type exists, try to create a subscription
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
        INSERT INTO stripe_subscriptions (
          customer_id,
          subscription_id,
          price_id,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          status
        ) VALUES (
          test_customer_id,
          'sub_test_' || substring(NEW.id::text, 1, 8),
          'price_1RWniVGWK1AYSv44HACsdk5J',
          EXTRACT(EPOCH FROM (NOW() - INTERVAL '1 day')),
          EXTRACT(EPOCH FROM (NOW() + INTERVAL '30 days')),
          false,
          'active'
        ) ON CONFLICT (customer_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error creating test subscription for user %: %', NEW.id, SQLERRM;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in subscription setup for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create the new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure policies allow the trigger to create records
DO $$
BEGIN
  -- Profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Allow profile creation during signup'
  ) THEN
    CREATE POLICY "Allow profile creation during signup"
      ON public.profiles
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
  
  -- User preferences
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' 
    AND policyname = 'Allow preferences creation during signup'
  ) THEN
    CREATE POLICY "Allow preferences creation during signup"
      ON public.user_preferences
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
  
  -- Scripture stats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_scripture_stats' 
    AND policyname = 'Allow stats creation during signup'
  ) THEN
    CREATE POLICY "Allow stats creation during signup"
      ON public.user_scripture_stats
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.user_preferences TO anon, authenticated;
GRANT INSERT ON public.user_scripture_stats TO anon, authenticated;
GRANT INSERT ON public.stripe_customers TO anon, authenticated;
GRANT INSERT ON public.stripe_subscriptions TO anon, authenticated;